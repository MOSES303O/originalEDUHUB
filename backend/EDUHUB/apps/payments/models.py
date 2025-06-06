"""
Payment models for the EduPathway platform.

This module contains all payment-related models including
Payment, Subscription, and related entities. All models are
designed to work consistently with authentication and core utils.
"""

from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
from apps.core.utils import generate_reference, format_currency
from apps.authentication.models import User
from django.conf import settings


class Payment(models.Model):
    """
    Payment transaction model.

    Tracks all payment transactions including M-Pesa payments,
    subscription payments, and other financial transactions.
    """

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
        ('expired', 'Expired'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('mpesa', 'M-Pesa'),
        ('card', 'Credit/Debit Card'),
        ('bank_transfer', 'Bank Transfer'),
        ('paypal', 'PayPal'),
        ('other', 'Other'),
    ]

    PAYMENT_TYPE_CHOICES = [
        ('subscription', 'Subscription'),
        ('course_fee', 'Course Fee'),
        ('application_fee', 'Application Fee'),
        ('consultation', 'Consultation'),
        ('other', 'Other'),
    ]

    # Payment identification
    reference_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique payment reference number"
    )
    external_reference = models.CharField(
        max_length=100,
        blank=True,
        help_text="External payment gateway reference"
    )

    # Payment details
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='payments'
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Payment amount"
    )
    currency = models.CharField(
        max_length=3,
        default='KES',
        help_text="Payment currency"
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        help_text="Payment method used"
    )
    payment_type = models.CharField(
        max_length=20,
        choices=PAYMENT_TYPE_CHOICES,
        help_text="Type of payment"
    )

    # Status and processing
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        db_index=True,
        help_text="Current payment status"
    )
    description = models.TextField(
        help_text="Payment description"
    )

    # M-Pesa specific fields
    phone_number = models.CharField(
        max_length=15,
        blank=True,
        help_text="Phone number for M-Pesa payments"
    )
    mpesa_receipt_number = models.CharField(
        max_length=50,
        blank=True,
        help_text="M-Pesa receipt number"
    )
    mpesa_transaction_id = models.CharField(
        max_length=50,
        blank=True,
        help_text="M-Pesa transaction ID"
    )

    # Gateway response data
    gateway_response = models.JSONField(
        default=dict,
        blank=True,
        help_text="Payment gateway response data"
    )

    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="Payment creation time"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Last update time"
    )
    completed_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Payment completion time"
    )
    expires_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Payment expiration time"
    )
    next_billing_date = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Next billing date"
    )

    # Subscription-related
    user_subscription = models.ForeignKey(
        'UserSubscription',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments',
        help_text="Related user subscription"
    )
    last_payment = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='subscription_payments',
        help_text="Last payment for this subscription"
    )
    auto_renew = models.BooleanField(
        default=True,
        help_text="Whether subscription auto-renews"
    )
    cancelled_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Subscription cancellation date"
    )

    # Metadata
    ip_address = models.GenericIPAddressField(
        blank=True,
        null=True,
        help_text="User's IP address during payment"
    )
    user_agent = models.TextField(
        blank=True,
        help_text="User's browser user agent"
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional payment metadata"
    )

    class Meta:
        db_table = 'payment'
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['reference_number']),
            models.Index(fields=['payment_method']),
            models.Index(fields=['created_at']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['next_billing_date']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.reference_number} - {self.user.email} - {format_currency(self.amount, self.currency)}"

    def save(self, *args, **kwargs):
        """Generate reference number if not provided."""
        if not self.reference_number:
            self.reference_number = generate_reference('PAY')
        super().save(*args, **kwargs)

    @property
    def formatted_amount(self):
        """Return formatted amount with currency."""
        return format_currency(self.amount, self.currency)

    def mark_completed(self, external_reference=None, receipt_number=None):
        """Mark payment as completed."""
        self.status = 'completed'
        self.completed_at = timezone.now()
        if external_reference:
            self.external_reference = external_reference
        if receipt_number:
            self.mpesa_receipt_number = receipt_number
        self.save()

    def mark_failed(self, error_message=None):
        """Mark payment as failed."""
        self.status = 'failed'
        if error_message:
            self.metadata['error_message'] = error_message
        self.save()

