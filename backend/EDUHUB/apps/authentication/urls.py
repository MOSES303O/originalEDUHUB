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
    UserUpdateView,
)
from .views import (
    UserProfileViewSet,
    UserSessionsView,
)

# 1. Create router ONLY for ViewSet-based endpoints
router = DefaultRouter()
router.register(r'profile', UserProfileViewSet, basename='user-profile')
router.register(r'subjects', UserSubjectViewSet, basename='user-subjects')

urlpatterns = [
    # Manual (non-router) endpoints — these must come FIRST
    path('register/', UserRegistrationView.as_view(), name='user_register'),
    path('login/', UserLoginView.as_view(), name='user_login'),
    path('logout/', UserLogoutView.as_view(), name='user_logout'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('password/change/', PasswordChangeView.as_view(), name='password_change'),
    path('contact/submit/', ContactFormView.as_view(), name='contact_submit'), 
    path('/profile/update/', UserUpdateView.as_view(), name='user_update'),
    # Router endpoints (profile, subjects) — mounted at root
    path('', include(router.urls)),
    
    # Manual session paths (these are not ViewSets, so separate)
    path('sessions/', UserSessionsView.as_view(), name='user_sessions'),
    path('sessions/<int:session_id>/', UserSessionsView.as_view(), name='user_session_revoke'),

    # Course selection (manual paths)
    path('user/selected-courses/', UserSelectedCoursesView.as_view(), name='user-selected-courses-list'),
    path('user/selected-courses/<uuid:pk>/', UserSelectedCoursesView.as_view(), name='user-selected-courses-detail'),

    # Applications
    path('applications/', UserApplicationsView.as_view(), name='user_applications'),
]