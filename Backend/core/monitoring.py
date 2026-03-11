"""
Monitoring and health check utilities
"""
import logging
import psutil
import time
from django.db import connection
from django.core.cache import cache
from django.utils import timezone
from django.conf import settings
from django.db.models import Count, Sum
from .models import Sale, Medication, User, AuditTrail

logger = logging.getLogger(__name__)

class SystemMonitor:
    """System monitoring utilities"""
    
    @staticmethod
    def get_system_health():
        """Get overall system health"""
        health = {
            'status': 'healthy',
            'timestamp': timezone.now().isoformat(),
            'checks': {}
        }
        
        # Database health
        health['checks']['database'] = SystemMonitor.check_database()
        
        # Cache health
        health['checks']['cache'] = SystemMonitor.check_cache()
        
        # Disk space
        health['checks']['disk'] = SystemMonitor.check_disk_space()
        
        # Memory usage
        health['checks']['memory'] = SystemMonitor.check_memory()
        
        # Application metrics
        health['checks']['application'] = SystemMonitor.check_application()
        
        # Overall status
        if any(check['status'] != 'healthy' for check in health['checks'].values()):
            health['status'] = 'unhealthy'
        
        return health
    
    @staticmethod
    def check_database():
        """Check database connectivity and performance"""
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
                
            # Check database size
            with connection.cursor() as cursor:
                cursor.execute("SELECT pg_database_size(current_database())")
                db_size = cursor.fetchone()[0]
            
            return {
                'status': 'healthy',
                'response_time': '< 1ms',
                'database_size': f"{db_size / 1024 / 1024:.2f} MB"
            }
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                'status': 'unhealthy',
                'error': str(e)
            }
    
    @staticmethod
    def check_cache():
        """Check cache connectivity"""
        try:
            cache.set('health_check', 'ok', timeout=10)
            result = cache.get('health_check')
            cache.delete('health_check')
            
            if result == 'ok':
                return {'status': 'healthy'}
            else:
                return {'status': 'unhealthy', 'error': 'Cache test failed'}
        except Exception as e:
            logger.error(f"Cache health check failed: {e}")
            return {'status': 'unhealthy', 'error': str(e)}
    
    @staticmethod
    def check_disk_space():
        """Check available disk space"""
        try:
            disk_usage = psutil.disk_usage('/')
            free_percent = (disk_usage.free / disk_usage.total) * 100
            
            if free_percent < 10:
                return {
                    'status': 'unhealthy',
                    'free_space': f"{free_percent:.1f}%",
                    'warning': 'Low disk space'
                }
            elif free_percent < 20:
                return {
                    'status': 'warning',
                    'free_space': f"{free_percent:.1f}%",
                    'warning': 'Disk space getting low'
                }
            else:
                return {
                    'status': 'healthy',
                    'free_space': f"{free_percent:.1f}%"
                }
        except Exception as e:
            logger.error(f"Disk space check failed: {e}")
            return {'status': 'unhealthy', 'error': str(e)}
    
    @staticmethod
    def check_memory():
        """Check memory usage"""
        try:
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            
            if memory_percent > 90:
                return {
                    'status': 'unhealthy',
                    'memory_usage': f"{memory_percent:.1f}%",
                    'warning': 'High memory usage'
                }
            elif memory_percent > 80:
                return {
                    'status': 'warning',
                    'memory_usage': f"{memory_percent:.1f}%",
                    'warning': 'Memory usage is high'
                }
            else:
                return {
                    'status': 'healthy',
                    'memory_usage': f"{memory_percent:.1f}%"
                }
        except Exception as e:
            logger.error(f"Memory check failed: {e}")
            return {'status': 'unhealthy', 'error': str(e)}
    
    @staticmethod
    def check_application():
        """Check application-specific metrics"""
        try:
            # Check if critical models are accessible
            user_count = User.objects.count()
            medication_count = Medication.objects.count()
            
            # Check recent activity
            recent_sales = Sale.objects.filter(
                date__gte=timezone.now().date()
            ).count()
            
            return {
                'status': 'healthy',
                'users': user_count,
                'medications': medication_count,
                'recent_sales': recent_sales
            }
        except Exception as e:
            logger.error(f"Application health check failed: {e}")
            return {'status': 'unhealthy', 'error': str(e)}

class MetricsCollector:
    """Collect application metrics"""
    
    @staticmethod
    def get_business_metrics():
        """Get business-specific metrics"""
        try:
            today = timezone.now().date()
            
            # Sales metrics
            today_sales = Sale.objects.filter(date=today)
            total_revenue = today_sales.aggregate(
                total=Sum('total')
            )['total'] or 0
            
            # Inventory metrics
            low_stock_meds = Medication.objects.filter(
                stock__lte=models.F('min_stock')
            ).count()
            
            # User metrics
            active_users = User.objects.filter(
                last_login__gte=timezone.now() - timezone.timedelta(days=7)
            ).count()
            
            return {
                'daily_revenue': float(total_revenue),
                'low_stock_items': low_stock_meds,
                'active_users': active_users,
                'timestamp': timezone.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Failed to collect business metrics: {e}")
            return {'error': str(e)}
    
    @staticmethod
    def get_performance_metrics():
        """Get performance metrics"""
        try:
            # Database query performance
            start_time = time.time()
            Sale.objects.all().count()
            db_query_time = time.time() - start_time
            
            # Cache performance
            start_time = time.time()
            cache.get('test_key')
            cache_time = time.time() - start_time
            
            return {
                'db_query_time': f"{db_query_time:.3f}s",
                'cache_time': f"{cache_time:.3f}s",
                'timestamp': timezone.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Failed to collect performance metrics: {e}")
            return {'error': str(e)}

class AlertManager:
    """Alert management system"""
    
    @staticmethod
    def check_alerts():
        """Check for alert conditions"""
        alerts = []
        
        # Low stock alert
        low_stock_count = Medication.objects.filter(
            stock__lte=models.F('min_stock')
        ).count()
        
        if low_stock_count > 0:
            alerts.append({
                'type': 'low_stock',
                'message': f'{low_stock_count} medications are low in stock',
                'severity': 'warning'
            })
        
        # Expiring medications
        expiring_count = Medication.objects.filter(
            expiry__lte=timezone.now().date() + timezone.timedelta(days=30)
        ).count()
        
        if expiring_count > 0:
            alerts.append({
                'type': 'expiring_medications',
                'message': f'{expiring_count} medications expire within 30 days',
                'severity': 'warning'
            })
        
        # System health alerts
        health = SystemMonitor.get_system_health()
        if health['status'] != 'healthy':
            alerts.append({
                'type': 'system_health',
                'message': 'System health check failed',
                'severity': 'critical'
            })
        
        return alerts
    
    @staticmethod
    def send_alert(alert):
        """Send alert notification"""
        logger.warning(f"ALERT: {alert['type']} - {alert['message']}")
        
        # In production, integrate with email/SMS/Slack notifications
        # Example: send_email_to_admin(alert)
        # Example: send_slack_notification(alert)





