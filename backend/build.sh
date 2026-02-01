#!/usr/bin/env bash
set -o errexit   # Exit immediately if a command exits with a non-zero status.
set -o nounset   # Treat unset variables as an error.
set -o pipefail  # Catch errors in piped commands.

echo "=== Build started ==="

echo "1. Upgrading pip & installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "2. Changing to Django project directory..."
cd EDUHUB || { echo "Failed to cd into EDUHUB"; exit 1; }

echo "3. Collecting static files..."
python manage.py collectstatic --no-input --clear

echo "4. Running makemigrations (if any)..."
python manage.py makemigrations --noinput || true

echo "5. Applying migrations..."
python manage.py migrate --noinput --verbosity 2

echo "6. Quick database verification..."
python manage.py dbshell << 'EOF'
\conninfo
\dt+  -- show all tables with more info
SELECT count(*) FROM courses_subject;
\q
EOF

echo "7. Superuser check/create (using env vars)..."
python manage.py shell << 'EOF'
import os
from apps.authentication.models import User

phone = os.environ.get('DJANGO_SUPERUSER_PHONE_NUMBER')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')

if phone and password and not User.objects.filter(phone_number=phone).exists():
    User.objects.create_superuser(
        phone_number=phone,
        password=password,
    )
    print(f"Superuser created with phone: {phone}")
else:
    print("Superuser already exists or missing required env vars (PHONE_NUMBER & PASSWORD)")
EOF

echo "=== Build complete! ==="