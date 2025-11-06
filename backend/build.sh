#!/bin/bash
set -o errexit  # Exit on any error

echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "Changing to Django project directory..."
cd EDUHUB  # <-- THIS IS THE KEY LINE

echo "Collecting static files..."
python manage.py collectstatic --no-input

echo "Running migrations..."
python manage.py migrate

echo "Build complete!"

if [[$CREATE_SUPERUSER]];
then
    python manage.py createsuperuser --no-input
fi
echo "Creating superuser..."
python manage.py createsuperuser \
  --noinput \
  --phone_number "$DJANGO_SUPERUSER_PHONE_NUMBER" \
  --email "$DJANGO_SUPERUSER_EMAIL" || true

# Set password for the superuser
echo "from authentication.models import User; user = User.objects.get(phone_number='$DJANGO_SUPERUSER_PHONE_NUMBER'); user.set_password('$DJANGO_SUPERUSER_PASSWORD'); user.save()" | python manage.py shell || true

echo "Build complete!"