# apps/universities/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UniversityViewSet, FacultyViewSet, DepartmentViewSet

router = DefaultRouter()
router.register(r'universities', UniversityViewSet, basename='university')
router.register(r'faculties', FacultyViewSet, basename='faculty')
router.register(r'departments', DepartmentViewSet, basename='department')

urlpatterns = [
    path('', include(router.urls)),
    # Extra useful endpoints
    path('universities/<str:code>/courses/', UniversityViewSet.as_view({'get': 'courses'}), name='university-courses'),
]