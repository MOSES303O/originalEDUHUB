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
application = get_wsgi_application()