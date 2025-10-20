"""
ASGI config for EDUHUB project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application
base_module="EDUHUB.deployment" if "RENDER_EXTERNAL_HOSTNAME" in os.environ else "EDUHUB.settings.base"
os.environ.setdefault("DJANGO_SETTINGS_MODULE", base_module)

application = get_asgi_application()
