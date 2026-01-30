from django.urls import path
from .views import (
    PaymentInitiationView,
    MpesaCallbackView,
    ActiveSubscriptionView,
    PaymentStatusView,
    RenewSubscriptionView
)

urlpatterns = [
    # Individual APIViews
    path('my-subscriptions/active', ActiveSubscriptionView.as_view(), name='subscription-status-active'),
    path('initiate/', PaymentInitiationView.as_view(), name='payment-initiate'),
    path('mpesa/callback/', MpesaCallbackView.as_view(), name='mpesa-callback'),
    path('status/<str:reference>/', PaymentStatusView.as_view(), name='payment-status'),
    path('renew/', RenewSubscriptionView.as_view(), name='subscription-renew'),
]