class SubscriptionPlan(models.Model):
    """
    Defines the various subscription plans available in the platform.
    """

    name = models.CharField(
        max_length=100,
        unique=True,
        help_text="Name of the subscription plan"
    )

    description = models.TextField(
        blank=True,
        help_text="Detailed description of the plan"
    )

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Price of the subscription in KES"
    )

    duration_days = models.PositiveIntegerField(
        help_text="Duration of the plan in days"
    )

    features = models.JSONField(
        default=dict,
        blank=True,
        help_text="JSON object describing features included in the plan"
    )

    max_course_selections = models.PositiveIntegerField(
        default=0,
        help_text="Maximum number of courses a user can select under this plan"
    )

    max_applications = models.PositiveIntegerField(
        default=0,
        help_text="Maximum number of course applications allowed under this plan"
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Whether this plan is currently active and available for users"
    )

    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="subscription creation time"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Last update time"
    )

    class Meta:
        db_table = "subscription_plan"
        verbose_name = "Subscription Plan"
        verbose_name_plural = "Subscription Plans"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} - {self.price} KES ({self.duration_days} days)"


class Subscription(models.Model):
    """
    User subscription model.
    
    Manages user subscriptions for premium features,
    course access, and other paid services.
    """
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('cancelled', 'Cancelled'),
        ('expired', 'Expired'),
        ('suspended', 'Suspended'),
    ]
    
    PLAN_CHOICES = [
        ('basic', 'Basic Plan'),
        ('premium', 'Premium Plan'),
        ('pro', 'Pro Plan'),
        ('enterprise', 'Enterprise Plan'),
    ]
    
    BILLING_CYCLE_CHOICES = [
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('yearly', 'Yearly'),
        ('lifetime', 'Lifetime'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='subscriptions'
    )
    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="Payment creation time"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Last update time"
    )
    plan = models.CharField(
        max_length=20,
        choices=PLAN_CHOICES,
        help_text="Subscription plan"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='inactive',
        db_index=True,
        help_text="Subscription status"
    )
    billing_cycle = models.CharField(
        max_length=20,
        choices=BILLING_CYCLE_CHOICES,
        help_text="Billing cycle"
    )
    
    # Pricing
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Subscription amount"
    )
    currency = models.CharField(
        max_length=3,
        default='KES',
        help_text="Subscription currency"
    )
    
    # Subscription period
    start_date = models.DateTimeField(
        help_text="Subscription start date"
    )
    end_date = models.DateTimeField(
        help_text="Subscription end date"
    )
    def activate(self):
        """Activate the subscription."""
        self.status = 'active'
        self.save()
        
        # Update user premium status
        self.user.is_premium = True
        self.user.save()
    
    def cancel(self):
        """Cancel the subscription."""
        self.status = 'cancelled'
        self.cancelled_at = timezone.now()
        self.auto_renew = False
        self.save()
        
        # Check if user has other active subscriptions
        if not self.user.subscriptions.filter(status='active').exists():
            self.user.is_premium = False
            self.user.save()
    
    def extend(self, days):
        """Extend subscription by specified days."""
        self.end_date += timezone.timedelta(days=days)
        self.save()
    def update_status(self):
        """
        Dynamically evaluate and update the status of the subscription based on
        dates and other business logic.
        """
        now = timezone.now()

        # Cancelled or Suspended subscriptions are not auto-updated
        if self.status in ['cancelled', 'suspended']:
            return self.status

        if self.start_date <= now < self.end_date:
            if self.status != 'active':
                self.status = 'active'
                self.user.is_premium = True
                self.user.save()
        elif now >= self.end_date:
            self.status = 'expired'
            self.user.is_premium = False
            self.user.save()
        else:
            self.status = 'inactive'
            self.user.is_premium = False
            self.user.save()

        self.save()
        return self.status

class UserSubscription(models.Model):
    """
    Tracks individual user's subscription details.
    """
    def get_today():
        return timezone.now().date()

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='user_subscriptions'
    )
    
    subscription_type = models.ForeignKey(
        Subscription,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Type of subscription the user has"
    )

    start_date = models.DateField(
    default=get_today,
    help_text="Subscription start date"
    )

    end_date = models.DateField(
        help_text="Subscription end date"
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Is this subscription currently active?"
    )

    amount_paid = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Amount paid for the subscription"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )
    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        db_table = 'user_subscription'
        verbose_name = 'User Subscription'
        verbose_name_plural = 'User Subscriptions'
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.user} - {self.subscription_type} ({self.start_date} to {self.end_date})"

    def is_current(self):
        """Return whether the subscription is currently valid."""
        today = timezone.now().date()
        return self.is_active and self.start_date <= today < self.end_date



