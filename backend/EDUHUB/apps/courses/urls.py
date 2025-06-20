from django.urls import path, include
from . import views

app_name = 'courses'

urlpatterns = [
    #Universities
    #path('universities/', views.UniversityListView.as_view(), name='university-list'),
    #path('universities/<uuid:pk>/', views.UniversityDetailView.as_view(), name='university-detail'),    
    # Subjects
    path('subjects/', views.SubjectListView.as_view(), name='subject-list'),
    # Courses
    path('courses/', views.CourseListView.as_view(), name='course-list'),
    path('courses/<uuid:pk>/', views.CourseDetailView.as_view(), name='course-detail'),
    path('search/', views.CourseSearchAPIView.as_view(), name='course-search'),
    path('statistics/', views.CourseStatisticsAPIView.as_view(), name='course-statistics'),
    path('match/', views.CourseMatchAPIView.as_view(), name='course-match'),
    # Course Reviews
    path('courses/<uuid:course_id>/reviews/', views.CourseReviewListView.as_view(), name='course-review-list'),
    
    # User-specific endpoints
    path('user/selected-courses/', views.UserSelectedCourseView.as_view(), name='user-selected-courses'),
    path('user/selected-courses/bulk_create/', views.BulkUserSelectedCourseCreateView.as_view(), name='user-selected-courses-bulk'),
]