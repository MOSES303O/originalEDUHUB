# eduhubke/celery.py
import os
from celery import Celery
# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eduhubke.settings.base')

print("Celery loading settings...")
from django.conf import settings
print("CELERY_BROKER_URL from settings:", getattr(settings, 'CELERY_BROKER_URL', 'NOT_FOUND'))

# Create Celery app instance
app = Celery('eduhubke')

# Load Celery config from Django settings with CELERY_ prefix
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks in all installed apps (this is what makes tasks appear)
app.autodiscover_tasks()

# Optional: nice debug task
@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')