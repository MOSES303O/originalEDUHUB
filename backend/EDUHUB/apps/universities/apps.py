from django.apps import AppConfig


class UniversitiesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.universities'
    verbose_name = 'Universities'

    def ready(self):
        """
        Perform initialization tasks when the app is ready.
        """
        # Import signals if needed
        # import apps.universities.signals
        pass
