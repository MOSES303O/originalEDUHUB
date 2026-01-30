# apps/authentication/user_urls.py
"""
User-specific URL patterns for EduPathway Platform.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .user_views import (
    UserSubjectViewSet,
    UserSelectedCoursesView,
)

router = DefaultRouter()
router.register(r'subjects', UserSubjectViewSet, basename='user_subjects')

urlpatterns = [    
    # User subjects and grades
    path('', include(router.urls)),
    # Explicit paths for UserSelectedCoursesView
    path('selected-courses/', UserSelectedCoursesView.as_view(), name='user-selected-courses'),
    path('selected-courses/<uuid:pk>/', UserSelectedCoursesView.as_view(), name='user-selected-course-detail'),
]