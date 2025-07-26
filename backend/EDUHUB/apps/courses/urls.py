from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'courses'

router = DefaultRouter()
router.register(r'subjects', views.SubjectViewSet, basename='subject')

urlpatterns = [
    # Router-based endpoints
    path('', include(router.urls)),

    # Courses
    path('courses/', views.CourseListView.as_view(), name='course-list'),
    path('courses/<uuid:pk>/', views.CourseDetailView.as_view(), name='course-detail'),
    path('search/', views.CourseSearchAPIView.as_view(), name='course-search'),
    path('statistics/', views.CourseStatisticsAPIView.as_view(), name='course-statistics'),
    path('match/', views.CourseMatchAPIView.as_view(), name='course-match'),
    
    # Course Reviews
    path('courses/<uuid:course_id>/reviews/', views.CourseReviewListView.as_view(), name='course-review-list'),
]
