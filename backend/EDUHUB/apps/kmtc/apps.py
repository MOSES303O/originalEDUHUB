from django.apps import AppConfig


class KmtcConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.kmtc"
    verbose_name = "KMTC"
    def ready(self):
        """
        Perform initialization tasks when the app is ready.
        """
        pass
