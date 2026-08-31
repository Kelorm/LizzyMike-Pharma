"""
Celery configuration for LizzyMike Pharmacy System.

This file configures Celery with Redis as the message broker and
sets up the Celery Beat scheduler for periodic tasks.
"""

import os
from celery import Celery
from celery.schedules import crontab

# Set the default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pharmasys.settings_consolidated')

# Create the Celery app
app = Celery('pharmasys')

# Load configuration from Django settings with CELERY_ prefix
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks from all installed apps
app.autodiscover_tasks()

# =============================================================================
# CELERY BEAT SCHEDULE
# =============================================================================
# Configure periodic tasks using Celery Beat
app.conf.beat_schedule = {
    # Daily database backup at 11pm every day
    'daily-database-backup': {
        'task': 'core.tasks.database_backup_task',
        'schedule': crontab(hour=23, minute=0),  # 11:00 PM daily
    },
    
    # Low stock alert check every morning at 8am
    'daily-low-stock-check': {
        'task': 'core.tasks.check_low_stock_alerts',
        'schedule': crontab(hour=8, minute=0),  # 8:00 AM daily
    },
    
    # Weekly sales report every Monday at 7am
    'weekly-sales-report': {
        'task': 'core.tasks.generate_weekly_sales_report',
        'schedule': crontab(hour=7, minute=0, day_of_week='monday'),  # 7:00 AM every Monday
    },
}

# =============================================================================
# CELERY CONFIGURATION OPTIONS
# =============================================================================

# Timezone settings
app.conf.timezone = 'UTC'
app.conf.enable_utc = True

# Task serialization
app.conf.task_serializer = 'json'
app.conf.result_serializer = 'json'
app.conf.accept_content = ['json']

# Result backend configuration
# Use Redis as result backend
app.conf.result_backend = os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/1')

# Task result expiration (7 days)
app.conf.result_expires = 60 * 60 * 24 * 7

# Task routing
app.conf.task_routes = {
    'core.tasks.send_low_stock_notification_task': {'queue': 'notifications'},
    'core.tasks.send_expiry_notification_task': {'queue': 'notifications'},
    'core.tasks.database_backup_task': {'queue': 'backups'},
    'core.tasks.check_low_stock_alerts': {'queue': 'alerts'},
    'core.tasks.generate_weekly_sales_report': {'queue': 'reports'},
}

# Task priorities
app.conf.task_default_priority = 5
app.conf.worker_prefetch_multiplier = 4
app.conf.worker_max_tasks_per_child = 1000

# Task time limits
app.conf.task_soft_time_limit = 300  # 5 minutes
app.conf.task_time_limit = 600  # 10 minutes

# Broker settings
app.conf.broker_connection_retry_on_startup = True
app.conf.broker_connection_retry = True
app.conf.broker_connection_max_retries = 10

# Task tracking
app.conf.task_send_sent_event = True
app.conf.worker_send_task_events = True

# Task logs
app.conf.worker_log_format = '[%(asctime)s: %(levelname)s/%(processName)s] %(message)s'
app.conf.worker_task_log_format = '[%(asctime)s: %(levelname)s/%(processName)s][%(task_name)s(%(task_id)s)] %(message)s'

# =============================================================================
# MONITORING & HEALTH CHECKS
# =============================================================================

@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Debug task to test Celery connectivity."""
    print(f'Request: {self.request!r}')
    return {'status': 'success', 'worker': self.request.hostname}


# =============================================================================
# CELERY SIGNAL HANDLERS
# =============================================================================

@app.on_after_configure.connect
@app.task(name='worker_init_handler')
def worker_init_handler(**kwargs):
    """
    Handler called when worker starts.
    Can be used to initialize connections or verify setup.
    """
    print("Celery worker initialized successfully")