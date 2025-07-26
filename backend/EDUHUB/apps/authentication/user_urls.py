# apps/authentication/user_urls.py
"""
User-specific URL patterns for EduPathway Platform.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .user_views import (
    UserSubjectViewSet,
    UserSelectedCoursesView,
    UserApplicationsView,
)

router = DefaultRouter()
router.register(r'subjects', UserSubjectViewSet, basename='user_subjects')

urlpatterns = [
    # User subjects and grades
    path('', include(router.urls)),
    
    # User course selections
    path('selected-courses/', UserSelectedCoursesView.as_view(), name='user_selected_courses'),
    path('selected-courses/<int:pk>/', UserSelectedCoursesView.as_view(), name='user_selected_course_detail'),
    
    # User applications
    path('applications/', UserApplicationsView.as_view(), name='user_applications'),
]