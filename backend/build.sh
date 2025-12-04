#!/usr/bin/env bash
set -o errexit

export DJANGO_SETTINGS_MODULE=backend.settings

echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "Applying migrations..."
python manage.py migrate --noinput

echo "Fixing migration order issue (if any)..."
python fix_migrations.py

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Build completed successfully ✅"
