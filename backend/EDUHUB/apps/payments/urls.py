"""
Payment URL configuration for EduPathway platform.
"""

from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views
from .views import SubscriptionViewSet,UserSubscriptionViewSet,PaymentViewSet  # explicitly import your ViewSet

app_name = 'payments'

# DRF router for SubscriptionViewSet
router = DefaultRouter()
router.register(r'plans/',SubscriptionViewSet, basename='subscription')
router.register(r'subscription/',UserSubscriptionViewSet, basename='user-subscription')
router.register(r'history/', PaymentViewSet, basename='payment-history')

urlpatterns = [
    # User subscription
    path('subscription/status/', views.SubscriptionStatusView.as_view(), name='subscription-status'),

    # Payments
    path('initiate/', views.PaymentInitiationView.as_view(), name='payment-initiate'),
    path('verify/', views.PaymentVerificationView.as_view(), name='payment-verify'),
    # M-Pesa callbacks
    path('callback/', views.MpesaCallbackView.as_view(), name='mpesa-callback'),

    # Legacy endpoints (for compatibility)
    #remember this test
    #path('test/', views.index, name='payment-test'),
]

# Include the router URLs
urlpatterns += router.urls
