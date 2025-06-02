from django.urls import path
from . import views

app_name = 'payments'

urlpatterns = [
    # Payment methods and subscriptions
    path('payment-methods/', views.PaymentMethodListView.as_view(), name='payment-methods'),
    path('subscriptions/', views.SubscriptionListView.as_view(), name='subscriptions'),
    
    # User-specific endpoints
    path('user/subscriptions/', views.UserSubscriptionListView.as_view(), name='user-subscriptions'),
    path('user/payments/', views.UserPaymentListView.as_view(), name='user-payments'),
    
    # Payment processing
    path('mpesa/initiate/', views.initiate_mpesa_payment, name='mpesa-initiate'),
    path('mpesa/callback/', views.mpesa_callback, name='mpesa-callback'),
    path('verify/', views.verify_payment, name='verify-payment'),
    path('subscribe/', views.subscribe, name='subscribe'),
]