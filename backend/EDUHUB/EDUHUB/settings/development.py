"""
Development settings for EDUHUB backend.
"""

from .base import *

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']

# Development-specific apps
INSTALLED_APPS += [
    'django_extensions',
]

# Development middleware
if DEBUG:
    MIDDLEWARE += [
        'django.middleware.common.BrokenLinkEmailsMiddleware',
    ]

# Database for development (SQLite3)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',  # Or use 'django.db.backends.postgresql', 'mysql', etc.
        'NAME': BASE_DIR / 'db.sqlite3',         # Use BASE_DIR if already defined
    }
}



# CORS settings for development
CORS_ALLOW_ALL_ORIGINS = True

# Email backend for development
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Disable rate limiting in development
RATE_LIMIT_ENABLE = False

# Cache configuration for development
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
    }
}

# Logging for development
LOGGING['handlers']['console']['level'] = 'DEBUG'
LOGGING['loggers']['apps']['level'] = 'DEBUG'