"""
Main URL configuration for EduPathway backend.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


# Simple root view to confirm server is live
def root_view(request):
    return HttpResponse("""
    <div style="font-family: system-ui, sans-serif; padding: 2rem; text-align: center; background: linear-gradient(135deg, #10b981, #059669); color: white; min-height: 100vh; display: flex; flex-direction: column; justify-content: center;">
        <h1 style="font-size: 3rem; margin-bottom: 1rem;">EduHub API is LIVE!</h1>
        <p style="font-size: 1.2rem; margin-bottom: 2rem;">Your backend is running successfully on Render.</p>
        <div style="background: rgba(255,255,255,0.1); padding: 1.5rem; border-radius: 12px; max-width: 600px; margin: 0 auto;">
            <h2 style="margin-bottom: 1rem;">Useful Links:</h2>
            <ul style="list-style: none; padding: 0; font-size: 1.1rem;">
                <li style="margin: 0.8rem 0;"><a href="/admin/" style="color: #fff; text-decoration: underline;">Admin Panel</a></li>
                <li style="margin: 0.8rem 0;"><a href="/api/docs/" style="color: #fff; text-decoration: underline;">API Documentation (Swagger)</a></li>
                <li style="margin: 0.8rem 0;"><a href="/api/v1/auth/register/" style="color: #fff; text-decoration: underline;">Register User</a></li>
                <li style="margin: 0.8rem 0;"><a href="/api/v1/auth/contact/submit/" style="color: #fff; text-decoration: underline;">Contact Form Test</a></li>
                <li style="margin: 0.8rem 0;"><a href="/health/" style="color: #fff; text-decoration: underline;">Health Check</a></li>
            </ul>
        </div>
        <p style="margin-top: 2rem; font-size: 0.9rem; opacity: 0.9;">
            If you're seeing this page, your Django server is correctly configured and routing is working!
        </p>
    </div>
    """, content_type="text/html")


# API URL patterns
api_v1_patterns = [
    path('auth/', include('apps.authentication.urls')),
    path('courses/', include('apps.courses.urls')),
    path('universities/', include('apps.universities.urls')),
    path('payments/', include('apps.payments.urls')),
    path('user/', include('apps.authentication.user_urls')),
    path('kmtc/', include('apps.kmtc.urls')),
]

urlpatterns = [
    # Root route — eliminates 404 on homepage
    path('', root_view, name='root'),

    # Admin interface
    path('admin/', admin.site.urls),
    
    # API endpoints
    path('api/v1/', include(api_v1_patterns)),
    
    # API documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    
    # Health check endpoint
    path('health/', include('apps.core.urls')),
    
    # JWT authentication endpoints
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)