#!/usr/bin/env bash
set -o errexit

export DJANGO_SETTINGS_MODULE=backend.settings

echo "=============================="
echo "Starting build..."
echo "=============================="

echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "=============================="
echo "ENVIRONMENT & Database Check"
echo "=============================="

python - << 'EOF'
import os
import sys
import django

# Show the environment variable
env = os.getenv('ENVIRONMENT', 'not set')
print(f"ENVIRONMENT: {env}", flush=True)

# Setup Django
django.setup()

from django.conf import settings

# Show which database config is being used
print("---- DATABASE CONFIG ----", flush=True)
db = settings.DATABASES.get('default')
if db:
    for k, v in db.items():
        print(f"{k}: {v}", flush=True)
else:
    print("No default database configured!", flush=True)
print("-------------------------", flush=True)
EOF

echo "Applying migrations..."
python manage.py migrate --noinput

echo "Fixing migration order issue (if any)..."
python fix_migrations.py

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "=============================="
echo "Build completed successfully ✅"
echo "=============================="
