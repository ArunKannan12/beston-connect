#!/usr/bin/env bash
set -o errexit

echo "Installing dependencies..."
pip install -r requirements.txt

echo "Setting Django settings module..."
export DJANGO_SETTINGS_MODULE=backend.backend.settings

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Fixing migration order issue..."
python fix_migrations.py

echo "Build completed successfully ✅"
