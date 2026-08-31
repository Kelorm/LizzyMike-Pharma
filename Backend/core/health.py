"""
Health check endpoints and dashboard for LizzyMike Pharmacy
"""
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.views import View
from django.shortcuts import render
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .monitoring import SystemMonitor, MetricsCollector, AlertManager
from .models import Medication, User

@csrf_exempt
@require_http_methods(["GET"])
def health_check(request):
    """Health check endpoint for free hosting platforms"""
    return JsonResponse({
        "status": "healthy", 
        "service": "pharmasys",
        "version": "1.0.0"
    })


class StatusDashboardView(View):
    """Simple HTML dashboard showing system health status"""
    
    def get(self, request):
        """Return status dashboard HTML"""
        
        # Get health information
        health = SystemMonitor.get_system_health()
        metrics = MetricsCollector.get_business_metrics()
        alerts = AlertManager.check_alerts()
        
        # Extract key metrics for dashboard
        database_status = health['checks'].get('database', {})
        disk_status = health['checks'].get('disk', {})
        cache_status = health['checks'].get('cache', {})
        backup_status = health['checks'].get('backup', {})
        sessions = health['checks'].get('sessions', {})
        
        # Count low stock items
        low_stock_count = metrics.get('low_stock_items', 0)
        
        # Get last backup time
        last_backup = backup_status.get('last_backup', 'Never')
        hours_since_backup = backup_status.get('hours_since_backup', 'Unknown')
        
        # Determine color for each service
        def get_status_color(status):
            if status == 'healthy':
                return 'green'
            elif status == 'warning' or status == 'degraded':
                return 'yellow'
            else:
                return 'red'
        
        context = {
            'timestamp': timezone.now(),
            'overall_status': health['status'],
            'overall_color': get_status_color(health['status']),
            
            # Service statuses
            'database_status': database_status.get('status', 'unknown'),
            'database_color': get_status_color(database_status.get('status', 'unknown')),
            'database_size': database_status.get('database_size', 'N/A'),
            
            'disk_status': disk_status.get('status', 'unknown'),
            'disk_color': get_status_color(disk_status.get('status', 'unknown')),
            'disk_free': disk_status.get('free_space', 'N/A'),
            
            'cache_status': cache_status.get('status', 'unknown'),
            'cache_color': get_status_color(cache_status.get('status', 'unknown')),
            
            'backup_status': backup_status.get('status', 'unknown'),
            'backup_color': get_status_color(backup_status.get('status', 'unknown')),
            'last_backup': last_backup,
            'hours_since_backup': hours_since_backup,
            
            # Metrics
            'active_users': sessions.get('active_users', 0),
            'active_sessions': sessions.get('active_sessions', 0),
            'low_stock_count': low_stock_count,
            'daily_revenue': metrics.get('daily_revenue', 0),
            
            # Alerts
            'alerts': alerts,
            'alert_count': len(alerts),
        }
        
        return render(request, 'core/status_dashboard.html', context)




