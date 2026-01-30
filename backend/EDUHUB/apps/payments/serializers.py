# payments/serializers.py
from rest_framework import serializers
from .models import Payment, Subscription, MpesaCallback, Transaction

class SubscriptionSerializer(serializers.ModelSerializer):
    plan_display = serializers.CharField(source='get_plan_display', read_only=True)

    class Meta:
        model = Subscription
        fields = [
            'id', 'plan', 'plan_display', 'start_date', 'end_date',
            'active', 'last_payment_at', 'is_renewal_eligible'
        ]
        read_only_fields = ['start_date', 'end_date', 'active', 'last_payment_at', 'is_renewal_eligible']


class PaymentInitiationSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=20)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    plan_type = serializers.ChoiceField(choices=['PREMIUM', 'RENEWAL'])
    subjects = serializers.ListField(           # ← just this one line addition
        child=serializers.DictField(),
        required=False,
        allow_empty=True,
        default=list
    )

    def validate_amount(self, value):
        if value < 1:
            raise serializers.ValidationError("Amount must be at least 1")
        return value

    def validate_plan_type(self, value):
        if value not in ['PREMIUM', 'RENEWAL']:
            raise serializers.ValidationError("Invalid plan type")
        return value


class PaymentSerializer(serializers.ModelSerializer):
    subscription = SubscriptionSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'amount', 'payment_method', 'status', 'status_display',
            'phone_number', 'reference', 'subscription_type', 'subscription',
            'mpesa_receipt_number', 'checkout_request_id',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['reference', 'checkout_request_id', 'mpesa_receipt_number', 'created_at', 'updated_at']


class MpesaCallbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = MpesaCallback
        fields = ['id', 'payment', 'raw_data', 'received_at']
        read_only_fields = ['payment', 'raw_data', 'received_at']


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ['id', 'payment', 'phonenumber', 'amount', 'receipt_no', 'created_at']
        read_only_fields = ['payment', 'created_at']