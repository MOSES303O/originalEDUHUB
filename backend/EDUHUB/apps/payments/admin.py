# payments/admin.py — FINAL GOLD STANDARD
from django.contrib import admin
from django.utils.html import format_html
from .models import Payment, Subscription, MpesaCallback, Transaction

# Global branding
admin.site.site_header = "EDUHUB Payment Administration"
admin.site.site_title = "EDUHUB Payments"
admin.site.index_title = "Payment Management Dashboard"

@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'plan_display', 'start_date', 'end_date', 'active', 'is_renewal_eligible', 'last_payment_at')
    list_filter = ('plan', 'active', 'is_renewal_eligible', 'start_date')
    search_fields = ('user__phone_number', 'plan_display')
    readonly_fields = ('start_date',  'last_payment_at')

    def plan_display(self, obj):
        return obj.get_plan_display()
    plan_display.short_description = "Plan"

    def has_add_permission(self, request):
        return True  # Subscriptions created via payment only

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('reference', 'user_link', 'amount', 'subscription_type', 'status_display', 'payment_method', 'created_at')
    list_filter = ('status', 'payment_method', 'subscription_type', 'created_at')
    search_fields = ('reference', 'user__phone_number','mpesa_receipt_number')
    readonly_fields = ('created_at', 'updated_at', 'checkout_request_id', 'callback_metadata')
    autocomplete_fields = ('user', 'subscription')

    def user_link(self, obj):
        if obj.user:  # ← Safe check
            url = f"/admin/authentication/user/{obj.user.id}/"
            phone = obj.user.phone_number or "No phone"
            return format_html('<a href="{}">{}</a>', url, phone)
        return "Pending (no user yet)"  # ← Fallback text
    user_link.short_description = "User"

    def status_display(self, obj):
        color = {
            'completed': '#16a34a',
            'pending': '#ca8a04',
            'failed': '#dc2626',
        }.get(obj.status, '#6b7280')
        return format_html('<b style="color:{};">{}</b>', color, obj.get_status_display())
    status_display.short_description = "Status"

    def subscription_type(self, obj):
        if obj.subscription_type:
            return obj.get_subscription_type_display()
        return "-"
    subscription_type.short_description = "Plan Type"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'subscription')
    
@admin.register(MpesaCallback)
class MpesaCallbackAdmin(admin.ModelAdmin):
    list_display = ('payment', 'received_at')
    search_fields = ('payment__reference', 'payment__mpesa_receipt_number')
    readonly_fields = ('payment', 'raw_data', 'received_at')
    date_hierarchy = 'received_at'

    def has_add_permission(self, request):
        return False


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('receipt_no', 'phonenumber', 'amount', 'payment', 'created_at')
    search_fields = ('receipt_no', 'phonenumber', 'payment__reference')
    readonly_fields = ('payment', 'created_at')
    date_hierarchy = 'created_at'

    def has_add_permission(self, request):
        return False