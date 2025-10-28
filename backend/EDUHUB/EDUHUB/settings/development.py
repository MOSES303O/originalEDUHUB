"""
Development settings for EDUHUB backend.
"""
import os
import dj_database_url
from .base import BASE_DIR

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0',os.environ.get('RENDER_EXTERNAL_HOSTNAME')]
CSRF_TRUSTED_ORIGINS = ['https://'+os.environ.get('RENDER_EXTERNAL_HOSTNAME')]
SECRET_KEY = os.environ.get('SECRET_KEY')
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'Wwhitenoise.middleware.WhiteNoiseMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'apps.core.middleware.RequestLoggingMiddleware',
    'apps.core.middleware.RateLimitMiddleware',
]

# CORS Configuration
#CORS_ALLOWED_ORIGINS = [
#    "http://127.0.0.1:3000",
#   "http://localhost:3000",
#    "https://your-frontend.vercel.app",
#]
STORAGES={
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
        'OPTIONS': {
        }
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get('DATABASE_URL'),
        conn_max_age=600
    )
}

# Email backend for development
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'