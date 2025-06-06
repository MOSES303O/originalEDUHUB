"""
Payment serializers for EduPathway platform.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Payment, Subscription,UserSubscription, SubscriptionPlan, PaymentCallback
from apps.core.utils import validate_kenyan_phone

User = get_user_model()


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    #Serializer for subscription plans
    
    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'name', 'description', 'price', 'duration_days',
            'features', 'max_course_selections', 'max_applications',
            'is_active'
        ]
        read_only_fields = ['id']


class PaymentInitiationSerializer(serializers.Serializer):
    phone_number = serializers.CharField(
        max_length=15,
        help_text="User's phone number in international format e.g. +254712345678"
    )
    amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=1,
        help_text="Payment amount in KES"
    )
    subscription_type = serializers.CharField(
        max_length=50,
        required=False,
        help_text="Type of subscription (e.g. monthly, yearly)"
    )
    description = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
        help_text="Description for the payment (optional)"
    )

class PaymentSerializer(serializers.ModelSerializer):
    #Serializer for payments
    subscription_plan = SubscriptionPlanSerializer(read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'user_email', 'subscription_plan', 'amount', 'currency',
            'payment_method', 'status', 'phone_number', 'reference',
            'description', 'mpesa_receipt_number', 'created_at',
            'completed_at'
        ]
        read_only_fields = [
            'id', 'user_email', 'reference', 'mpesa_receipt_number',
            'created_at', 'completed_at'
        ]


class SubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for subscriptions"""
    plan = SubscriptionPlanSerializer(read_only=True)
    payment = PaymentSerializer(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    days_remaining = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Subscription
        fields = [
            'id', 'plan', 'payment', 'is_active', 'start_date',
            'end_date', 'courses_selected', 'applications_made',
            'is_expired', 'days_remaining', 'created_at'
        ]
        read_only_fields = [
            'id', 'payment', 'start_date', 'end_date', 'created_at'
        ]

class UserSubscriptionSerializer(serializers.ModelSerializer):
    """
    Serializer for user subscription instances.
    """
    subscription_type = SubscriptionSerializer(read_only=True)
    is_current = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()

    class Meta:
        model = UserSubscription
        fields = [
            'id',
            'subscription_type',
            'start_date',
            'end_date',
            'is_active',
            'amount_paid',
            'is_current',
            'days_remaining',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_is_current(self, obj):
        return obj.is_current()

    def get_days_remaining(self, obj):
        today = timezone.now().date()
        if obj.end_date >= today:
            return (obj.end_date - today).days
        return 0

class SubscriptionStatusSerializer(serializers.Serializer):
    """
    Serializer for subscription status response.
    """
    is_active = serializers.BooleanField(read_only=True)
    plan = serializers.CharField(read_only=True, allow_null=True)
    status = serializers.CharField(read_only=True, allow_null=True)
    billing_cycle = serializers.CharField(read_only=True, allow_null=True)
    start_date = serializers.DateField(read_only=True, allow_null=True)
    end_date = serializers.DateField(read_only=True, allow_null=True)
    amount_paid = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True,
        allow_null=True
    )
    currency = serializers.CharField(read_only=True, allow_null=True)
    message = serializers.CharField(read_only=True, allow_null=True)

class PaymentInitiateSerializer(serializers.Serializer):
    """Serializer for payment initiation"""
    phone_number = serializers.CharField(max_length=15)
    plan_id = serializers.IntegerField()
    callback_url = serializers.URLField(required=False, allow_blank=True)

    def validate_phone_number(self, value):
        """Validate Kenyan phone number"""
        if not validate_kenyan_phone(value):
            raise serializers.ValidationError(
                "Please enter a valid Kenyan phone number (e.g., 0740408496 or +254740408496)"
            )
        return value

    def validate_plan_id(self, value):
        """Validate subscription plan exists and is active"""
        try:
            plan = SubscriptionPlan.objects.get(id=value, is_active=True)
            return value
        except SubscriptionPlan.DoesNotExist:
            raise serializers.ValidationError("Invalid or inactive subscription plan")


class PaymentCallbackSerializer(serializers.ModelSerializer):
    """Serializer for payment callbacks"""
    
    class Meta:
        model = PaymentCallback
        fields = [
            'id', 'checkout_request_id', 'result_code', 'result_desc',
            'processed', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class PaymentVerifySerializer(serializers.Serializer):
    """Serializer for payment verification"""
    payment_id = serializers.UUIDField()

    def validate_payment_id(self, value):
        """Validate payment exists"""
        try:
            Payment.objects.get(id=value)
            return value
        except Payment.DoesNotExist:
            raise serializers.ValidationError("Payment not found")
