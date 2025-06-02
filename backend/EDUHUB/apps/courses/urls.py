from django.urls import path, include
from . import views

app_name = 'courses'

urlpatterns = [
    # Universities
    path('universities/', views.UniversityListView.as_view(), name='university-list'),
    path('universities/<uuid:pk>/', views.UniversityDetailView.as_view(), name='university-detail'),
    
    # Subjects
    path('subjects/', views.SubjectListView.as_view(), name='subject-list'),
    
    # Courses
    path('courses/', views.CourseListView.as_view(), name='course-list'),
    path('courses/<uuid:pk>/', views.CourseDetailView.as_view(), name='course-detail'),
    path('courses/search/', views.course_search, name='course-search'),
    path('courses/match/', views.match_courses, name='course-match'),
    path('courses/statistics/', views.course_statistics, name='course-statistics'),
    
    # Course Reviews
    path('courses/<uuid:course_id>/reviews/', views.CourseReviewListView.as_view(), name='course-review-list'),
    
    # User-specific endpoints
    path('user/selected-courses/', views.UserSelectedCourseListView.as_view(), name='user-selected-courses'),
    path('user/selected-courses/<uuid:pk>/', views.UserSelectedCourseDetailView.as_view(), name='user-selected-course-detail'),
    path('user/applications/', views.CourseApplicationListView.as_view(), name='user-applications'),
]