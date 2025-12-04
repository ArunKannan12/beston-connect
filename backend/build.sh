#!/usr/bin/env bash
set -o errexit

echo "Setting environment variables..."
export DJANGO_SETTINGS_MODULE=backend.settings

echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "Applying migrations..."
python backend/manage.py migrate --noinput

echo "Fixing migration order issue (if any)..."
python backend/fix_migrations.py

echo "Collecting static files..."
python backend/manage.py collectstatic --noinput

echo "Build completed successfully ✅"
