"""
Payment views using standardized base classes.
"""

from rest_framework import status, permissions
from rest_framework.decorators import action
from django.utils import timezone
from django.conf import settings
from rest_framework.views import APIView
from django.core.cache import cache
import requests
import base64
import json

from apps.core.views import BaseAPIView, BaseModelViewSet
from apps.core.utils import (
    standardize_response, generate_reference, standardize_phone_number,
    validate_kenyan_phone, get_client_ip, log_user_activity,
    cache_key, format_currency, sanitize_callback_data,
    is_business_hours, calculate_subscription_end_date
)
from .models import Payment, Subscription,UserSubscription
from .serializers import (
    PaymentSerializer, SubscriptionSerializer,UserSubscriptionSerializer,SubscriptionStatusSerializer,PaymentInitiationSerializer
)

class SubscriptionViewSet(BaseModelViewSet):
    """
    Subscription plans management viewset.

    GET /api/v1/payments/subscriptions/ - List subscription plans
    GET /api/v1/payments/subscriptions/{id}/ - Get subscription details
    """

    serializer_class = SubscriptionSerializer
    authentication_required = False
    rate_limit_scope = 'subscriptions'
    rate_limit_count = 100
    rate_limit_window = 3600

    def get_queryset(self):
        """
        Return active subscriptions after updating their status.
        """
        queryset = Subscription.objects.all()  # Start with all

        # Update status for each subscription
        for sub in queryset:
            sub.update_status()

        # Return only still-active subscriptions
        return Subscription.objects.filter(is_active=True)

    def get_permissions(self):
        """
        Allow read-only access for unauthenticated users.
        """
        if self.action in ['list', 'retrieve']:
            return []
        return [permissions.IsAuthenticated()]

class SubscriptionStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.now().date()

        try:
            user_sub = UserSubscription.objects.filter(
                user=user,
                is_active=True,
                start_date__lte=today,
                end_date__gt=today
            ).select_related('subscription_type').latest('start_date')

            sub = user_sub.subscription_type
            if sub:
                sub.update_status()

            data = {
                "is_active": True,
                "plan": sub.plan if sub else None,
                "status": sub.status if sub else None,
                "billing_cycle": sub.billing_cycle if sub else None,
                "start_date": user_sub.start_date,
                "end_date": user_sub.end_date,
                "amount_paid": user_sub.amount_paid,
                "currency": sub.currency if sub else None,
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
    Payment management viewset.
    
    GET /api/v1/payments/ - List user payments
    POST /api/v1/payments/ - Create new payment
    GET /api/v1/payments/{id}/ - Get payment details
    """
    
    serializer_class = PaymentSerializer
    rate_limit_scope = 'payments'
    rate_limit_count = 50
    rate_limit_window = 3600
    
    def get_queryset(self):
        """
        Return user's payments.
        """
        return Payment.objects.filter(user=self.request.user).order_by('-created_at')
    
    def perform_create(self, serializer):
        """
        Create payment for current user.
        """
        return serializer.save(user=self.request.user)


class PaymentInitiationView(BaseAPIView):
    """
    Payment initiation endpoint for M-Pesa STK Push.
    
    POST /api/v1/payments/initiate/
    
    Request Body:
    {
        "phone_number": "+254712345678",
        "amount": 1000.00,
        "subscription_type": "monthly",
        "description": "Monthly subscription"
    }
    
    Response:
    {
        "success": true,
        "message": "Payment initiated successfully",
        "data": {
            "payment_reference": "PAY20241201123456ABCD1234",
            "checkout_request_id": "ws_CO_123456789",
            "amount": "KES 1,000.00",
            "phone_number": "254712345678"
        }
    }
    """
    
    rate_limit_scope = 'payment_initiation'
    rate_limit_count = 5
    rate_limit_window = 3600  # 1 hour
    
    def post(self, request):
        """
        Initiate M-Pesa STK Push payment.
        """
        serializer = PaymentInitiationSerializer(data=request.data)
        
        if not serializer.is_valid():
            return standardize_response(
                success=False,
                message="Payment initiation validation failed",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            validated_data = serializer.validated_data
            
            # Validate phone number
            phone_number = validated_data['phone_number']
            if not validate_kenyan_phone(phone_number):
                return standardize_response(
                    success=False,
                    message="Invalid Kenyan phone number format",
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            # Standardize phone number
            standardized_phone = standardize_phone_number(phone_number)
            
            # Generate payment reference
            payment_reference = generate_reference('PAY')
            
            # Create payment record
            payment = Payment.objects.create(
                user=request.user,
                reference=payment_reference,
                amount=validated_data['amount'],
                phone_number=standardized_phone,
                payment_method='MPESA',
                status='PENDING',
                subscription_type=validated_data.get('subscription_type', 'monthly'),
                description=validated_data.get('description', 'EduPathway subscription')
            )
            
            # Send M-Pesa STK Push
            mpesa_response = self.send_stk_push(
                phone_number=standardized_phone,
                amount=validated_data['amount'],
                reference=payment_reference,
                description=payment.description
            )
            
            if mpesa_response.get('success'):
                # Update payment with M-Pesa details
                payment.mpesa_checkout_request_id = mpesa_response.get('checkout_request_id')
                payment.save()
                
                # Log payment initiation
                log_user_activity(
                    user=request.user,
                    action='PAYMENT_INITIATED',
                    details={
                        'payment_reference': payment_reference,
                        'amount': str(validated_data['amount']),
                        'subscription_type': validated_data.get('subscription_type'),
                        'phone_number': standardized_phone
                    },
                    request=request
                )
                
                response_data = {
                    'payment_reference': payment_reference,
                    'checkout_request_id': mpesa_response.get('checkout_request_id'),
                    'amount': format_currency(validated_data['amount']),
                    'phone_number': standardized_phone,
                    'status': 'pending'
                }
                
                return standardize_response(
                    success=True,
                    message="Payment initiated successfully. Please check your phone for M-Pesa prompt.",
                    data=response_data
                )
            
            else:
                # Update payment status to failed
                payment.status = 'FAILED'
                payment.failure_reason = mpesa_response.get('error', 'M-Pesa request failed')
                payment.save()
                
                # Log payment failure
                log_user_activity(
                    user=request.user,
                    action='PAYMENT_INITIATION_FAILED',
                    details={
                        'payment_reference': payment_reference,
                        'error': mpesa_response.get('error')
                    },
                    request=request
                )
                
                return standardize_response(
                    success=False,
                    message="Payment initiation failed. Please try again.",
                    errors={'mpesa_error': mpesa_response.get('error')},
                    status_code=status.HTTP_400_BAD_REQUEST
                )
        
        except Exception as e:
            return standardize_response(
                success=False,
                message="Payment processing error. Please try again.",
                errors={'detail': str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def send_stk_push(self, phone_number, amount, reference, description):
        """
        Send M-Pesa STK Push request.
        """
        try:
            # Get M-Pesa access token
            access_token = self.get_mpesa_access_token()
            if not access_token:
                return {'success': False, 'error': 'Failed to get M-Pesa access token'}
            
            # Prepare STK Push request
            timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
            password = base64.b64encode(
                f"{settings.MPESA_SHORTCODE}{settings.MPESA_PASSKEY}{timestamp}".encode()
            ).decode('utf-8')
            
            payload = {
                'BusinessShortCode': settings.MPESA_SHORTCODE,
                'Password': password,
                'Timestamp': timestamp,
                'TransactionType': 'CustomerPayBillOnline',
                'Amount': int(amount),
                'PartyA': phone_number,
                'PartyB': settings.MPESA_SHORTCODE,
                'PhoneNumber': phone_number,
                'CallBackURL': f"{settings.BASE_URL}/api/v1/payments/mpesa/callback/",
                'AccountReference': reference,
                'TransactionDesc': description
            }
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.post(
                settings.MPESA_STK_PUSH_URL,
                json=payload,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                response_data = response.json()
                if response_data.get('ResponseCode') == '0':
                    return {
                        'success': True,
                        'checkout_request_id': response_data.get('CheckoutRequestID')
                    }
                else:
                    return {
                        'success': False,
                        'error': response_data.get('ResponseDescription', 'STK Push failed')
                    }
            else:
                return {
                    'success': False,
                    'error': f'HTTP {response.status_code}: {response.text}'
                }
        
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def get_mpesa_access_token(self):
        """
        Get M-Pesa access token with caching.
        """
        # Check cache first
        token_cache_key = cache_key('mpesa_access_token')
        cached_token = cache.get(token_cache_key)
        
        if cached_token:
            return cached_token
        
        try:
            # Prepare authentication
            consumer_key = settings.MPESA_CONSUMER_KEY
            consumer_secret = settings.MPESA_CONSUMER_SECRET
            credentials = base64.b64encode(f"{consumer_key}:{consumer_secret}".encode()).decode()
            
            headers = {
                'Authorization': f'Basic {credentials}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(
                settings.MPESA_AUTH_URL,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                token_data = response.json()
                access_token = token_data.get('access_token')
                expires_in = int(token_data.get('expires_in', 3600))
                
                # Cache token for slightly less than expiry time
                cache.set(token_cache_key, access_token, expires_in - 60)
                
                return access_token
            
            return None
        
        except Exception:
            return None


class MpesaCallbackView(APIView):
    """
    M-Pesa callback endpoint for payment status updates.
    POST /api/v1/payments/mpesa/callback/
    """
    authentication_classes = []  # Allow unauthenticated access
    permission_classes = []
    throttle_scope = 'mpesa_callback'

    def post(self, request):
        try:
            # Sanitize and log callback
            sanitized_data = sanitize_callback_data(request.data)
            log_user_activity(
                user=None,
                action='MPESA_CALLBACK_RECEIVED',
                details=sanitized_data,
                request=request
            )

            # Extract callback data
            callback_data = request.data.get('Body', {}).get('stkCallback', {})
            checkout_request_id = callback_data.get('CheckoutRequestID')
            result_code = callback_data.get('ResultCode')

            if not checkout_request_id:
                return standardize_response(
                    success=False,
                    message="Invalid callback data",
                    status_code=status.HTTP_400_BAD_REQUEST
                )

            # Match payment
            try:
                payment = Payment.objects.get(mpesa_checkout_request_id=checkout_request_id)
            except Payment.DoesNotExist:
                return standardize_response(
                    success=False,
                    message="Payment not found",
                    status_code=status.HTTP_404_NOT_FOUND
                )

            if result_code == 0:
                # Success
                callback_metadata = callback_data.get('CallbackMetadata', {}).get('Item', [])
                mpesa_receipt_number = next(
                    (item.get('Value') for item in callback_metadata if item.get('Name') == 'MpesaReceiptNumber'),
                    None
                )

                # Mark payment complete
                payment.status = 'COMPLETED'
                payment.mpesa_receipt_number = mpesa_receipt_number
                payment.completed_at = timezone.now()
                payment.save()

                # Create or update subscription
                self.create_or_update_subscription(payment)

                log_user_activity(
                    user=payment.user,
                    action='PAYMENT_COMPLETED',
                    details={
                        'payment_reference': payment.reference,
                        'mpesa_receipt': mpesa_receipt_number,
                        'amount': str(payment.amount)
                    }
                )

            else:
                # Failure
                payment.status = 'FAILED'
                payment.failure_reason = callback_data.get('ResultDesc', 'Payment failed')
                payment.save()

                log_user_activity(
                    user=payment.user,
                    action='PAYMENT_FAILED',
                    details={
                        'payment_reference': payment.reference,
                        'failure_reason': payment.failure_reason
                    }
                )

            return standardize_response(
                success=True,
                message="Callback processed successfully"
            )

        except Exception as e:
            log_user_activity(
                user=None,
                action='MPESA_CALLBACK_ERROR',
                details={'error': str(e)},
                request=request
            )
            return standardize_response(
                success=False,
                message="Callback processing failed",
                errors={'detail': str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def create_or_update_subscription(self, payment):
        """
        Create or update user subscription based on payment.
        """
        duration_map = {
            'monthly': 30,
            'quarterly': 90,
            'yearly': 365,
            'lifetime': 36500
        }

        subscription = payment.subscription_type
        if not subscription:
            raise ValueError("Missing subscription type on payment.")

        # Ensure subscription status is updated
        subscription.update_status()

        # Determine billing duration
        duration_days = duration_map.get(subscription.billing_cycle, 30)
        today = timezone.now().date()
        end_date = today + timezone.timedelta(days=duration_days)

        # Create or update user subscription
        user_sub, created = UserSubscription.objects.get_or_create(
            user=payment.user,
            subscription_type=subscription,
            defaults={
                'start_date': today,
                'end_date': end_date,
                'is_active': True,
                'amount_paid': payment.amount
            }
        )

        if not created:
            if user_sub.end_date < today:
                user_sub.start_date = today
                user_sub.end_date = end_date

            user_sub.is_active = True
            user_sub.amount_paid += payment.amount
            user_sub.save()

        # Update user premium flag
        payment.user.is_premium = True
        payment.user.save(update_fields=['is_premium'])

        return user_sub
class PaymentVerificationView(BaseAPIView):
    """
    Payment verification endpoint.
    
    POST /api/v1/payments/verify/
    
    Request Body:
    {
        "payment_reference": "PAY20241201123456ABCD1234"
    }
    """
    
    rate_limit_scope = 'payment_verification'
    rate_limit_count = 20
    rate_limit_window = 3600
    
    def post(self, request):
        """
        Verify payment status.
        """
        payment_reference = request.data.get('payment_reference')
        
        if not payment_reference:
            return standardize_response(
                success=False,
                message="Payment reference is required",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            payment = Payment.objects.get(
                reference=payment_reference,
                user=request.user
            )
            
            payment_data = PaymentSerializer(payment).data
            
            return standardize_response(
                success=True,
                message="Payment status retrieved successfully",
                data=payment_data
            )
            
        except Payment.DoesNotExist:
            return standardize_response(
                success=False,
                message="Payment not found",
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return standardize_response(
                success=False,
                message="Payment verification failed",
                errors={'detail': str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
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
