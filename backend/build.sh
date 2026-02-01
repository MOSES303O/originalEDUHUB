#!/bin/bash
set -o errexit  # Exit on any error

echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
echo "Changing to Django project directory..."
cd EDUHUB  # <-- THIS IS THE KEY LINE

echo "Collecting static files..."
python manage.py collectstatic --no-input

echo "3. Running migrations (force apply)..."
python manage.py makemigrations --noinput || true
python manage.py migrate --noinput --verbosity 3

echo "4. Verify database connection and tables..."
echo "5. Superuser check/create..."
echo "Build complete!"

#if [[$CREATE_SUPERUSER]];"
#then
#    python manage.py createsuperuser --no-input
#fi
# Create superuser using CORRECT app path
python manage.py dbshell << EOF
\conninfo
\dt courses_*
SELECT count(*) FROM courses_subject;

echo "5. Superuser check/create..."
python manage.py shell << EOF
from apps.authentication.models import User
import os

phone = os.environ.get('DJANGO_SUPERUSER_PHONE_NUMBER')
email = os.environ.get('DJANGO_SUPERUSER_EMAIL')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')

if phone and password and not User.objects.filter(phone_number=phone).exists():
    User.objects.create_superuser(
        phone_number=phone,
        password=password
    )
    print(f"Superuser created: {phone}")
else:
    print("Superuser already exists or missing env vars")
EOF

echo "Build complete!"