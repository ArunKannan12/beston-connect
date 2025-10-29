#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "Installing dependencies..."
pip install -r requirements.txt

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Fixing migration order issue..."
python fix_migrations.py   # <-- fakes missing dependencies & applies remaining migrations

echo "Build completed successfully ✅"
