import os
from django.core.wsgi import get_wsgi_application

base_module="eduhubke.settings.deployment" if "RENDER_EXTERNAL_HOSTNAME" in os.environ else "eduhubke.settings.base"
os.environ.setdefault("DJANGO_SETTINGS_MODULE", base_module)

application = get_wsgi_application()
