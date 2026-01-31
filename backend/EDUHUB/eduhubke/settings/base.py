"""
Base Django settings for EduPathway backend.
All sensitive/MPesa config loaded from .env
"""

import os
from pathlib import Path
from decouple import config
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()  # ← Load .env file

# Build paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# SECURITY
SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=True, cast=bool)

# Celery - FULLY SYNCHRONOUS MODE (NO BROKER, NO QUEUE)
CELERY_BROKER_URL = None
CELERY_RESULT_BACKEND = None
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'Africa/Nairobi'

# Windows fixes: solo pool + low concurrency
CELERY_WORKER_POOL = 'solo'
CELERY_WORKER_CONCURRENCY = 1
CELERYD_MAX_TASKS_PER_CHILD = 1 # Application definition
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django_daraja',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    'phonenumber_field',
    'django_celery_beat',
    'django_extensions',   
]

LOCAL_APPS = [
    'apps.authentication',
    'apps.courses',
    'apps.kmtc',
    'apps.payments',
    'apps.core',
    'apps.universities',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'apps.core.middleware.RequestLoggingMiddleware',
    'apps.core.middleware.RateLimitMiddleware',
    'apps.core.middleware.PremiumAccessMiddleware',
    'apps.core.middleware.SubscriptionExpirationMiddleware',
]
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

ROOT_URLCONF = 'eduhubke.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'eduhubke.wsgi.application'
# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Custom User Model
AUTH_USER_MODEL = 'authentication.User'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Africa/Nairobi'
USE_I18N = True
USE_TZ = True

# Static & Media
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': ['rest_framework.throttling.UserRateThrottle'],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.AllowAny'],
    'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer'],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend'],
    'PAGE_SIZE': 10,
}
RATE_LIMIT_ENABLE = False

# JWT
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
}
ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    '.ngrok-free.dev',
]
# CORS
CORS_ALLOWED_ORIGINS = [
    "https://original-eduhub-eduhub-gvmsd9o5y-moses303os-projects.vercel.app",
    "https://original-eduhub-eduhub-git-main-moses303os-projects.vercel.app",
    "https://originaleduhub.onrender.com",
    "https://ochiengsenterprise.co.ke",
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "https://eduhub254.com",
]
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://localhost:3000", 
    "https://original-eduhub-eduhub-gvmsd9o5y-moses303os-projects.vercel.app",
    "https://original-eduhub-eduhub-git-main-moses303os-projects.vercel.app",
    "https://originaleduhub.onrender.com",
    "https://ochiengsenterprise.co.ke",
    "https://eduhub254.com",
]
# Phone field
PHONENUMBER_DEFAULT_REGION = 'KE'

# Logging
LOG_DIR = BASE_DIR / 'logs'
os.makedirs(LOG_DIR, exist_ok=True)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {'format': '{levelname} {asctime} {module} {message}', 'style': '{'},
        'simple': {'format': '{levelname} {message}', 'style': '{'},
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': LOG_DIR / 'django.log',
            'formatter': 'verbose',
        },
        'console': {'level': 'INFO', 'class': 'logging.StreamHandler', 'formatter': 'simple'},
    },
    'root': {'handlers': ['console', 'file'], 'level': 'INFO'},
    'loggers': {
        'django': {'handlers': ['console', 'file'], 'level': 'INFO', 'propagate': False},
        'apps': {'handlers': ['console', 'file'], 'level': 'DEBUG', 'propagate': False},
    },
}

# === ALL MPESA CONFIG FROM .env ===
MPESA_ENVIRONMENT = config('MPESA_ENVIRONMENT', default='sandbox')
MPESA_CONSUMER_KEY = config('MPESA_CONSUMER_KEY')
MPESA_CONSUMER_SECRET = config('MPESA_CONSUMER_SECRET')
MPESA_SHORTCODE = config('MPESA_SHORTCODE')
MPESA_PASSKEY = config('MPESA_PASSKEY')
CALLBACK_URL = config(
    'CALLBACK_URL',
    default='https://brunilda-seminationalized-affinely.ngrok-free.dev/eduhub/payments/mpesa/callback/'
)
#if not DEBUG:
    # Auto-detect Render domain if CALLBACK_URL not set
    #if 'RENDER' in os.environ.get('HOSTNAME', ''):
        #BASE_DOMAIN = f"https://{os.environ.get('RENDER_EXTERNAL_HOSTNAME', 'localhost')}"
       # CALLBACK_URL = f"{BASE_DOMAIN}/eduhub/payments/mpesa/callback/"

# Security
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'