import json
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import PaymentWebhook, Payment,SubscriptionPlan, Subscription, UserSubscription

# Global branding
admin.site.site_header = "EDUHUB Payment Administration"
admin.site.site_title = "EDUHUB Payments"
admin.site.index_title = "Payment Management Dashboard"

@admin.register(PaymentWebhook)
class PaymentWebhookAdmin(admin.ModelAdmin):
    list_display = ['payment_link', 'received_at']
    list_filter = ['received_at']
    search_fields = ['payment__mpesa_receipt_number']
    readonly_fields = ['payment', 'raw_data_display', 'received_at']

    fieldsets = (
        ('Webhook Data', {'fields': ('payment',)}),
        ('Raw Data', {'fields': ('raw_data_display',), 'classes': ('collapse',)}),
        ('Timestamps', {'fields': ('received_at',), 'classes': ('collapse',)}),
    )

    def raw_data_display(self, obj):
        try:
            return format_html('<pre>{}</pre>', json.dumps(obj.raw_data, indent=2))
        except Exception:
            return obj.raw_data or "No raw data"
    raw_data_display.short_description = "Raw Webhook Data"

    def payment_link(self, obj):
        if obj.payment:
            try:
                url = reverse('admin:payments_payment_change', args=[obj.payment.id])
                return format_html('<a href="{}">Payment #{}</a>', url, obj.payment.id)
            except Exception:
                return str(obj.payment)
        return "-"
    payment_link.short_description = "Payment"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('payment')

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = [
        'user_link',
        'amount_display',
        'status_badge',
        'payment_method',
        'mpesa_receipt',
        'created_at',
    ]
    list_filter = ['status', 'payment_method', 'created_at', 'updated_at']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'mpesa_receipt_number']
    readonly_fields = ['created_at', 'updated_at', 'mpesa_response_display', 'callback_data_display']
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Payment Information', {
            'fields': ('user', 'amount', 'status')
        }),
        ('M-Pesa Details', {
            'fields': ('payment_method', 'phone_number', 'mpesa_receipt_number', 'mpesa_response_display')
        }),
        ('Callback Information', {
            'fields': ('callback_data_display',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def user_link(self, obj):
        if obj.user:
            try:
                url = reverse('admin:authentication_user_change', args=[obj.user.pk])
                return format_html('<a href="{}">{}</a>', url, obj.user.get_full_name() or obj.user.email)
            except Exception:
                return str(obj.user)
        return "No User"
    user_link.short_description = "User"
    user_link.admin_order_field = "user__email"

    def amount_display(self, obj):
        return f"KES {obj.amount:,.2f}"
    amount_display.short_description = "Amount"

    def status_badge(self, obj):
        colors = {
            'pending': '#ffc107',
            'completed': '#28a745',
            'failed': '#dc3545',
            'cancelled': '#6c757d',
        }
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="color:{}; font-weight:bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = "Status"

    def mpesa_receipt(self, obj):
        return obj.mpesa_receipt_number or "-"
    mpesa_receipt.short_description = "M-Pesa Receipt"

    def mpesa_response_display(self, obj):
        try:
            data = json.loads(obj.callback_metadata) if isinstance(obj.callback_metadata, str) else obj.callback_metadata
            return format_html('<pre>{}</pre>', json.dumps(data, indent=2))
        except Exception:
            return obj.callback_metadata or "No response data"
    mpesa_response_display.short_description = "M-Pesa Response"

    def callback_data_display(self, obj):
        try:
            data = json.loads(obj.callback_metadata) if isinstance(obj.callback_metadata, str) else obj.callback_metadata
            return format_html('<pre>{}</pre>', json.dumps(data, indent=2))
        except Exception:
            return obj.callback_metadata or "No callback data"
    callback_data_display.short_description = "Callback Data"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')

@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'price', 'duration_hours', 'renewal_price', 'renewal_grace_period_hours')
    search_fields = ('name',)
    list_filter = ('duration_hours', 'renewal_grace_period_hours')
@admin.register(UserSubscription)
class UserSubscriptionAdmin(admin.ModelAdmin):
    list_display = [
        'user_link', 'subscription_name', 'amount_paid_display', 'is_current_display'
    ]
    # Removed 'is_current_display' from list_filter (not a model field)
    search_fields = ['subscription_type__name']
    readonly_fields = ['current_subscription']

    def user_link(self, obj):
        if obj.user:
            url = reverse('admin:authentication_user_change', args=[obj.user.pk])
            return format_html('<a href="{}">{}</a>', url, obj.user.get_full_name() or obj.user.email)
        return "No User"
    user_link.short_description = "User"

    def subscription_name(self, obj):
        if obj.current_subscription and obj.current_subscription.plan:
            return obj.current_subscription.plan.name
        return "-"
    subscription_name.short_description = "Subscription"

    def amount_paid_display(self, obj):
        if obj.current_subscription and obj.current_subscription.plan:
            return f"KES {obj.current_subscription.plan.price:,.2f}"
        return "-"
    amount_paid_display.short_description = "Amount Paid"

    def is_current_display(self, obj):
        try:
            return obj.is_current()  # Ensure this method exists on the model
        except Exception:
            return False
    is_current_display.boolean = True
    is_current_display.short_description = "Currently Active"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user','current_subscription')

@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = [
        'user_link', 'plan_name', 'active_badge',
        'start_date', 'end_date'
    ]
    list_filter = ['plan', 'start_date', 'end_date']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'plan__name']
    readonly_fields = ['start_date']  # These are actual model fields
    date_hierarchy = 'start_date'

    fieldsets = (
        ('Subscription Details', {'fields': ('user', 'plan', 'active')}),
        ('Duration', {'fields': ('start_date', 'end_date')}),
        # You can add metadata fields if you have them
    )

    def user_link(self, obj):
        if obj.user:
            url = reverse('admin:authentication_user_change', args=[obj.user.pk])
            return format_html('<a href="{}">{}</a>', url, obj.user.get_full_name() or obj.user.email)
        return "-"
    user_link.short_description = "User"

    def plan_name(self, obj):
        return obj.plan.name if obj.plan else "-"
    plan_name.short_description = "Plan"

    def active_badge(self, obj):
        color = "#28a745" if obj.is_active() else "#dc3545"
        label = "✓ Active" if obj.is_active() else "✗ Inactive"
        return format_html('<span style="color:{};">{}</span>', color, label)
    active_badge.short_description = "Status"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'plan')