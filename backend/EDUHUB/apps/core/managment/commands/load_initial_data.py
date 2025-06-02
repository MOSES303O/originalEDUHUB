from django.core.management.base import BaseCommand
from django.core.management import call_command


class Command(BaseCommand):
    help = 'Load all initial data fixtures for the application'

    def handle(self, *args, **options):
        # Load fixtures in the correct order to respect foreign key constraints
        fixtures = [
            'universities.json',
            'subjects.json',
            'courses.json'
        ]
        
        for fixture in fixtures:
            try:
                self.stdout.write(f"Loading fixture: {fixture}")
                call_command('loaddata', fixture)
                self.stdout.write(self.style.SUCCESS(f"Successfully loaded {fixture}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed to load {fixture}: {str(e)}"))
