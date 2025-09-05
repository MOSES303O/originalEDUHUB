from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CampusViewSet,facultyViewSet
# Create a router and register our viewsets with it
router = DefaultRouter()
router.register(r'campuses', CampusViewSet, basename='campus')
router.register(r'faculties', facultyViewSet, basename='faculty')
router.register(r'programmes', facultyViewSet, basename='programmes')
# The API URLs are determined automatically by the router
urlpatterns = [
    path('', include(router.urls)),
]