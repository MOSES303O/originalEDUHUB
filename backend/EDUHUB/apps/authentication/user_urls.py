"""
User-specific URL patterns.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import user_views

# Create router for user-specific endpoints
router = DefaultRouter()
router.register(r'subjects', user_views.UserSubjectViewSet, basename='user_subjects')

urlpatterns = [
    # User subjects and grades
    path('', include(router.urls)),
    
    # User course selections
    path('selected-courses/', user_views.UserSelectedCoursesView.as_view(), name='user_selected_courses'),
    path('selected-courses/<int:course_id>/', user_views.UserSelectedCoursesView.as_view(), name='user_selected_course_detail'),
    
    # User applications
    path('applications/', user_views.UserApplicationsView.as_view(), name='user_applications'),
]