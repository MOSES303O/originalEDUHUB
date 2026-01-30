# settings/development.py
from .base import *  # ← THIS IMPORTS ALL CORS SETTINGS FROM BASE
import os
import dj_database_url

# Only override what you really need
DEBUG = True

ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    'brunilda-seminationalized-affinely.ngrok-free.dev',  # ← exact current ngrok subdomain
    '.ngrok-free.dev',
]

if os.environ.get('RENDER_EXTERNAL_HOSTNAME'):
    ALLOWED_HOSTS.append(os.environ.get('RENDER_EXTERNAL_HOSTNAME'))

# DO NOT redefine MIDDLEWARE — it kills CORS
# DO NOT redefine CORS settings — base.py already has them

# Database
DATABASES = {
    'default': dj_database_url.config(
        default='sqlite:///' + str(BASE_DIR / 'db.sqlite3'),
        conn_max_age=600
    )
}

# Static files
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'