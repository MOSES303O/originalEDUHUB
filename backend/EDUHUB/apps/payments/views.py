from django.shortcuts import render

# Create your views here.
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.conf import settings
from apps.core.utils import APIResponseMixin
from .models import (
    PaymentMethod, Subscription, UserSubscription, 
    Payment, MpesaTransaction
)
from .serializers import (
    PaymentMethodSerializer, SubscriptionSerializer,
    UserSubscriptionSerializer, PaymentSerializer,
    MpesaPaymentInitiateSerializer, MpesaTransactionSerializer,
    PaymentVerificationSerializer
)
from .utils import MpesaService
import logging

logger = logging.getLogger(__name__)


class PaymentMethodListView(generics.ListAPIView):
    """
    GET /api/v1/payment-methods/
    List all active payment methods
    """
    queryset = PaymentMethod.objects.filter(is_active=True)
    serializer_class = PaymentMethodSerializer


class SubscriptionListView(generics.ListAPIView):
    """
    GET /api/v1/subscriptions/
    List all active subscription plans
    """
    queryset = Subscription.objects.filter(is_active=True)
    serializer_class = SubscriptionSerializer


class UserSubscriptionListView(generics.ListAPIView):
    """
    GET /api/v1/user/subscriptions/
    List user's subscriptions
    """
    serializer_class = UserSubscriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserSubscription.objects.filter(
            user=self.request.user
        ).select_related('subscription').order_by('-created_at')


class UserPaymentListView(generics.ListAPIView):
    """
    GET /api/v1/user/payments/
    List user's payment history
    """
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.filter(
            user=self.request.user
        ).select_related('payment_method', 'subscription').order_by('-initiated_at')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def initiate_mpesa_payment(request):
    """
    POST /api/v1/payments/mpesa/initiate/
    Initiate M-Pesa STK Push payment
    
    Request body:
    {
        "phone_number": "254701234567",
        "amount": 1000.00,
        "payment_type": "subscription",
        "subscription_id": "uuid",
        "account_reference": "EduPathway",
        "transaction_desc": "Subscription Payment"
    }
    """
    try:
        serializer = MpesaPaymentInitiateSerializer(data=request.data)
        if not serializer.is_valid():
            return StandardAPIResponse.error(
                message="Invalid payment data",
                errors=serializer.errors
            )

        validated_data = serializer.validated_data
        
        # Get M-Pesa payment method
        try:
            mpesa_method = PaymentMethod.objects.get(code='MPESA', is_active=True)
        except PaymentMethod.DoesNotExist:
            return StandardAPIResponse.error(
                message="M-Pesa payment method not available"
            )

        # Create payment record
        payment = Payment.objects.create(
            user=request.user,
            payment_method=mpesa_method,
            amount=validated_data['amount'],
            payment_type=validated_data['payment_type'],
            subscription_id=validated_data.get('subscription_id'),
            description=validated_data.get('transaction_desc', 'EduPathway Payment')
        )

        # Create M-Pesa transaction record
        mpesa_transaction = MpesaTransaction.objects.create(
            payment=payment,
            phone_number=validated_data['phone_number'],
            account_reference=validated_data.get('account_reference', 'EduPathway'),
            transaction_desc=validated_data.get('transaction_desc', 'Payment')
        )

        # Initialize M-Pesa service
        mpesa_service = MpesaService()
        
        # Initiate STK Push
        stk_response = mpesa_service.stk_push(
            phone_number=validated_data['phone_number'],
            amount=int(payment.total_amount),
            account_reference=mpesa_transaction.account_reference,
            transaction_desc=mpesa_transaction.transaction_desc,
            callback_url=f"{settings.BASE_URL}/api/v1/payments/mpesa/callback/"
        )

        if stk_response.get('ResponseCode') == '0':
            # Update transaction with M-Pesa details
            mpesa_transaction.checkout_request_id = stk_response.get('CheckoutRequestID')
            mpesa_transaction.merchant_request_id = stk_response.get('MerchantRequestID')
            mpesa_transaction.save()

            # Update payment status
            payment.status = 'processing'
            payment.external_transaction_id = stk_response.get('CheckoutRequestID')
            payment.save()

            return StandardAPIResponse.success(
                data={
                    'payment_id': payment.id,
                    'transaction_id': payment.transaction_id,
                    'checkout_request_id': stk_response.get('CheckoutRequestID'),
                    'merchant_request_id': stk_response.get('MerchantRequestID'),
                    'amount': payment.total_amount,
                    'phone_number': validated_data['phone_number']
                },
                message="Payment initiated successfully. Please check your phone for M-Pesa prompt."
            )
        else:
            # Update payment status to failed
            payment.status = 'failed'
            payment.save()
            
            return StandardAPIResponse.error(
                message="Failed to initiate M-Pesa payment",
                errors=stk_response.get('errorMessage', 'Unknown error')
            )

    except Exception as e:
        logger.error(f"Error initiating M-Pesa payment: {str(e)}")
        return StandardAPIResponse.error(
            message="Failed to initiate payment",
            errors=str(e)
        )


