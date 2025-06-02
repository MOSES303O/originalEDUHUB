# Create your models here.
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
import uuid
from decimal import Decimal

User = get_user_model()


class PaymentMethod(models.Model):
    """
    Model representing different payment methods
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    processing_fee_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        help_text="Processing fee as percentage of transaction amount"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Subscription(models.Model):
    """
    Model representing subscription plans
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    duration_days = models.PositiveIntegerField()
    features = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['price']

    def __str__(self):
        return f"{self.name} - KES {self.price}"


class UserSubscription(models.Model):
    """
    Model representing user subscriptions
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='subscriptions')
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE)
    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    auto_renew = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.end_date:
            self.end_date = self.start_date + timezone.timedelta(
                days=self.subscription.duration_days
            )
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        return timezone.now() > self.end_date

    def __str__(self):
        return f"{self.user.email} - {self.subscription.name}"


class Payment(models.Model):
    """
    Model representing payment transactions
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    ]

    PAYMENT_TYPE_CHOICES = [
        ('subscription', 'Subscription'),
        ('application_fee', 'Application Fee'),
        ('course_fee', 'Course Fee'),
        ('service_fee', 'Service Fee'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments')
    payment_method = models.ForeignKey(PaymentMethod, on_delete=models.CASCADE)
    
    # Payment details
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    processing_fee = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='KES')
    
    # Transaction details
    transaction_id = models.CharField(max_length=100, unique=True)
    external_transaction_id = models.CharField(max_length=100, blank=True, null=True)
    reference_number = models.CharField(max_length=50, blank=True)
    
    # Payment type and related objects
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPE_CHOICES)
    subscription = models.ForeignKey(
        UserSubscription, on_delete=models.CASCADE, 
        blank=True, null=True, related_name='payments'
    )
    
    # Status and metadata
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    description = models.TextField(blank=True)
    metadata = models.JSONField(default=dict)
    
    # Timestamps
    initiated_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-initiated_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['transaction_id']),
            models.Index(fields=['external_transaction_id']),
            models.Index(fields=['payment_type']),
        ]

    def save(self, *args, **kwargs):
        if not self.transaction_id:
            # Generate unique transaction ID
            self.transaction_id = f"TXN{timezone.now().strftime('%Y%m%d')}{self.user.id.hex[:8].upper()}"
        
        # Calculate total amount including processing fee
        if self.processing_fee == 0 and self.payment_method:
            fee_percentage = self.payment_method.processing_fee_percentage
            self.processing_fee = (self.amount * fee_percentage / 100).quantize(Decimal('0.01'))
        
        self.total_amount = self.amount + self.processing_fee
        
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.transaction_id} - {self.user.email} - KES {self.total_amount}"


class MpesaTransaction(models.Model):
    """
    Model specifically for M-Pesa transactions
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment = models.OneToOneField(Payment, on_delete=models.CASCADE, related_name='mpesa_transaction')
    
    # M-Pesa specific fields
    phone_number = models.CharField(max_length=15)
    account_reference = models.CharField(max_length=50)
    transaction_desc = models.CharField(max_length=100)
    
    # STK Push details
    checkout_request_id = models.CharField(max_length=100, blank=True)
    merchant_request_id = models.CharField(max_length=100, blank=True)
    
    # Response details
    mpesa_receipt_number = models.CharField(max_length=50, blank=True)
    transaction_date = models.DateTimeField(blank=True, null=True)
    result_code = models.CharField(max_length=10, blank=True)
    result_desc = models.TextField(blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"M-Pesa {self.payment.transaction_id} - {self.phone_number}"


class PaymentNotification(models.Model):
    """
    Model for storing payment notifications/webhooks
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='notifications')
    
    # Notification details
    notification_type = models.CharField(max_length=50)
    raw_data = models.JSONField()
    processed = models.BooleanField(default=False)
    processing_error = models.TextField(blank=True)
    
    # Timestamps
    received_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-received_at']

    def __str__(self):
        return f"{self.notification_type} - {self.payment.transaction_id}"