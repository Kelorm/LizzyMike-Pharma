#!/bin/bash

# Production deployment script for Pharmasys
set -e

echo "🚀 Starting Pharmasys Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating from template..."
    if [ -f "env.production.template" ]; then
        cp env.production.template .env
        print_warning "Please edit .env file with your production values before continuing."
        exit 1
    else
        print_error "env.production.template not found. Cannot create .env file."
        exit 1
    fi
fi

# Set environment
export DJANGO_SETTINGS_MODULE=pharmasys.settings_production

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p logs
mkdir -p staticfiles
mkdir -p media

# Install dependencies
print_status "Installing Python dependencies..."
pip install -r requirements.txt

# Run database migrations
print_status "Running database migrations..."
python manage.py migrate

# Collect static files
print_status "Collecting static files..."
python manage.py collectstatic --noinput

# Create superuser if it doesn't exist
print_status "Creating superuser if needed..."
python manage.py shell << EOF
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@pharmasys.com', 'admin123')
    print('Superuser created: admin/admin123')
else:
    print('Superuser already exists')
EOF

# Run Django checks
print_status "Running Django production checks..."
python manage.py check --deploy

print_status "✅ Production deployment completed successfully!"
print_warning "Remember to:"
print_warning "1. Update your .env file with production values"
print_warning "2. Set up your database (PostgreSQL recommended for production)"
print_warning "3. Configure your web server (Nginx recommended)"
print_warning "4. Set up SSL certificates"
print_warning "5. Configure your domain and DNS"

echo ""
print_status "To start the production server, run:"
echo "gunicorn --config gunicorn.conf.py pharmasys.wsgi:application"