@api_view(['POST'])
def mpesa_callback(request):
    """
    POST /api/v1/payments/mpesa/callback/
    Handle M-Pesa payment callbacks
    """
    try:
        callback_data = request.data
        logger.info(f"M-Pesa callback received: {callback_data}")

        # Extract callback data
        stk_callback = callback_data.get('Body', {}).get('stkCallback', {})
        checkout_request_id = stk_callback.get('CheckoutRequestID')
        result_code = stk_callback.get('ResultCode')
        result_desc = stk_callback.get('ResultDesc')

        if not checkout_request_id:
            logger.error("No CheckoutRequestID in callback")
            return Response({'status': 'error'}, status=status.HTTP_400_BAD_REQUEST)

        # Find the transaction
        try:
            mpesa_transaction = MpesaTransaction.objects.get(
                checkout_request_id=checkout_request_id
            )
            payment = mpesa_transaction.payment
        except MpesaTransaction.DoesNotExist:
            logger.error(f"Transaction not found for CheckoutRequestID: {checkout_request_id}")
            return Response({'status': 'error'}, status=status.HTTP_404_NOT_FOUND)

        # Update transaction details
        mpesa_transaction.result_code = str(result_code)
        mpesa_transaction.result_desc = result_desc

        if result_code == 0:  # Success
            # Extract callback metadata
            callback_metadata = stk_callback.get('CallbackMetadata', {}).get('Item', [])
            metadata = {}
            
            for item in callback_metadata:
                name = item.get('Name')
                value = item.get('Value')
                if name and value:
                    metadata[name] = value

            # Update transaction with success details
            mpesa_transaction.mpesa_receipt_number = metadata.get('MpesaReceiptNumber')
            if metadata.get('TransactionDate'):
                from datetime import datetime
                mpesa_transaction.transaction_date = datetime.strptime(
                    str(metadata.get('TransactionDate')), '%Y%m%d%H%M%S'
                )

            # Update payment status
            payment.status = 'completed'
            payment.completed_at = timezone.now()
            payment.external_transaction_id = metadata.get('MpesaReceiptNumber')
            payment.metadata = metadata

            # Handle subscription activation
            if payment.payment_type == 'subscription' and payment.subscription:
                payment.subscription.is_active = True
                payment.subscription.save()

        else:  # Failed
            payment.status = 'failed'

        # Save updates
        mpesa_transaction.save()
        payment.save()

        logger.info(f"Payment {payment.transaction_id} updated with status: {payment.status}")
        
        return Response({'status': 'success'}, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error processing M-Pesa callback: {str(e)}")
        return Response({'status': 'error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_payment(request):
    """
    POST /api/v1/payments/verify/
    Verify payment status
    
    Request body:
    {
        "transaction_id": "TXN20241201ABCD1234"
    }
    """
    try:
        serializer = PaymentVerificationSerializer(data=request.data)
        if not serializer.is_valid():
            return StandardAPIResponse.error(
                message="Invalid verification data",
                errors=serializer.errors
            )

        transaction_id = serializer.validated_data['transaction_id']
        
        try:
            payment = Payment.objects.get(
                transaction_id=transaction_id,
                user=request.user
            )
        except Payment.DoesNotExist:
            return StandardAPIResponse.error(
                message="Payment not found"
            )

        # If payment is still processing, check with M-Pesa
        if payment.status == 'processing' and hasattr(payment, 'mpesa_transaction'):
            mpesa_service = MpesaService()
            query_response = mpesa_service.query_transaction(
                payment.mpesa_transaction.checkout_request_id
            )
            
            if query_response.get('ResponseCode') == '0':
                result_code = query_response.get('ResultCode')
                if result_code == '0':
                    payment.status = 'completed'
                    payment.completed_at = timezone.now()
                elif result_code in ['1032', '1037']:  # User cancelled or timeout
                    payment.status = 'cancelled'
                else:
                    payment.status = 'failed'
                
                payment.save()

        payment_serializer = PaymentSerializer(payment)
        
        return StandardAPIResponse.success(
            data=payment_serializer.data,
            message="Payment status retrieved successfully"
        )

    except Exception as e:
        logger.error(f"Error verifying payment: {str(e)}")
        return StandardAPIResponse.error(
            message="Failed to verify payment",
            errors=str(e)
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def subscribe(request):
    """
    POST /api/v1/payments/subscribe/
    Subscribe to a plan
    
    Request body:
    {
        "subscription_id": "uuid",
        "phone_number": "254701234567"
    }
    """
    try:
        subscription_id = request.data.get('subscription_id')
        phone_number = request.data.get('phone_number')

        if not subscription_id or not phone_number:
            return StandardAPIResponse.error(
                message="Subscription ID and phone number are required"
            )

        # Get subscription plan
        try:
            subscription_plan = Subscription.objects.get(
                id=subscription_id, is_active=True
            )
        except Subscription.DoesNotExist:
            return StandardAPIResponse.error(
                message="Subscription plan not found"
            )

        # Check if user already has active subscription
        active_subscription = UserSubscription.objects.filter(
            user=request.user,
            is_active=True,
            end_date__gt=timezone.now()
        ).first()

        if active_subscription:
            return StandardAPIResponse.error(
                message="You already have an active subscription"
            )

        # Create user subscription
        user_subscription = UserSubscription.objects.create(
            user=request.user,
            subscription=subscription_plan,
            is_active=False  # Will be activated after payment
        )

        # Initiate payment
        payment_data = {
            'phone_number': phone_number,
            'amount': subscription_plan.price,
            'payment_type': 'subscription',
            'subscription_id': user_subscription.id,
            'account_reference': 'EduPathway',
            'transaction_desc': f'Subscription: {subscription_plan.name}'
        }

        # Use the existing payment initiation logic
        request.data.update(payment_data)
        return initiate_mpesa_payment(request)

    except Exception as e:
        logger.error(f"Error creating subscription: {str(e)}")
        return StandardAPIResponse.error(
            message="Failed to create subscription",
            errors=str(e)
        )