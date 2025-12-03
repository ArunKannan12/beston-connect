#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "Collecting static files..."
cd backend
python manage.py collectstatic --noinput

echo "Fixing migration order issue..."
python fix_migrations.py

cd ..
echo "Build completed successfully ✅"
