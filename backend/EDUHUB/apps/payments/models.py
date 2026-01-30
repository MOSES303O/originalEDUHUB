# payments/models.py — FINAL 2025 GOLD STANDARD (BEST OF BOTH)
from django.db import models
from django.utils import timezone
from django.conf import settings
from django.core.validators import MinValueValidator
from datetime import timedelta
import logging
logger = logging.getLogger(__name__)

PAYMENT_METHODS = (
    ('mpesa', 'M-Pesa'),
)

PAYMENT_STATUSES = (
    ('pending', 'Pending'),
    ('completed', 'Completed'),
    ('failed', 'Failed'),
)

SUBSCRIPTION_PLANS = (
    ('PREMIUM', 'Premium'),
    ('RENEWAL', 'Renewal'),
)


class Subscription(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='subscriptions'
    )
    plan = models.CharField(
        max_length=20,
        choices=SUBSCRIPTION_PLANS,
        default='PREMIUM'
    )
    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField()
    active = models.BooleanField(default=True)
    last_payment_at = models.DateTimeField(null=True, blank=True)
    is_renewal_eligible = models.BooleanField(default=False)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.user.phone_number} - {self.get_plan_display()}"

    @property
    def is_active_now(self):
        return self.active and self.start_date <= timezone.now() <= self.end_date

    def update_status(self):
        now = timezone.now()
        if self.end_date < now:
            self.active = False
            grace_end = self.end_date + timedelta(days=7)
            self.is_renewal_eligible = now <= grace_end
            self.save(update_fields=['active', 'is_renewal_eligible'])

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Auto-deactivate if expired
        if self.end_date < timezone.now() and self.active:
            self.active = False
            self.is_renewal_eligible = timezone.now() <= (self.end_date + timedelta(hours=24))
            self.save(update_fields=['active', 'is_renewal_eligible'])

            # Delete all related payment data after expiry
            Payment.objects.filter(subscription=self).delete()
            Transaction.objects.filter(payment__subscription=self).delete()
            MpesaCallback.objects.filter(payment__subscription=self).delete()

            logger.info(f"Expired subscription {self.id} cleaned - payment data deleted for user {self.user.phone_number}")


class Payment(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,   # ← Allow removal if user deleted
        null=True,                   # ← CRITICAL: Allow NULL
        blank=True,                  # ← Allow blank in admin/forms
        related_name='payments'
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=50, choices=PAYMENT_METHODS, default='mpesa')
    status = models.CharField(max_length=50, choices=PAYMENT_STATUSES, default='pending')
    phone_number = models.CharField(max_length=20)
    pending_subjects = models.JSONField(null=True, blank=True)

    reference = models.CharField(max_length=100, unique=True)
    subscription_type = models.CharField(max_length=20, choices=SUBSCRIPTION_PLANS, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments'
    )

    # M-Pesa specific
    mpesa_receipt_number = models.CharField(max_length=100, blank=True, null=True)
    checkout_request_id = models.CharField(max_length=100, blank=True, null=True, unique=True)
    callback_metadata = models.JSONField(blank=True, null=True)
    failure_reason = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['checkout_request_id']),
            models.Index(fields=['mpesa_receipt_number']),
        ]

    def __str__(self):
        # SAFE VERSION - no crash if phone_number is None
        phone = self.phone_number or "Unknown"
        amount = self.amount or "0"
        
        return f"{phone} - KES {amount} - {self.status}"

    def mark_completed(self, receipt_number=None, metadata=None):
        self.status = 'completed'
        if receipt_number:
            self.mpesa_receipt_number = receipt_number
        if metadata:
            self.callback_metadata = metadata
        self.updated_at = timezone.now()
        self.save(update_fields=['status', 'mpesa_receipt_number', 'callback_metadata', 'updated_at'])

        # Activate subscription
        if self.subscription:
            self.subscription.active = True
            self.subscription.last_payment_at = timezone.now()
            self.subscription.save(update_fields=['active', 'last_payment_at'])

        # Set user premium
        self.user.is_premium = True
        self.user.save(update_fields=['is_premium'])

    def mark_failed(self, reason=""):
        self.status = 'failed'
        self.failure_reason = reason
        self.updated_at = timezone.now()
        self.save(update_fields=['status', 'failure_reason', 'updated_at'])


# NEW: Store raw callbacks for debugging (like your desired style)
class MpesaCallback(models.Model):
    payment = models.ForeignKey(
        Payment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='callbacks'
    )
    raw_data = models.JSONField()
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-received_at']

    def __str__(self):
        return f"Callback {self.received_at} → {self.payment or 'Unmatched'}"


# NEW: Simple transaction log (quick lookup by receipt)
class Transaction(models.Model):
    payment = models.OneToOneField(
        Payment,
        on_delete=models.CASCADE,
        related_name='transaction'
    )
    phonenumber = models.CharField(max_length=20)
    amount = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    receipt_no = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.receipt_no} - KES {self.amount}"