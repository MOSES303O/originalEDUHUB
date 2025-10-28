#!/bin/bash
set -o errexit  # Exit on any error

echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "Changing to Django project directory..."
cd EDUHUB  # <-- THIS IS THE KEY LINE

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Running migrations..."
python manage.py migrate

echo "Build complete!"