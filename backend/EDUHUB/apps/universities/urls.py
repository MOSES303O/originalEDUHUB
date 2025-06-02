from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UniversityViewSet, FacultyViewSet

# Create a router and register our viewsets with it
router = DefaultRouter()
router.register(r'universities', UniversityViewSet)
router.register(r'faculties', FacultyViewSet)

# The API URLs are determined automatically by the router
urlpatterns = [
    path('', include(router.urls)),
]
