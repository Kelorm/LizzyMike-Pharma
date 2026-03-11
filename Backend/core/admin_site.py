from django.contrib.admin import AdminSite
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.urls import path
from django.template.response import TemplateResponse

User = get_user_model()


class PharmacyAdminSite(AdminSite):
    """
    Custom Admin Site for LizzyMike Pharma Management System
    Organizes models into logical sections: Authentication & Authorization vs Pharmacy Management
    """
    
    site_header = "LizzyMike Pharma Admin"
    site_title = "LizzyMike Pharma"
    index_title = "Pharmacy Management System"
    
    def index(self, request, extra_context=None):
        """
        Display the main admin index page with organized sections
        """
        extra_context = extra_context or {}
        
        # Get app list and reorganize into sections
        app_list = self.get_app_list(request)
        
        # Organize models into sections
        auth_models = []
        pharmacy_models = []
        
        for app in app_list:
            if app['app_label'] == 'auth':
                auth_models.extend(app['models'])
            elif app['app_label'] == 'core':
                for model in app['models']:
                    model_name = model['object_name']
                    if model_name in ['User', 'Group', 'AuditTrail']:
                        auth_models.append(model)
                    else:
                        pharmacy_models.append(model)
            else:
                pharmacy_models.extend(app['models'])
        
        extra_context.update({
            'auth_models': auth_models,
            'pharmacy_models': pharmacy_models,
            'title': self.index_title,
        })
        
        return TemplateResponse(request, 'admin/custom_index.html', extra_context)
    
    def get_urls(self):
        """Add custom URLs for the admin site"""
        urls = super().get_urls()
        custom_urls = [
            path('dashboard/', self.admin_view(self.dashboard_view), name='dashboard'),
        ]
        return custom_urls + urls
    
    def dashboard_view(self, request):
        """Custom dashboard view with pharmacy-specific metrics"""
        context = {
            'title': 'Dashboard',
            'site_title': self.site_title,
            'site_header': self.site_header,
        }
        return TemplateResponse(request, 'admin/dashboard.html', context)


# Create the custom admin site instance
pharmacy_admin_site = PharmacyAdminSite(name='pharmacy_admin')
