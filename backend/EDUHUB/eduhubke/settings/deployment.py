"""
Render deployment settings.
"""
from .base import *
import os
import dj_database_url

DEBUG = False

SECRET_KEY = os.environ.get("SECRET_KEY")

ALLOWED_HOSTS = [os.environ.get("RENDER_EXTERNAL_HOSTNAME") ,
    'localhost',]

CSRF_TRUSTED_ORIGINS =  CSRF_TRUSTED_ORIGINS +[
    f"https://{os.environ.get('RENDER_EXTERNAL_HOSTNAME')}",
    f"http://{os.environ.get('RENDER_EXTERNAL_HOSTNAME')}",  # for testing
]

# Static files
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# Database
DATABASES = {
    "default": dj_database_url.config(
        default=os.environ.get("DATABASE_URL"),
        conn_max_age=600
    )
}

# Security
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# backend/EDUHUB/eduhubke/settings/deployment.py

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'eduhub254@gmail.com'
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_PASSWORD')  # Set in Render
DEFAULT_FROM_EMAIL = 'EduHub <eduhub254@gmail.com>'