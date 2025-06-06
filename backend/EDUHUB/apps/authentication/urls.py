"""
Authentication URL patterns.
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from .views import UserProfileViewSet, PasswordChangeView

urlpatterns = [
    # Authentication endpoints
    path('register/', views.UserRegistrationView.as_view(), name='user_register'),
    path('login/', views.UserLoginView.as_view(), name='user_login'),
    path('logout/', views.UserLogoutView.as_view(), name='user_logout'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Profile endpoints
    path(
        'profile/',
        UserProfileViewSet.as_view({
            'get': 'retrieve',
            'put': 'update',
            'patch': 'partial_update',
        }),
        name='user_profile'
    ),
    path('password/change/', PasswordChangeView.as_view(), name='password_change'),
]