from decimal import Decimal
from rest_framework import permissions, status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from django.core.cache import cache
from django.conf import settings
from apps.authentication.models import User
import logging
from datetime import timedelta
from rest_framework_simplejwt.authentication import JWTAuthentication
from apps.core.views import BaseAPIView, BaseModelViewSet
from apps.core.utils import (
    standardize_response,
    generate_reference,
    standardize_phone_number,
    validate_kenyan_phone,
    log_user_activity,
    cache_key,
    format_currency,
    sanitize_callback_data,
)
from .models import Payment, SubscriptionPlan, Subscription
from .serializers import (
    PaymentSerializer,
    SubscriptionSerializer,
    RenewalPaymentSerializer,
    SubscriptionStatusSerializer,
    PaymentInitiationSerializer,
)
from .utils import MpesaService, PaymentProcessor

logger = logging.getLogger(__name__)

class SubscriptionViewSet(generics.ListAPIView):
    """
    Viewset for listing subscription plans.
    Provides read-only access to active plans.
    """
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.AllowAny]
    rate_limit_scope = 'subscriptions'
    rate_limit_count = 100
    rate_limit_window = 3600

    def get_queryset(self):
        return SubscriptionPlan.objects.filter(is_active=True)

class SubscriptionStatusView(BaseAPIView):
    permission_classes = [permissions.IsAuthenticated]
    rate_limit_scope = 'subscription_status'
    rate_limit_count = 50
    rate_limit_window = 3600

    @action(detail=False, methods=['get'])
    def active(self, request):
        try:
            all_subscriptions = Subscription.objects.filter(user=request.user)
            for sub in all_subscriptions:
                sub.update_status()
            active_subscription = all_subscriptions.filter(
                active=True,
                end_date__gt=timezone.now()
            ).first()
            if active_subscription:
                subscription_data = SubscriptionSerializer(active_subscription).data
                return standardize_response(
                    success=True,
                    message="Active subscription retrieved successfully",
                    data=subscription_data,
                    status_code=status.HTTP_200_OK
                )
            else:
                return standardize_response(
                    success=False,
                    message="No active subscription found",
                    status_code=status.HTTP_404_NOT_FOUND
                )
        except Exception as e:
            return standardize_response(
                success=False,
                message="Failed to retrieve active subscription",
                errors={'detail': str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ActiveSubscriptionView(SubscriptionStatusView):
    def get(self, request):
        print("Received request for /api/v1/payments/my-subscriptions/active/")
        return self.active(request)
class PaymentViewSet(BaseModelViewSet):
    """
    Manage user payments: list, create, retrieve.
    """
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    rate_limit_scope = 'payments'
    rate_limit_count = 50
    rate_limit_window = 3600

    def get_queryset(self):
        return Payment.objects.filter(user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class PaymentInitiationView(BaseAPIView):
    """
    Initiates an M-Pesa payment for a subscription.
    Requires authentication.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PaymentInitiationSerializer
    rate_limit_scope = 'payment_initiation'
    rate_limit_count = 10
    rate_limit_window = 3600

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if not serializer.is_valid():
            return standardize_response(
                success=False,
                message="Validation failed",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST
            )

        validated = serializer.validated_data
        phone = standardize_phone_number(validated["phone_number"])
        amount = validated["amount"]
        reference = generate_reference("PAY")
        description = validated.get("description", "EduPathway Basic Plan")
        plan_id = validated.get("plan_id", 1)
        user = request.user

        if not validate_kenyan_phone(phone):
            return standardize_response(
                success=False,
                message="Invalid Kenyan phone number",
                status_code=status.HTTP_400_BAD_REQUEST
            )

        if user.phone_number != phone:
            return standardize_response(
                success=False,
                message="Phone number must match user's registered phone number",
                status_code=status.HTTP_400_BAD_REQUEST
            )

        try:
            plan = SubscriptionPlan.objects.get(id=plan_id, is_active=True)
            if amount != plan.price:
                return standardize_response(
                    success=False,
                    message="Amount does not match subscription plan price",
                    status_code=status.HTTP_400_BAD_REQUEST
                )
        except SubscriptionPlan.DoesNotExist:
            return standardize_response(
                success=False,
                message="Invalid plan_id",
                status_code=status.HTTP_400_BAD_REQUEST
            )

        payment = Payment.objects.create(
            user=user,
            phone_number=phone,
            amount=amount,
            reference=reference,
            payment_method="mpesa",
            status="pending",
            description=description,
        )

        subscription = PaymentProcessor.create_subscription(user, plan, payment)
        payment.subscription = subscription
        payment.save()

        mpesa_service = MpesaService()
        try:
            mpesa_response = mpesa_service.send_stk_push(
                phone_number=phone,
                amount=amount,
                account_reference=reference,
                description=description
            )
        except Exception as e:
            PaymentProcessor.mark_payment_failed(payment, str(e))
            log_user_activity(
                user=user,
                action='PAYMENT_INITIATION_FAILED',
                details={'error': str(e), 'phone_number': phone},
                request=request,
            )
            return standardize_response(
                success=False,
                message="M-Pesa STK Push failed",
                errors={'mpesa_error': str(e)},
                status_code=status.HTTP_400_BAD_REQUEST
            )

        if mpesa_response.get("status") == "success":
            payment.checkout_request_id = mpesa_response.get("CheckoutRequestID")
            payment.save()
            log_user_activity(
                user=user,
                action='PAYMENT_INITIATED',
                details={
                    "payment_reference": reference,
                    "amount": str(amount),
                    "phone_number": phone,
                    "subscription_plan_id": plan_id
                },
                request=request,
            )
            return standardize_response(
                success=True,
                message="STK Push initiated. Check your phone to complete the payment.",
                data={
                    "status": "success",
                    "payment_reference": reference,
                    "checkout_request_id": mpesa_response.get("CheckoutRequestID"),
                    "amount": str(amount),
                    "phone_number": phone
                },
                status_code=status.HTTP_200_OK
            )
        else:
            PaymentProcessor.mark_payment_failed(payment, mpesa_response.get("error"))
            return standardize_response(
                success=False,
                message="M-Pesa STK Push failed",
                errors={"mpesa_error": mpesa_response.get("error", "Unknown error")},
                status_code=status.HTTP_400_BAD_REQUEST
            )

class MpesaCallbackView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'mpesa_callback'

    def post(self, request):
        try:
            sanitized_data = sanitize_callback_data(request.data)
            log_user_activity(user=None, action='MPESA_CALLBACK_RECEIVED', details=sanitized_data, request=request)

            callback_data = request.data.get('Body', {}).get('stkCallback', {})
            checkout_request_id = callback_data.get('CheckoutRequestID')
            result_code = callback_data.get('ResultCode')
            result_desc = callback_data.get('ResultDesc', 'No description provided')

            if not checkout_request_id:
                return standardize_response(
                    success=False,
                    message="Invalid callback data: Missing CheckoutRequestID",
                    status_code=400
                )

            try:
                payment = Payment.objects.get(checkout_request_id=checkout_request_id)
            except Payment.DoesNotExist:
                return standardize_response(
                    success=False,
                    message="Payment not found for provided CheckoutRequestID",
                    status_code=404
                )

            if payment.status in ['completed', 'failed']:
                return standardize_response(
                    success=True,
                    message="Callback already processed",
                    status_code=200
                )

            if result_code == 0:
                metadata_items = callback_data.get('CallbackMetadata', {}).get('Item', [])
                metadata = {item.get('Name'): item.get('Value') for item in metadata_items}
                
                payment.phone_number = standardize_phone_number(metadata.get('PhoneNumber'))
                payment.transaction_date = timezone.now()
                payment.callback_metadata = metadata
                PaymentProcessor.mark_payment_completed(payment, metadata.get('MpesaReceiptNumber'))

                subscription = payment.subscription
                if subscription:
                    subscription.active = True
                    subscription.last_payment_at = timezone.now()
                    subscription.save()
                    payment.user.is_premium = True
                    payment.user.save()

                message = "Payment marked as completed"
            else:
                PaymentProcessor.mark_payment_failed(payment, result_desc)
                message = f"Payment failed: {result_desc}"

            log_user_activity(user=payment.user, action='MPESA_CALLBACK_PROCESSED', details={
                'checkout_request_id': checkout_request_id,
                'result_code': result_code,
                'result_desc': result_desc,
                'phone_number': payment.phone_number
            }, request=request)

            return standardize_response(
                success=True,
                message=message,
                data={'payment_id': str(payment.id), 'status': payment.status},
                status_code=200
            )

        except Exception as e:
            log_user_activity(user=None, action='MPESA_CALLBACK_ERROR', details={'error': str(e)}, request=request)
            return standardize_response(
                success=False,
                message="Error processing M-Pesa callback",
                errors={'detail': str(e)},
                status_code=500
            )

class PaymentVerificationView(BaseAPIView):
    """
    Verify payment status by reference.
    """
    permission_classes = [permissions.IsAuthenticated]
    rate_limit_scope = 'payment_verification'
    rate_limit_count = 20
    rate_limit_window = 3600

    def get(self, request, reference):
        try:
            payment = Payment.objects.get(reference=reference, user=request.user)
            serializer = PaymentSerializer(payment)
            return standardize_response(
                success=True,
                message="Payment retrieved successfully",
                data=serializer.data,
                status_code=status.HTTP_200_OK
            )
        except Payment.DoesNotExist:
            return standardize_response(
                success=False,
                message="Payment not found",
                status_code=status.HTTP_404_NOT_FOUND
            )