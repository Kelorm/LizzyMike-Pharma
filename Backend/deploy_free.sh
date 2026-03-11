#!/bin/bash

# Free hosting deployment script
set -e

echo "🚀 Deploying Pharmasys to Free Hosting..."

# Set environment for free hosting
export DJANGO_SETTINGS_MODULE=pharmasys.settings_free

# Create necessary directories
mkdir -p staticfiles
mkdir -p logs

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements-free.txt

# Run database migrations
echo "🗄️ Running database migrations..."
python manage.py migrate

# Create superuser if it doesn't exist
echo "👤 Creating superuser..."
python manage.py shell << EOF
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@pharmasys.com', 'admin123')
    print('✅ Superuser created: admin/admin123')
else:
    print('✅ Superuser already exists')
EOF

# Collect static files
echo "📁 Collecting static files..."
python manage.py collectstatic --noinput

echo "✅ Free hosting deployment ready!"
echo ""
echo "🔗 Your app will be available at:"
echo "   - Railway: https://your-app.railway.app"
echo "   - Render: https://your-app.onrender.com"
echo ""
echo "📝 Next steps:"
echo "   1. Push your code to GitHub"
echo "   2. Connect your repository to Railway/Render"
echo "   3. Set up environment variables"
echo "   4. Deploy!"




