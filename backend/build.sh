#!/bin/bash
set -o errexit  # Exit on any error

echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "Collecting static files..."
python EDUHUB/manage.py collectstatic --noinput

echo "Running migrations..."
python EDUHUB/manage.py migrate

echo "Creating/updating superuser..."
python EDUHUB/manage.py shell << EOF
from apps.authentication.models import User
import os

phone = os.environ.get('DJANGO_SUPERUSER_PHONE_NUMBER')
email = os.environ.get('DJANGO_SUPERUSER_EMAIL')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')

if phone and password and not User.objects.filter(phone_number=phone).exists():
    User.objects.create_superuser(
        phone_number=phone,
        email=email or '',
        password=password
    )
    print(f"Superuser created: {phone}")
else:
    print("Superuser already exists or missing env vars")
EOF

echo "Build complete!"