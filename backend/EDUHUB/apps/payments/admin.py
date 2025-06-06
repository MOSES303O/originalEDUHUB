import json
from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.urls import reverse
from django.db.models import Count, Sum
from django.utils import timezone
from datetime import timedelta
from .models import (
    PaymentWebhook, 
    Payment, 
    Subscription
)

@admin.register(PaymentWebhook)
class PaymentWebhookAdmin(admin.ModelAdmin):
    """
    Admin interface for managing payment webhooks.
    Allows inspection of raw and processed data for troubleshooting and auditing.
    """
    list_display = [
        'webhook_id',
        'source',
        'event_type',
        'status_badge',
        'payment_link',
        'received_at',
        'processed_at'
    ]
    list_filter = [
        'source',
        'event_type',
        'status',
        'received_at',
        'processed_at'
    ]
    search_fields = [
        'webhook_id',
        'source',
        'event_type',
        'payment__reference',
        'ip_address',
        'user_agent'
    ]
    readonly_fields = [
        'webhook_id',
        'source',
        'event_type',
        'raw_data_display',
        'processed_data_display',
        'status',
        'error_message',
        'payment',
        'received_at',
        'processed_at',
        'ip_address',
        'user_agent'
    ]
    date_hierarchy = 'received_at'

    fieldsets = (
        ('Webhook Metadata', {
            'fields': (
                'webhook_id',
                'source',
                'event_type',
                'status',
                'error_message',
                'payment',
            )
        }),
        ('Raw & Processed Data', {
            'fields': (
                'raw_data_display',
                'processed_data_display',
            ),
            'classes': ('collapse',)
        }),
        ('Request Info', {
            'fields': (
                'ip_address',
                'user_agent',
            ),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': (
                'received_at',
                'processed_at',
            ),
            'classes': ('collapse',)
        }),
    )

    def raw_data_display(self, obj):
        """Display formatted raw webhook data."""
        import json
        if obj.raw_data:
            try:
                formatted = json.dumps(obj.raw_data, indent=2)
                return format_html('<pre>{}</pre>', formatted)
            except Exception:
                return obj.raw_data
        return "No raw data"
    raw_data_display.short_description = "Raw Webhook Data"

    def processed_data_display(self, obj):
        """Display formatted processed webhook data."""
        import json
        if obj.processed_data:
            try:
                formatted = json.dumps(obj.processed_data, indent=2)
                return format_html('<pre>{}</pre>', formatted)
            except Exception:
                return obj.processed_data
        return "No processed data"
    processed_data_display.short_description = "Processed Data"

    def status_badge(self, obj):
        """Display webhook status with color-coded badge."""
        colors = {
            'received': '#17a2b8',
            'processing': '#ffc107',
            'processed': '#28a745',
            'failed': '#dc3545',
            'ignored': '#6c757d',
        }
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = "Status"
    status_badge.admin_order_field = "status"

    def payment_link(self, obj):
        """Link to the related payment if available."""
        if obj.payment:
            url = f"/admin/payments/payment/{obj.payment.id}/change/"
            return format_html('<a href="{}">{}</a>', url, obj.payment.reference)
        return "-"
    payment_link.short_description = "Payment"
    payment_link.admin_order_field = "payment__reference"

    def get_queryset(self, request):
        """Optimize queryset."""
        return super().get_queryset(request).select_related('payment')


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    """
    Admin interface for managing payments.
    Provides detailed payment tracking with M-Pesa integration details.
    """
    list_display = [
        'reference_number',
        'user_link',
        'amount_display',
        'status_badge',
        'payment_method',
        'mpesa_receipt',
        'created_at'
    ]
    list_filter = [
        'status',
        'payment_method',
        'created_at',
        'updated_at'
    ]
    search_fields = [
        'reference_number',
        'user__email',
        'user__first_name',
        'user__last_name',
        'mpesa_receipt_number',
        'phone_number'
    ]
    readonly_fields = [
        'reference_number',
        'created_at',
        'updated_at',
        'mpesa_response_display',
        'callback_data_display'
    ]
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Payment Information', {
            'fields': (
                'reference_number',
                'user',
                'subscription_plan',
                'amount',
                'status'
            )
        }),
        ('M-Pesa Details', {
            'fields': (
                'payment_method',
                'phone_number',
                'mpesa_checkout_request_id',
                'mpesa_receipt_number',
                'mpesa_response_display'
            )
        }),
        ('Callback Information', {
            'fields': ('callback_data_display',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def user_link(self, obj):
        """Create clickable link to user admin page."""
        if obj.user:
            url = reverse('admin:authentication_user_change', args=[obj.user.pk])
            return format_html('<a href="{}">{}</a>', url, obj.user.get_full_name() or obj.user.email)
        return "No User"
    user_link.short_description = "User"
    user_link.admin_order_field = "user__email"
    
    def amount_display(self, obj):
        """Display formatted amount with currency."""
        return f"KES {obj.amount:,.2f}"
    amount_display.short_description = "Amount"
    amount_display.admin_order_field = "amount"
    
    def status_badge(self, obj):
        """Display status with color coding."""
        colors = {
            'pending': '#ffc107',
            'completed': '#28a745',
            'failed': '#dc3545',
            'cancelled': '#6c757d'
        }
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = "Status"
    status_badge.admin_order_field = "status"
    
    def mpesa_receipt(self, obj):
        """Display M-Pesa receipt number if available."""
        if obj.mpesa_receipt_number:
            return obj.mpesa_receipt_number
        return "-"
    mpesa_receipt.short_description = "M-Pesa Receipt"
    
    def mpesa_response_display(self, obj):
        """Display formatted M-Pesa response data."""
        if obj.mpesa_response:
            try:
                if isinstance(obj.mpesa_response, str):
                    data = json.loads(obj.mpesa_response)
                else:
                    data = obj.mpesa_response
                formatted = json.dumps(data, indent=2)
                return format_html('<pre>{}</pre>', formatted)
            except (json.JSONDecodeError, TypeError):
                return obj.mpesa_response
        return "No response data"
    mpesa_response_display.short_description = "M-Pesa Response"
    
    def callback_data_display(self, obj):
        """Display formatted callback data."""
        if obj.callback_data:
            try:
                if isinstance(obj.callback_data, str):
                    data = json.loads(obj.callback_data)
                else:
                    data = obj.callback_data
                formatted = json.dumps(data, indent=2)
                return format_html('<pre>{}</pre>', formatted)
            except (json.JSONDecodeError, TypeError):
                return obj.callback_data
        return "No callback data"
    callback_data_display.short_description = "Callback Data"
    
    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related('user', 'subscription_plan')


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    """
    Admin interface for managing user subscriptions.
    Provides subscription lifecycle management and usage tracking.
    """
    list_display = [
        'user_link',
        'plan_name',
        'status_badge',
        'start_date',
        'end_date',
        'usage_display',
        'is_active_display'
    ]
    list_filter = ['status', 'plan', 'start_date', 'end_date']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'plan']
    readonly_fields = [
        'created_at',
        'updated_at',
        'usage_summary',
        'remaining_quota'
    ]
    date_hierarchy = 'start_date'
    
    fieldsets = (
        ('Subscription Details', {
            'fields': (
                'user',
                'plan',
                'status',
                'is_active'
            )
        }),
        ('Duration', {
            'fields': (
                'start_date',
                'end_date'
            )
        }),
        ('Usage Tracking', {
            'fields': (
                'courses_selected',
                'applications_made',
                'usage_summary',
                'remaining_quota'
            )
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def user_link(self, obj):
        """Create clickable link to user admin page."""
        url = reverse('admin:authentication_user_change', args=[obj.user.pk])
        return format_html('<a href="{}">{}</a>', url, obj.user.get_full_name() or obj.user.email)
    user_link.short_description = "User"
    user_link.admin_order_field = "user__email"
    
    def plan_name(self, obj):
        """Display subscription plan name."""
        return obj.plan.name
    plan_name.short_description = "Plan"
    plan_name.admin_order_field = "plan__name"
    
    def status_badge(self, obj):
        """Display status with color coding."""
        colors = {
            'active': '#28a745',
            'expired': '#dc3545',
            'cancelled': '#6c757d',
            'pending': '#ffc107'
        }
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = "Status"
    status_badge.admin_order_field = "status"
    
    def usage_display(self, obj):
        """Display usage statistics."""
        return f"Courses: {obj.courses_selected}/{obj.plan.max_courses} | Apps: {obj.applications_made}/{obj.plan.max_applications}"
    usage_display.short_description = "Usage"
    
    def is_active_display(self, obj):
        """Display active status with icon."""
        if obj.is_active:
            return format_html('<span style="color: green;">✓ Active</span>')
        return format_html('<span style="color: red;">✗ Inactive</span>')
    is_active_display.short_description = "Active"
    is_active_display.admin_order_field = "is_active"
    
    def usage_summary(self, obj):
        """Display detailed usage summary."""
        total_courses = obj.plan.max_courses
        total_apps = obj.plan.max_applications
        
        course_percentage = (obj.courses_selected / total_courses * 100) if total_courses > 0 else 0
        app_percentage = (obj.applications_made / total_apps * 100) if total_apps > 0 else 0
        
        return format_html(
            '<div>'
            '<p><strong>Courses:</strong> {}/{} ({:.1f}%)</p>'
            '<p><strong>Applications:</strong> {}/{} ({:.1f}%)</p>'
            '</div>',
            obj.courses_selected, total_courses, course_percentage,
            obj.applications_made, total_apps, app_percentage
        )
    usage_summary.short_description = "Usage Summary"
    
    def remaining_quota(self, obj):
        """Display remaining quota."""
        remaining_courses = max(0, obj.plan.max_courses - obj.courses_selected)
        remaining_apps = max(0, obj.plan.max_applications - obj.applications_made)
        
        return format_html(
            '<div>'
            '<p><strong>Courses remaining:</strong> {}</p>'
            '<p><strong>Applications remaining:</strong> {}</p>'
            '</div>',
            remaining_courses, remaining_apps
        )
    remaining_quota.short_description = "Remaining Quota"
    
    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related('user', 'plan')


# Custom admin site configuration
#COME HERE APPLY THIS TO ALL THE OTHER ADMINS
admin.site.site_header = "EDUHUB Payment Administration"
admin.site.site_title = "EDUHUB Payments"
admin.site.index_title = "Payment Management Dashboard"