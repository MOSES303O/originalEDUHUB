"""
Payment serializers for EduPathway platform.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import (
    Payment, Subscription,
    SubscriptionPlan, PaymentCallback
)
from apps.core.utils import validate_kenyan_phone
from apps.authentication.models import UserSelectedCourse  # adjust import if needed
from apps.courses.serializers import CourseListSerializer  # assumes you have one

User = get_user_model()


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    """Serializer for subscription plans"""

    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'name','price', 'duration_hours',
            'renewal_grace_period_hours','renewal_price'
        ]
        read_only_fields = ['id']


class PaymentInitiationSerializer(serializers.Serializer):
    """
    Serializer for initiating M-Pesa payment.
    `amount` and `plan_id` are now handled internally.
    """

    phone_number = serializers.CharField(
        max_length=15,
        help_text="User's phone number in international or local format"
    )
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    description = serializers.CharField(
        max_length=255,
        required=False,
        help_text="Optional payment description"
    )
    callback_url = serializers.URLField(
        required=False,
        allow_blank=True,
        help_text="Optional override for M-Pesa callback URL"
    )

    def validate_phone_number(self, value):
        if not validate_kenyan_phone(value):
            raise serializers.ValidationError(
                "Please enter a valid Kenyan phone number (e.g., 0740123456 or +254740123456)"
            )
        return value

    def validate_callback_url(self, value):
        if value in [None, ""]:
            return None  # Explicitly allow missing or blank URLs
        if not value.startswith("http"):
            raise serializers.ValidationError("Enter a valid URL starting with http or https.")
        return value

class PaymentSerializer(serializers.ModelSerializer):
    """Serializer for payments"""
    subscription_plan = SubscriptionPlanSerializer(read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'user_email', 'subscription_plan', 'amount',
            'payment_method', 'status', 'phone_number',
            'mpesa_receipt_number', 'created_at',
            'merchant_request_id', 'checkout_request_id',
            'callback_metadata','mark_completed','mark_failed'
        ]
        read_only_fields = [
            'id', 'user_email','mpesa_receipt_number','merchant_request_id'
            'created_at','mark_completed','mark_failed'
        ]
class RenewalPaymentSerializer(serializers.Serializer):
    plan_id = serializers.IntegerField()
    # phone_number, amount, callback_url as above
    phone_number = serializers.CharField(
        max_length=15,
        help_text="User's phone number in international or local format"
    )
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    description = serializers.CharField(max_length=255, required=False)
    plan_id = serializers.IntegerField(
        help_text="ID of the subscription plan"
    )
    callback_url = serializers.URLField(
        required=False,
        allow_blank=True,
        help_text="Optional override for M-Pesa callback URL"
    )

    def validate_phone_number(self, value):
        if not validate_kenyan_phone(value):
            raise serializers.ValidationError(
                "Please enter a valid Kenyan phone number (e.g., 0740123456 or +254740123456)"
            )
        return value


    def validate(self, data):
        plan = SubscriptionPlan.objects.get(id=data['plan_id'])
        data['plan'] = plan
        data['expected_amount'] = plan.price
        return data

class SubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for subscriptions"""
    plan = serializers.CharField(source='plan.name', read_only=True)  # Simplify plan to avoid complex serialization
    payment = PaymentSerializer(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    days_remaining = serializers.IntegerField(read_only=True)

    class Meta:
        model = Subscription
        fields = [
            'id', 'plan', 'payment', 'is_active', 'start_date',
            'end_date', 'is_expired', 'days_remaining'
        ]
        read_only_fields = [
            'id', 'plan', 'payment', 'start_date', 'end_date'
        ]
class SubscriptionStatusSerializer(serializers.Serializer):
    """Serializer for subscription status checks"""
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


class PaymentCallbackSerializer(serializers.ModelSerializer):
    """Serializer for handling M-Pesa payment callback logs"""

    class Meta:
        model = PaymentCallback
        fields = [
            'id', 'checkout_request_id', 'result_code',
            'result_desc', 'processed', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class PaymentVerifySerializer(serializers.Serializer):
    """Serializer for payment verification by payment ID"""
    payment_id = serializers.UUIDField()

    def validate_payment_id(self, value):
        if not Payment.objects.filter(id=value).exists():
            raise serializers.ValidationError("Payment not found.")
        return value
