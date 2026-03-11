#!/bin/bash

# Quick setup script for free deployment
echo "🚀 Setting up Pharmasys for Free Deployment..."

# Create .gitignore if it doesn't exist
if [ ! -f ".gitignore" ]; then
    echo "📝 Creating .gitignore..."
    cat > .gitignore << EOF
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Django
*.log
local_settings.py
db.sqlite3
db.sqlite3-journal
media/
staticfiles/

# Environment variables
.env
.env.local
.env.production

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Node.js (for frontend)
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
EOF
fi

# Create a simple health check endpoint
echo "🏥 Creating health check endpoint..."
mkdir -p core/views
cat > core/health.py << EOF
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

@csrf_exempt
@require_http_methods(["GET"])
def health_check(request):
    return JsonResponse({"status": "healthy", "service": "pharmasys"})
EOF

# Update URLs to include health check
echo "🔗 Adding health check to URLs..."
if ! grep -q "health_check" core/urls.py; then
    # Add health check import and URL pattern
    sed -i '1a from .health import health_check' core/urls.py
    sed -i '/urlpatterns = \[/a\    path("health/", health_check, name="health_check"),' core/urls.py
fi

echo "✅ Free deployment setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Push your code to GitHub:"
echo "   git add ."
echo "   git commit -m 'Ready for free deployment'"
echo "   git push origin main"
echo ""
echo "2. Follow the FREE_DEPLOYMENT_GUIDE.md for detailed instructions"
echo ""
echo "🎯 Your app will be live at:"
echo "   Backend: https://your-app.railway.app"
echo "   Frontend: https://your-app.vercel.app"




