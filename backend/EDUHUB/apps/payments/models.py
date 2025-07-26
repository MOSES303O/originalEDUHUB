"""
Payment models for the EduPathway platform.

This module contains all payment-related models including
Payment, Subscription, and related entities. All models are
designed to work consistently with authentication and core utils.
"""
from django.db import models
from django.utils import timezone
from django.conf import settings
from decimal import Decimal
from datetime import timedelta

PAYMENT_METHODS = (
    ('mpesa', 'M-Pesa'),
)

PAYMENT_STATUSES = (
    ('pending', 'Pending'),
    ('completed', 'Completed'),
    ('failed', 'Failed'),
)


class SubscriptionPlan(models.Model):
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    duration_hours = models.PositiveIntegerField(help_text="Initial subscription duration in hours")
    renewal_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Price for renewal within grace period"
    )
    renewal_grace_period_hours = models.PositiveIntegerField(
        default=24,
        help_text="Grace period after expiry (in hours) for discounted renewal"
    )

    def __str__(self):
        return self.name


class Subscription(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='subscriptions'
    )
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.CASCADE)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    active = models.BooleanField(default=True)
    last_payment_at = models.DateTimeField(null=True, blank=True)
    is_renewal_eligible = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username} - {self.plan.name}"

    @property
    def is_active(self):
        now = timezone.now()
        return self.active and self.start_date <= now <= self.end_date

    def update_status(self):
        now = timezone.now()
        if self.end_date < now:
            self.active = False
            grace_period_end = self.end_date + timedelta(hours=self.plan.renewal_grace_period_hours)
            self.is_renewal_eligible = now <= grace_period_end
            self.save()


class UserSubscription(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='user_subscription'
    )
    current_subscription = models.ForeignKey(
        Subscription,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='user_current_subscription'
    )
    renewal_attempted = models.BooleanField(default=False)
    renewal_successful = models.BooleanField(default=False)
    def subscription_name(self, obj):
        if obj.current_subscription and obj.current_subscription.plan:
         return obj.current_subscription.plan.name
        return "-"

    def __str__(self):
        return f"{self.user.email}"

class Payment(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='payments'
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=50, choices=PAYMENT_METHODS)
    status = models.CharField(max_length=50, choices=PAYMENT_STATUSES, default='pending')
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    phone_number = models.CharField(max_length=20)
    failure_reason = models.TextField(blank=True, null=True)

    # 🔽 Add these fields
    reference = models.CharField(max_length=100, unique=True)  # required in view logic
    description = models.TextField(blank=True, null=True)
    subscription_type = models.CharField(max_length=100, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='related_payments'
    )

    # M-Pesa-specific fields
    mpesa_receipt_number = models.CharField(max_length=100, blank=True, null=True)
    merchant_request_id = models.CharField(max_length=100, blank=True, null=True)
    checkout_request_id = models.CharField(max_length=100, blank=True, null=True)
    callback_metadata = models.JSONField(blank=True, null=True)

    def __str__(self):
        return f"Payment by {self.user.username} - {self.amount} - {self.status}"

    def mark_completed(self, transaction_id=None, receipt_number=None):
        self.status = 'completed'
        if transaction_id:
            self.transaction_id = transaction_id
        if receipt_number:
            self.mpesa_receipt_number = receipt_number
        # Set is_premium for backward compatibility
        self.user.is_premium = True
        self.user.save()
        self.updated_at = timezone.now()
        self.save()

    def mark_failed(self):
        self.status = 'failed'
        self.updated_at = timezone.now()
        self.save()

class PaymentCallback(models.Model):
    """
    Stores raw callback data for auditing/debugging purposes.
    """
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='callbacks')
    data = models.JSONField()
    received_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Callback for {self.payment.reference_number} at {self.received_at}"

class PaymentWebhook(models.Model):
    raw_data = models.JSONField()
    received_at = models.DateTimeField(auto_now_add=True)
    # Related payment
    payment = models.ForeignKey(
        Payment,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='webhooks',
        help_text="Related payment if found"
    )
    def __str__(self):
        return f"Webhook received at {self.received_at}"
