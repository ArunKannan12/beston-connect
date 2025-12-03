#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "Installing dependencies..."
pip install -r requirements.txt

echo "Setting Django settings module..."
export DJANGO_SETTINGS_MODULE=backend.settings

echo "Collecting static files..."
cd backend          # <-- REQUIRED because manage.py is inside backend/
python manage.py collectstatic --noinput
cd ..

echo "Fixing migration order issue..."
python fix_migrations.py

echo "Build completed successfully ✅"
