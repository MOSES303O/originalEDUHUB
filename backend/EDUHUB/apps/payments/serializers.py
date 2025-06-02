from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    PaymentMethod, Subscription, UserSubscription, 
    Payment, MpesaTransaction
)

User = get_user_model()


class PaymentMethodSerializer(serializers.ModelSerializer):
    """
    Serializer for PaymentMethod model
    """
    class Meta:
        model = PaymentMethod
        fields = [
            'id', 'name', 'code', 'description', 'is_active',
            'processing_fee_percentage'
        ]
        read_only_fields = ['id']


class SubscriptionSerializer(serializers.ModelSerializer):
    """
    Serializer for Subscription model
    """
    class Meta:
        model = Subscription
        fields = [
            'id', 'name', 'description', 'price', 'duration_days',
            'features', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class UserSubscriptionSerializer(serializers.ModelSerializer):
    """
    Serializer for UserSubscription model
    """
    subscription = SubscriptionSerializer(read_only=True)
    subscription_id = serializers.UUIDField(write_only=True)
    is_expired = serializers.ReadOnlyField()
    days_remaining = serializers.SerializerMethodField()
    
    class Meta:
        model = UserSubscription
        fields = [
            'id', 'subscription', 'subscription_id', 'start_date',
            'end_date', 'is_active', 'auto_renew', 'is_expired',
            'days_remaining', 'created_at'
        ]
        read_only_fields = ['id', 'start_date', 'end_date', 'created_at']

    def get_days_remaining(self, obj):
        """Calculate days remaining in subscription"""
        if obj.is_expired:
            return 0
        from django.utils import timezone
        delta = obj.end_date - timezone.now()
        return max(0, delta.days)


class PaymentSerializer(serializers.ModelSerializer):
    """
    Serializer for Payment model
    """
    payment_method = PaymentMethodSerializer(read_only=True)
    payment_method_id = serializers.UUIDField(write_only=True)
    subscription = UserSubscriptionSerializer(read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'payment_method', 'payment_method_id', 'amount',
            'processing_fee', 'total_amount', 'currency',
            'transaction_id', 'external_transaction_id',
            'reference_number', 'payment_type', 'subscription',
            'status', 'description', 'initiated_at', 'completed_at'
        ]
        read_only_fields = [
            'id', 'processing_fee', 'total_amount', 'transaction_id',
            'external_transaction_id', 'initiated_at', 'completed_at'
        ]


class MpesaPaymentInitiateSerializer(serializers.Serializer):
    """
    Serializer for initiating M-Pesa payments
    """
    phone_number = serializers.CharField(max_length=15)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    payment_type = serializers.ChoiceField(choices=Payment.PAYMENT_TYPE_CHOICES)
    subscription_id = serializers.UUIDField(required=False)
    account_reference = serializers.CharField(max_length=50, required=False)
    transaction_desc = serializers.CharField(max_length=100, required=False)

    def validate_phone_number(self, value):
        """Validate Kenyan phone number format"""
        import re
        # Remove any spaces or special characters
        phone = re.sub(r'[^\d+]', '', value)
        
        # Check for valid Kenyan number formats
        kenyan_patterns = [
            r'^254[17]\d{8}$',  # 254701234567, 254111234567
            r'^0[17]\d{8}$',    # 0701234567, 0111234567
            r'^\+254[17]\d{8}$' # +254701234567
        ]
        
        if not any(re.match(pattern, phone) for pattern in kenyan_patterns):
            raise serializers.ValidationError(
                "Invalid Kenyan phone number format"
            )
        
        # Normalize to 254 format
        if phone.startswith('0'):
            phone = '254' + phone[1:]
        elif phone.startswith('+254'):
            phone = phone[1:]
        
        return phone

    def validate(self, data):
        """Validate payment data"""
        if data['payment_type'] == 'subscription' and not data.get('subscription_id'):
            raise serializers.ValidationError(
                "Subscription ID is required for subscription payments"
            )
        
        if data['amount'] <= 0:
            raise serializers.ValidationError("Amount must be greater than 0")
        
        return data


class MpesaTransactionSerializer(serializers.ModelSerializer):
    """
    Serializer for MpesaTransaction model
    """
    payment = PaymentSerializer(read_only=True)
    
    class Meta:
        model = MpesaTransaction
        fields = [
            'id', 'payment', 'phone_number', 'account_reference',
            'transaction_desc', 'checkout_request_id', 'merchant_request_id',
            'mpesa_receipt_number', 'transaction_date', 'result_code',
            'result_desc', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PaymentVerificationSerializer(serializers.Serializer):
    """
    Serializer for payment verification
    """
    transaction_id = serializers.CharField(max_length=100)
    external_transaction_id = serializers.CharField(max_length=100, required=False)