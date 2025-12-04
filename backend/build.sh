#!/usr/bin/env bash
set -o errexit

echo "=== Render Build Script ==="

# Move to backend folder
cd backend || exit 1

# Show which Python & pip we're using
echo "Python version: $(python --version)"
echo "Pip version: $(pip --version)"

# Debug: show environment variables
echo "ENVIRONMENT=$ENVIRONMENT"
echo "DATABASE_URL=$DATABASE_URL"

# Install dependencies
echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Apply migrations
echo "Applying migrations..."
python manage.py migrate --noinput

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Optional: fix migration order issues if you have this script
if [ -f "fix_migrations.py" ]; then
    echo "Fixing migration order..."
    python fix_migrations.py
fi

echo "Build completed successfully ✅"
