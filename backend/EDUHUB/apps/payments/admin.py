from django.contrib import admin
from django.utils.html import format_html
from .models import (
    PaymentMethod, Subscription, UserSubscription,
    Payment, MpesaTransaction, PaymentNotification
)


@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'processing_fee_percentage', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'code']
    readonly_fields = ['id', 'created_at']


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ['name', 'price', 'duration_days', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(UserSubscription)
class UserSubscriptionAdmin(admin.ModelAdmin):
    autocomplete_fields = ['user']
    list_display = ['user', 'subscription', 'start_date', 'end_date', 'is_active', 'is_expired']
    list_filter = ['is_active', 'auto_renew', 'start_date', 'end_date']
    search_fields = ['user__email', 'subscription__name']
    readonly_fields = ['id', 'created_at', 'is_expired']
    autocomplete_fields = ['user', 'subscription']

    def is_expired(self, obj):
        return obj.is_expired
    is_expired.boolean = True
    is_expired.short_description = 'Expired'


class MpesaTransactionInline(admin.StackedInline):
    model = MpesaTransaction
    extra = 0
    readonly_fields = [
        'checkout_request_id', 'merchant_request_id', 'mpesa_receipt_number',
        'transaction_date', 'result_code', 'result_desc', 'created_at', 'updated_at'
    ]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    autocomplete_fields = ['user']
    list_display = [
        'transaction_id', 'user', 'payment_method', 'amount', 'total_amount',
        'status', 'payment_type', 'initiated_at', 'completed_at'
    ]
    list_filter = ['status', 'payment_type', 'payment_method', 'initiated_at']
    search_fields = ['transaction_id', 'user__email', 'external_transaction_id']
    readonly_fields = [
        'id', 'transaction_id', 'processing_fee', 'total_amount',
        'initiated_at', 'completed_at', 'updated_at'
    ]
    autocomplete_fields = ['user', 'payment_method', 'subscription']
    inlines = [MpesaTransactionInline]

    fieldsets = (
        ('Payment Details', {
            'fields': ('transaction_id', 'user', 'payment_method', 'amount', 
                      'processing_fee', 'total_amount', 'currency')
        }),
        ('Transaction Info', {
            'fields': ('external_transaction_id', 'reference_number', 'status', 
                      'payment_type', 'subscription')
        }),
        ('Description & Metadata', {
            'fields': ('description', 'metadata')
        }),
        ('Timestamps', {
            'fields': ('initiated_at', 'completed_at', 'updated_at')
        }),
    )

    def get_readonly_fields(self, request, obj=None):
        if obj:  # Editing existing object
            return self.readonly_fields + ['user', 'payment_method', 'amount']
        return self.readonly_fields


@admin.register(MpesaTransaction)
class MpesaTransactionAdmin(admin.ModelAdmin):
    list_display = [
        'payment', 'phone_number', 'mpesa_receipt_number', 
        'result_code', 'transaction_date', 'created_at'
    ]
    list_filter = ['result_code', 'transaction_date', 'created_at']
    search_fields = [
        'payment__transaction_id', 'phone_number', 'mpesa_receipt_number',
        'checkout_request_id', 'merchant_request_id'
    ]
    readonly_fields = ['id', 'created_at', 'updated_at']
    autocomplete_fields = ['payment']


@admin.register(PaymentNotification)
class PaymentNotificationAdmin(admin.ModelAdmin):
    list_display = [
        'payment', 'notification_type', 'processed', 'received_at', 'processed_at'
    ]
    list_filter = ['notification_type', 'processed', 'received_at']
    search_fields = ['payment__transaction_id', 'notification_type']
    readonly_fields = ['id', 'received_at', 'processed_at']
    autocomplete_fields = ['payment']

    def get_readonly_fields(self, request, obj=None):
        if obj:  # Editing existing object
            return self.readonly_fields + ['payment', 'notification_type', 'raw_data']
        return self.readonly_fields