class PaymentCallback(models.Model):
    """
    Stores M-Pesa STK Push callback data for post-payment confirmation.
    
    Complements PaymentWebhook by specifically capturing callback response 
    tied to Payment instances triggered by STK Push.
    """

    # Reference to the Payment object (can be null until matched)
    payment = models.ForeignKey(
        'Payment',
        on_delete=models.SET_NULL,
        related_name='callbacks',
        blank=True,
        null=True,
        help_text="Payment linked to this callback, if matched"
    )

    # Unique ID to correlate with STK Push request
    checkout_request_id = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text="Unique ID from the payment gateway (e.g. M-Pesa CheckoutRequestID)"
    )

    # M-Pesa STK Push response fields
    result_code = models.IntegerField(
        help_text="Result code from the gateway (0 = success)"
    )
    result_description = models.TextField(
        help_text="Human-readable description of the result"
    )

    # Raw and structured data
    raw_payload = models.JSONField(
        help_text="Full raw JSON payload received from the gateway"
    )
    processed_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Parsed/processed fields from the raw payload"
    )

    # Callback processing state
    is_processed = models.BooleanField(
        default=False,
        help_text="Whether this callback has been fully handled"
    )
    error_message = models.TextField(
        blank=True,
        help_text="Error message during processing, if any"
    )

    # Timestamps
    received_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="When the callback was received"
    )
    processed_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="When the callback was processed"
    )

    class Meta:
        db_table = 'payment_callback'
        verbose_name = 'Payment Callback'
        verbose_name_plural = 'Payment Callbacks'
        ordering = ['-received_at']
        indexes = [
            models.Index(fields=['checkout_request_id']),
            models.Index(fields=['result_code']),
            models.Index(fields=['received_at']),
            models.Index(fields=['is_processed']),
        ]

    def __str__(self):
        return f"{self.checkout_request_id} - {self.result_code}"

    def mark_processed(self, payment=None):
        """
        Marks this callback as processed and optionally links it to a Payment.
        """
        self.is_processed = True
        self.processed_at = timezone.now()
        if payment:
            self.payment = payment
        self.save()

    def mark_failed(self, error_message):
        """
        Marks this callback as failed with an error.
        """
        self.is_processed = False
        self.error_message = error_message
        self.processed_at = timezone.now()
        self.save()


class PaymentWebhook(models.Model):
    """
    Payment webhook model for tracking external payment notifications.
    
    Stores webhook data from payment gateways like M-Pesa
    for processing and reconciliation.
    """
    
    STATUS_CHOICES = [
        ('received', 'Received'),
        ('processing', 'Processing'),
        ('processed', 'Processed'),
        ('failed', 'Failed'),
        ('ignored', 'Ignored'),
    ]
    
    # Webhook identification
    webhook_id = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text="Unique webhook identifier"
    )
    source = models.CharField(
        max_length=50,
        help_text="Webhook source (mpesa, paypal, etc.)"
    )
    event_type = models.CharField(
        max_length=50,
        help_text="Type of webhook event"
    )
    
    # Webhook data
    raw_data = models.JSONField(
        help_text="Raw webhook data"
    )
    processed_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Processed webhook data"
    )
    
    # Processing status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='received',
        db_index=True,
        help_text="Webhook processing status"
    )
    error_message = models.TextField(
        blank=True,
        help_text="Error message if processing failed"
    )
    
    # Related payment
    payment = models.ForeignKey(
        Payment,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='webhooks',
        help_text="Related payment if found"
    )
    
    # Timestamps
    received_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="Webhook received time"
    )
    processed_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Webhook processed time"
    )
    
    # Request metadata
    ip_address = models.GenericIPAddressField(
        blank=True,
        null=True,
        help_text="Source IP address"
    )
    user_agent = models.TextField(
        blank=True,
        help_text="User agent from webhook request"
    )
    
    class Meta:
        db_table = 'payment_webhook'
        verbose_name = 'Payment Webhook'
        verbose_name_plural = 'Payment Webhooks'
        indexes = [
            models.Index(fields=['webhook_id']),
            models.Index(fields=['source', 'event_type']),
            models.Index(fields=['status']),
            models.Index(fields=['received_at']),
        ]
        ordering = ['-received_at']
    
    def __str__(self):
        return f"{self.source} - {self.event_type} - {self.status}"
    
    def mark_processed(self, payment=None):
        """Mark webhook as processed."""
        self.status = 'processed'
        self.processed_at = timezone.now()
        if payment:
            self.payment = payment
        self.save()
    
    def mark_failed(self, error_message):
        """Mark webhook as failed."""
        self.status = 'failed'
        self.error_message = error_message
        self.save()
