from decimal import Decimal
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from django.utils import timezone
from django.core.cache import cache
from django.conf import settings
from django.utils.timezone import now
import logging
import base64
import requests
from rest_framework.permissions import IsAuthenticated
from rest_framework import generics
from apps.core.views import BaseAPIView, BaseModelViewSet
from apps.core.utils import (standardize_response,generate_reference,standardize_phone_number,validate_kenyan_phone, log_user_activity,cache_key, format_currency,sanitize_callback_data)
from .models import Payment, Subscription, UserSubscription,SubscriptionPlan
from .serializers import (
    PaymentSerializer, SubscriptionSerializer,RenewalPaymentSerializer,UserSubscriptionSerializer,SubscriptionStatusSerializer, PaymentInitiationSerializer
)
from .utils import MpesaService, PaymentProcessor
logger = logging.getLogger(__name__)

class SubscriptionViewSet(generics.ListAPIView):
    """
    Viewset for managing subscription plans.
    Provides list and retrieve actions only.
    """

    serializer_class = SubscriptionSerializer
    authentication_required = False  # Allow public read-only access
    #permission_classes = [permissions.AllowAny]  # Explicitly allow public read for GET

    rate_limit_scope = 'subscriptions'
    rate_limit_count = 100
    rate_limit_window = 3600  # 1 hour

    def get_queryset(self):
        # Update status for all before filtering active ones
        subscriptions = Subscription.objects.all()
        for subscription in subscriptions:
            subscription.update_status()
        return subscriptions.filter(is_active=True)

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

class SubscriptionStatusView(APIView):
    """
    Provides current user subscription status.
    Requires authentication.
    """

    #permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.now().date()

        try:
            user_sub = (
                UserSubscription.objects.select_related('subscription_type')
                .filter(user=user, is_active=True, start_date__lte=today, end_date__gt=today)
                .latest('start_date')
            )
            subscription = user_sub.subscription_type
            subscription.update_status()

            data = {
                "is_active": True,
                "plan": subscription.plan,
                "status": subscription.status,
                "billing_cycle": subscription.billing_cycle,
                "start_date": user_sub.start_date,
                "end_date": user_sub.end_date,
                "amount_paid": user_sub.amount_paid,
                "currency": subscription.currency,
                "message": "Active subscription found."
            }
        except UserSubscription.DoesNotExist:
            data = {
                "is_active": False,
                "plan": None,
                "status": None,
                "billing_cycle": None,
                "start_date": None,
                "end_date": None,
                "amount_paid": None,
                "currency": None,
                "message": "No active subscription found."
            }

        serializer = SubscriptionStatusSerializer(data)
        return Response(serializer.data)


