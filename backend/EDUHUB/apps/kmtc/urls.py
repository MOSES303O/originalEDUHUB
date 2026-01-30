# kmtc/urls.py — FINAL VERSION (BEST PRACTICE 2025)
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create a router and register our viewsets
router = DefaultRouter(trailing_slash=False)  # Clean URLs: /kmtc/campuses not /kmtc/campuses/

router.register(r'campuses', views.CampusViewSet, basename='kmtc-campus')
router.register(r'faculties', views.FacultyViewSet, basename='kmtc-faculty')
router.register(r'departments', views.DepartmentViewSet, basename='kmtc-department')
router.register(r'programmes', views.ProgrammeViewSet, basename='kmtc-programme')

urlpatterns = [
    # Main API endpoints
    path('', include(router.urls)),

    # Extra useful endpoints (optional but recommended)
    path('campuses/<str:code>/programmes/', views.CampusProgrammesView.as_view(), name='campus-programmes'),
    path('programmes/<str:code>/campuses/', views.ProgrammeCampusesView.as_view(), name='programme-campuses'),
    
    # Search & filters
    path('search/', views.KMTCSearchView.as_view(), name='kmtc-search'),
]