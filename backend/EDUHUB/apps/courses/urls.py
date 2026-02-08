# apps/courses/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'courses'

router = DefaultRouter()
router.register(r'subjects', views.SubjectViewSet, basename='subject')
router.register(r'programs', views.ProgramViewSet, basename='program')

urlpatterns = [
    path('', include(router.urls)),
    path('offerings/', views.CourseOfferingListView.as_view(), name='offering-list'),
    path('offerings/<uuid:id>/', views.CourseOfferingDetailView.as_view(), name='offering-detail'),
    path('search/', views.CourseSearchAPIView.as_view(), name='course-search'),
]