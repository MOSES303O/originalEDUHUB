from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SubscriptionViewSet,
    SubscriptionStatusView,
    PaymentViewSet,
    PaymentInitiationView,
    MpesaCallbackView,
    UserSubscriptionViewSet,
    PaymentVerificationView
)

router = DefaultRouter()
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'my-subscriptions', UserSubscriptionViewSet, basename='user-subscription')

urlpatterns = [
    path('', include(router.urls)),

    # Individual APIViews
    path('subscriptions/', SubscriptionViewSet.as_view(), name='subscription'),
    path('subscription-status/', SubscriptionStatusView.as_view(), name='subscription-status'),
    path('payment/initiate/', PaymentInitiationView.as_view(), name='payment-initiate'),
    path('mpesa/callback/', MpesaCallbackView.as_view(), name='mpesa-callback'),
    path('payment/verify/<str:reference>/', PaymentVerificationView.as_view(), name='payment-verify')
]
