"""
Monitoring and health check utilities
"""
import logging
import psutil
import time
import os
from pathlib import Path
from datetime import timedelta
from django.db import connection
from django.core.cache import cache
from django.utils import timezone
from django.conf import settings
from django.db.models import Count, Sum, F
from django.contrib.sessions.models import Session
from .models import Sale, Medication, User, AuditTrail

logger = logging.getLogger(__name__)
alerts_logger = logging.getLogger('alerts')

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
        
        # Backup status
        health['checks']['backup'] = SystemMonitor.check_backup_status()
        
        # Active sessions
        health['checks']['sessions'] = SystemMonitor.check_active_sessions()
        
        # Application metrics
        health['checks']['application'] = SystemMonitor.check_application()
        
        # Determine overall status (degraded if any warning, unhealthy if any critical)
        has_warning = any(c.get('status') == 'warning' for c in health['checks'].values())
        has_unhealthy = any(c.get('status') == 'unhealthy' for c in health['checks'].values())
        
        if has_unhealthy:
            health['status'] = 'unhealthy'
        elif has_warning:
            health['status'] = 'degraded'
        
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
    
    @staticmethod
    def check_backup_status():
        """Check backup system status"""
        try:
            # Check for backup directory and files
            backup_dir = Path(settings.BASE_DIR) / 'backups'
            
            if not backup_dir.exists():
                return {
                    'status': 'unhealthy',
                    'message': 'Backup directory does not exist',
                    'last_backup': None
                }
            
            # Get list of backup files
            backup_files = sorted(
                backup_dir.glob('pharmasys_backup_*.sql'),
                key=lambda x: x.stat().st_mtime,
                reverse=True
            )
            
            if not backup_files:
                return {
                    'status': 'unhealthy',
                    'message': 'No backup files found',
                    'last_backup': None
                }
            
            latest_backup = backup_files[0]
            last_backup_time = timezone.datetime.fromtimestamp(
                latest_backup.stat().st_mtime,
                tz=timezone.utc
            )
            hours_since_backup = (timezone.now() - last_backup_time).total_seconds() / 3600
            
            # Alert if no backup in 24 hours
            if hours_since_backup > 24:
                status = 'unhealthy'
                message = f'No backup in {hours_since_backup:.1f} hours'
                alerts_logger.critical(f"[BACKUP-ALERT] {message}")
            elif hours_since_backup > 12:
                status = 'warning'
                message = f'Backup is {hours_since_backup:.1f} hours old'
            else:
                status = 'healthy'
                message = f'Latest backup: {hours_since_backup:.1f} hours ago'
            
            return {
                'status': status,
                'last_backup': last_backup_time.isoformat(),
                'hours_since_backup': round(hours_since_backup, 1),
                'backup_count': len(backup_files),
                'message': message
            }
        except Exception as e:
            logger.error(f"Backup status check failed: {e}")
            alerts_logger.error(f"[BACKUP-ERROR] {e}")
            return {
                'status': 'unhealthy',
                'error': str(e),
                'last_backup': None
            }
    
    @staticmethod
    def check_active_sessions():
        """Check number of active user sessions"""
        try:
            import django.contrib.sessions.models as session_models
            
            # Count active sessions
            now = timezone.now()
            active_sessions = session_models.Session.objects.filter(
                expire_date__gte=now
            ).count()
            
            # Try to get active user count from session data
            active_user_count = 0
            try:
                for session in session_models.Session.objects.filter(expire_date__gte=now):
                    session_data = session.get_decoded()
                    if '_auth_user_id' in session_data:
                        active_user_count += 1
            except:
                pass
            
            return {
                'status': 'healthy',
                'active_sessions': active_sessions,
                'active_users': active_user_count
            }
        except Exception as e:
            logger.error(f"Session check failed: {e}")
            return {
                'status': 'healthy',
                'active_sessions': 0,
                'active_users': 0,
                'error': str(e)
            }

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
                stock__lte=F('min_stock')
            ).count()
            
            # User metrics
            active_users = User.objects.filter(
                last_login__gte=timezone.now() - timezone.timedelta(days=7)
            ).count()
            
            # Alert if low stock items exist
            if low_stock_meds > 0:
                alerts_logger.warning(
                    f"[LOW-STOCK-ALERT] {low_stock_meds} medications below minimum stock"
                )
            
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
            stock__lte=F('min_stock')
        ).count()
        
        if low_stock_count > 0:
            alerts.append({
                'type': 'low_stock',
                'message': f'{low_stock_count} medications are low in stock',
                'severity': 'warning',
                'count': low_stock_count
            })
        
        # Expiring medications
        expiring_count = Medication.objects.filter(
            expiry__lte=timezone.now().date() + timezone.timedelta(days=30)
        ).count()
        
        if expiring_count > 0:
            alerts.append({
                'type': 'expiring_medications',
                'message': f'{expiring_count} medications expire within 30 days',
                'severity': 'warning',
                'count': expiring_count
            })
        
        # Disk space alert
        health = SystemMonitor.get_system_health()
        if health['checks']['disk']['status'] == 'unhealthy':
            disk_free = health['checks']['disk'].get('free_space', 'unknown')
            alerts.append({
                'type': 'disk_space',
                'message': f'Disk space critically low: {disk_free}',
                'severity': 'critical'
            })
        elif health['checks']['disk']['status'] == 'warning':
            disk_free = health['checks']['disk'].get('free_space', 'unknown')
            alerts.append({
                'type': 'disk_space',
                'message': f'Disk space low: {disk_free}',
                'severity': 'warning'
            })
        
        # Backup alert
        if health['checks']['backup']['status'] != 'healthy':
            backup_msg = health['checks']['backup'].get('message', 'Backup issue')
            severity = 'critical' if health['checks']['backup']['status'] == 'unhealthy' else 'warning'
            alerts.append({
                'type': 'backup_status',
                'message': backup_msg,
                'severity': severity
            })
        
        # System health alerts
        if health['status'] != 'healthy':
            alerts.append({
                'type': 'system_health',
                'message': f'System status: {health["status"]}',
                'severity': 'critical' if health['status'] == 'unhealthy' else 'warning'
            })
        
        return alerts
    
    @staticmethod
    def send_alert(alert):
        """Send alert notification with logging"""
        severity = alert.get('severity', 'warning').upper()
        msg = f"[{alert['type'].upper()}] {alert['message']}"
        
        if severity == 'CRITICAL':
            alerts_logger.critical(msg)
        elif severity == 'WARNING':
            alerts_logger.warning(msg)
        else:
            alerts_logger.info(msg)
        
        # In production, integrate with email/SMS/Slack notifications
        # Example: send_email_to_admin(alert)
        # Example: send_slack_notification(alert)
    
    @staticmethod
    def check_failed_logins(ip_address, threshold=3, time_window_minutes=30):
        """Check for repeated failed login attempts from an IP"""
        try:
            cache_key = f'failed_logins_{ip_address}'
            failed_attempts = cache.get(cache_key, [])
            now = timezone.now()
            
            # Remove attempts outside time window
            failed_attempts = [
                attempt for attempt in failed_attempts
                if (now - attempt).total_seconds() < (time_window_minutes * 60)
            ]
            
            if len(failed_attempts) >= threshold:
                alerts_logger.warning(
                    f"[BRUTE-FORCE-ALERT] {len(failed_attempts)} failed login attempts "
                    f"from IP {ip_address} in last {time_window_minutes} minutes"
                )
                return True
            
            return False
        except Exception as e:
            logger.error(f"Failed to check login attempts: {e}")
            return False
    
    @staticmethod
    def log_failed_login(ip_address):
        """Log a failed login attempt from an IP"""
        try:
            cache_key = f'failed_logins_{ip_address}'
            failed_attempts = cache.get(cache_key, [])
            failed_attempts.append(timezone.now())
            cache.set(cache_key, failed_attempts, 1800)  # 30 minutes
        except Exception as e:
            logger.error(f"Failed to log login attempt: {e}")





