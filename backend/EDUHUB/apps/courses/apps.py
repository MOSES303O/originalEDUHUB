from django.apps import AppConfig


class CoursesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.courses'
    verbose_name = 'Courses'

    def ready(self):
        """
        Import signal handlers when the app is ready
        """
        try:
            import apps.courses.signals
        except ImportError:
            pass