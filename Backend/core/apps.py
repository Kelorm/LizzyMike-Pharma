from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'
    verbose_name = 'LizzyMike Pharma Management'
    
    def ready(self):
        """Initialize the app when Django starts"""
        import core.signals  # Import signals for audit trail
        
        # Customize admin site
        from django.contrib import admin
        admin.site.site_header = "LizzyMike Pharma Admin"
        admin.site.site_title = "LizzyMike Pharma"
        admin.site.index_title = "Pharmacy Management System"