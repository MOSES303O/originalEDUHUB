# apps/authentication/urls.py
"""
Authentication URL patterns for EduPathway Platform.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .user_views import (
    UserRegistrationView,
    UserLoginView,
    UserLogoutView,
    TokenRefreshView,
    PasswordChangeView,
    UserSubjectViewSet,
    UserSelectedCoursesView,
    UserApplicationsView,
    ContactFormView,
)
from .views import (
    UserProfileViewSet,
    UserSessionsView,
)

router = DefaultRouter()
router.register(r'profile', UserProfileViewSet, basename='user-profile')
router.register(r'subjects', UserSubjectViewSet, basename='user-subjects')

urlpatterns = [
    # Authentication endpoints
    path('register/', UserRegistrationView.as_view(), name='user_register'),
    path('login/', UserLoginView.as_view(), name='user_login'),
    path('logout/', UserLogoutView.as_view(), name='user_logout'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('password/change/', PasswordChangeView.as_view(), name='password_change'),
    path('contact/submit/', ContactFormView.as_view(),name='contact_submit'), # ← CHANGED
    
    # Profile and subjects endpoints
    path('', include(router.urls)),
    
    # Session management
    path('sessions/', UserSessionsView.as_view(), name='user_sessions'),
    path('sessions/<int:session_id>/', UserSessionsView.as_view(), name='user_session_revoke'),
    
    # Course selection and applications
    path('selected-courses/', UserSelectedCoursesView.as_view(), name='selected_courses'),
    path('applications/', UserApplicationsView.as_view(), name='user_applications'),
]