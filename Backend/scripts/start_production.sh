#!/bin/bash

# Production startup script for Pharmasys
set -e

echo "Starting Pharmasys Production Server..."

# Set environment
export DJANGO_SETTINGS_MODULE=pharmasys.settings_production

# Create logs directory if it doesn't exist
mkdir -p logs

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Run database migrations
echo "Running database migrations..."
python manage.py migrate

# Create superuser if it doesn't exist
echo "Creating superuser if needed..."
python manage.py shell << EOF
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@pharmasys.com', 'admin123')
    print('Superuser created: admin/admin123')
else:
    print('Superuser already exists')
EOF

# Start Gunicorn
echo "Starting Gunicorn server..."
exec gunicorn --config gunicorn.conf.py pharmasys.wsgi:application

