import os
from django.core.wsgi import get_wsgi_application
# Reliable Render detection using multiple official vars
is_on_render = (
    os.environ.get("RENDER") == "true" or
    os.environ.get("RENDER_SERVICE_TYPE") == "web" or
    "RENDER_EXTERNAL_HOSTNAME" in os.environ or
    "RENDER_EXTERNAL_URL" in os.environ
)

if is_on_render:
    settings_module = "eduhubke.settings.deployment"
else:
    settings_module = "eduhubke.settings.base"  # fallback for local/dev

os.environ.setdefault("DJANGO_SETTINGS_MODULE", settings_module)

# Add these debug prints – they will show in runtime logs on startup
print("===== DJANGO SETTINGS DEBUG =====")
print(f"Detected on Render: {is_on_render}")
print(f"Loaded settings module: {settings_module}")
print(f"RENDER: {os.environ.get('RENDER', 'NOT SET')}")
print(f"RENDER_SERVICE_TYPE: {os.environ.get('RENDER_SERVICE_TYPE', 'NOT SET')}")
print(f"RENDER_EXTERNAL_HOSTNAME: {os.environ.get('RENDER_EXTERNAL_HOSTNAME', 'NOT SET')}")
print(f"RENDER_EXTERNAL_URL: {os.environ.get('RENDER_EXTERNAL_URL', 'NOT SET')}")
print(f"DATABASE_URL present: {'DATABASE_URL' in os.environ}")
application = get_wsgi_application()