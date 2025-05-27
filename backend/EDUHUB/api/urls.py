# backend/api/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'subjects', views.SubjectViewSet)
router.register(r'courses', views.CourseViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('match-courses/', views.match_courses, name='match-courses'),
    path('login/', views.login, name='login'),
    path('register/', views.register, name='register'),
    path('process-payment/', views.process_payment, name='process-payment'),
    path('generate-pdf/', views.generate_courses_pdf, name='generate-pdf'),
]