class PaymentViewSet(BaseModelViewSet):
    """
    Manage user payments: list, create, retrieve.
    """

    serializer_class = PaymentSerializer
    #permission_classes = [permissions.IsAuthenticated]
    rate_limit_scope = 'payments'
    rate_limit_count = 50
    rate_limit_window = 3600

    def get_queryset(self):
        return Payment.objects.filter(user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        return serializer.save(user=self.request.user)

class PaymentInitiationView(APIView):
    """
    Initiates an M-Pesa STK Push payment for a subscription.
    """
    #permission_classes = [IsAuthenticated]
    serializer_class = PaymentInitiationSerializer
    throttle_scope = 'payment_initiation'

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
        phone = validated["phone_number"]

        if not standardize_phone_number(phone):
            return standardize_response(
                success=False,
                message="Invalid Kenyan phone number",
                status_code=status.HTTP_400_BAD_REQUEST
            )

        phone = standardize_phone_number(phone)
        amount = validated["amount"]
        reference = PaymentProcessor.generate_reference(prefix="PAY")
        description = validated.get("description", "EduPathway subscription")
        plan = None
        plan_id = validated.get("plan_id")

        if plan_id:
            plan = SubscriptionPlan.objects.filter(id=plan_id).first()

        if not plan:
            plan = PaymentProcessor.get_or_create_premium_plan()

        # Save pending payment
        payment = Payment.objects.create(
            user=request.user,
            phone_number=phone,
            amount=amount,
            reference=reference,
            payment_method="MPESA",
            status="PENDING",
            subscription_type=None,
            description=description,
        )

        mpesa_service = MpesaService()
        try:
            mpesa_response = mpesa_service.send_stk_push(
                phone_number=phone,
                amount=amount,
                account_reference=reference,
                description=description,
                callback_url=validated.get("callback_url")
            )
        except Exception as e:
            PaymentProcessor.mark_payment_failed(payment, str(e))
            log_user_activity(
                user=request.user,
                action='PAYMENT_INITIATION_FAILED',
                details={'error': str(e)},
                request=request,
            )
            return standardize_response(
                success=False,
                message="M-Pesa STK Push failed",
                errors={'mpesa_error': str(e)},
                status_code=status.HTTP_400_BAD_REQUEST
            )

        checkout_id = mpesa_response.get("CheckoutRequestID")
        if checkout_id:
            payment.mpesa_checkout_request_id = checkout_id
            payment.save()

            # Subscription logic
            try:
                if Decimal(amount) == plan.price:
                    PaymentProcessor.create_subscription(request.user, plan, payment)
                elif Decimal(amount) == plan.renewal_price:
                    subscription, error = PaymentProcessor.attempt_renewal(request.user, plan, payment)
                    if error:
                        PaymentProcessor.mark_payment_failed(payment, error)
                        return standardize_response(
                            success=False,
                            message="Subscription renewal failed",
                            errors={"renewal": error},
                            status_code=status.HTTP_400_BAD_REQUEST
                        )
                else:
                    error = "Invalid payment amount: does not match plan or renewal price."
                    PaymentProcessor.mark_payment_failed(payment, error)
                    return standardize_response(
                        success=False,
                        message="Payment rejected",
                        errors={"amount": error},
                        status_code=status.HTTP_400_BAD_REQUEST
                    )

            except Exception as e:
                PaymentProcessor.mark_payment_failed(payment, str(e))
                logger.exception(f"Subscription processing error: {e}")
                return standardize_response(
                    success=False,
                    message="Internal error during subscription processing",
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # Log and respond
            log_user_activity(
                user=request.user,
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
                    "payment_reference": reference,
                    "checkout_request_id": checkout_id,
                    "amount": format_currency(amount),
                    "phone_number": phone,
                    "status": "pending"
                },
                status_code=status.HTTP_200_OK
            )
        else:
            error_message = mpesa_response.get("error") or "M-Pesa STK Push failed."
            PaymentProcessor.mark_payment_failed(payment, error_message)
            return standardize_response(
                success=False,
                message="STK Push failed",
                errors={"mpesa_error": error_message},
                status_code=status.HTTP_400_BAD_REQUEST
            )

class MpesaCallbackView(APIView):
    """
    Handles M-Pesa payment status callbacks.
    """
    #permission_classes = [IsAuthenticated]
    authentication_classes = []  # No authentication for callbacks
    #permission_classes = []
    throttle_scope = 'mpesa_callback'

    def post(self, request):
        try:
            # Sanitize and log incoming callback
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
                    status_code=status.HTTP_400_BAD_REQUEST
                )

            try:
                payment = Payment.objects.get(mpesa_checkout_request_id=checkout_request_id)
            except Payment.DoesNotExist:
                return standardize_response(
                    success=False,
                    message="Payment not found for provided CheckoutRequestID",
                    status_code=status.HTTP_404_NOT_FOUND
                )

            # If payment already marked, skip further updates
            if payment.status in ['completed', 'failed']:
                return standardize_response(
                    success=True,
                    message="Callback already processed",
                    status_code=status.HTTP_200_OK
                )

            if result_code == 0:
                # Success case
                metadata_items = callback_data.get('CallbackMetadata', {}).get('Item', [])
                metadata = {item.get('Name'): item.get('Value') for item in metadata_items}
                
                payment.mpesa_receipt_number = metadata.get('MpesaReceiptNumber')
                payment.phone_number = metadata.get('PhoneNumber')
                payment.transaction_date = now()
                payment.mark_completed()
                message = "Payment marked as completed"
            else:
                # Failure case
                payment.mark_failed()
                message = f"Payment failed: {result_desc}"

            log_user_activity(user=payment.user, action='MPESA_CALLBACK_PROCESSED', details={
                'checkout_request_id': checkout_request_id,
                'result_code': result_code,
                'result_desc': result_desc
            }, request=request)

            return standardize_response(
                success=True,
                message=message,
                data={'payment_id': str(payment.id), 'status': payment.status},
                status_code=status.HTTP_200_OK
            )

        except Exception as e:
            log_user_activity(user=None, action='MPESA_CALLBACK_ERROR', details={'error': str(e)}, request=request)
            return standardize_response(
                success=False,
                message="Error processing M-Pesa callback",
                errors={'detail': str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class PaymentVerificationView(APIView):
    #permission_classes = [permissions.IsAuthenticated]

    def get(self, request, reference):
        try:
            payment = Payment.objects.get(reference=reference, user=request.user)
            serializer = PaymentSerializer(payment)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Payment.DoesNotExist:
            return Response(
                {"detail": "Payment not found"},
                status=status.HTTP_404_NOT_FOUND
            )

class UserSubscriptionViewSet(BaseModelViewSet):
    """
    User subscription management viewset.

    GET /api/v1/payments/my-subscriptions/ - List user subscriptions
    GET /api/v1/payments/my-subscriptions/{id}/ - Get subscription details
    """

    serializer_class = UserSubscriptionSerializer
    rate_limit_scope = 'user_subscriptions'
    rate_limit_count = 50
    rate_limit_window = 3600
    #permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Return user's subscriptions with updated status.
        """
        user_subs = UserSubscription.objects.filter(user=self.request.user).order_by('-created_at')

        # Update status for each subscription before returning
        for sub in user_subs:
            sub.update_status()

        return user_subs

    @action(detail=False, methods=['get'])
    def active(self, request):
        """
        Get user's active subscription.

        GET /api/v1/payments/my-subscriptions/active/
        """
        try:
            # Update all the user's subscriptions before filtering
            all_user_subs = UserSubscription.objects.filter(user=request.user)
            for sub in all_user_subs:
                sub.update_status()

            # Get active subscription after updating
            active_subscription = all_user_subs.filter(
                is_active=True,
                end_date__gt=timezone.now().date()
            ).first()

            if active_subscription:
                subscription_data = UserSubscriptionSerializer(active_subscription).data
                return standardize_response(
                    success=True,
                    message="Active subscription retrieved successfully",
                    data=subscription_data
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
