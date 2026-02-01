import os

from django.core.asgi import get_asgi_application
base_module="EDUHUB.eduhubke.settings.deployment" if "RENDER_EXTERNAL_HOSTNAME" in os.environ else "EDUHUB.settings.base"
os.environ.setdefault("DJANGO_SETTINGS_MODULE", base_module)

application = get_asgi_application()
