"""
Core app URLs.
"""

from django.urls import path
from . import views

urlpatterns = [
    path('health/', views.HealthCheckView.as_view(), name='health_check'),
    path('Documentation/', views.APIDocumentationView.as_view(), name='API_DocumentationView'),
]