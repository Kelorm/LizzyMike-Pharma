"""
Celery tasks for LizzyMike Pharmacy System.

This module contains all background tasks for the pharmacy system,
including notifications, reports, and scheduled jobs.
"""

import os
import shutil
import logging
from datetime import datetime, timedelta
from pathlib import Path

from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from django.db import connection, models

from .models import Medication, User, Sale, SaleItem
from .backup import DatabaseBackup

# Configure logging
logger = logging.getLogger(__name__)


# =============================================================================
# NOTIFICATION TASKS
# =============================================================================

@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def send_low_stock_notification_task(self, medication_id):
    """
    Send low stock notification email for a specific medication.
    
    Args:
        medication_id: ID of the medication with low stock
    """
    try:
        medication = Medication.objects.get(id=medication_id)
        subject = f'Low Stock Alert: {medication.name}'
        message = f"""
Pharmacy Inventory Alert

Medication: {medication.name}
Current Stock: {medication.stock} units
Minimum Level: {medication.min_stock} units

Please restock this medication as soon as possible to avoid stockouts.
        """
        admin_emails = list(
            User.objects.filter(role='admin', email__isnull=False)
            .exclude(email='')
            .values_list('email', flat=True)
        )
        
        if admin_emails:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                admin_emails,
                fail_silently=False,
            )
            logger.info(f'Low stock notification sent for medication {medication_id}')
        
        return {'status': 'success', 'medication_id': medication_id}
        
    except Medication.DoesNotExist:
        logger.error(f'Medication {medication_id} not found')
        return {'status': 'error', 'message': 'Medication not found'}
    except Exception as e:
        logger.error(f'Error sending low stock notification: {e}')
        try:
            self.retry(exc=e)
        except self.MaxRetriesExceededError:
            logger.error(f'Max retries exceeded for low stock notification: {medication_id}')
            return {'status': 'error', 'message': str(e)}


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def send_expiry_notification_task(self, medication_id):
    """
    Send expiry alert email for a specific medication.
    
    Args:
        medication_id: ID of the medication with upcoming expiry
    """
    try:
        medication = Medication.objects.get(id=medication_id)
        subject = f'Expiry Alert: {medication.name}'
        message = f"""
Pharmacy Expiry Alert

Medication: {medication.name}
Expiry Date: {medication.expiry}
Current Stock: {medication.stock} units

Please check this medication and take appropriate action.
        """
        admin_emails = list(
            User.objects.filter(role='admin', email__isnull=False)
            .exclude(email='')
            .values_list('email', flat=True)
        )
        
        if admin_emails:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                admin_emails,
                fail_silently=False,
            )
            logger.info(f'Expiry notification sent for medication {medication_id}')
        
        return {'status': 'success', 'medication_id': medication_id}
        
    except Medication.DoesNotExist:
        logger.error(f'Medication {medication_id} not found')
        return {'status': 'error', 'message': 'Medication not found'}
    except Exception as e:
        logger.error(f'Error sending expiry notification: {e}')
        try:
            self.retry(exc=e)
        except self.MaxRetriesExceededError:
            logger.error(f'Max retries exceeded for expiry notification: {medication_id}')
            return {'status': 'error', 'message': str(e)}


# =============================================================================
# SCHEDULED TASKS (CELERY BEAT)
# =============================================================================

@shared_task(bind=True, name='core.tasks.check_low_stock_alerts')
def check_low_stock_alerts(self):
    """
    Daily task to check all medications for low stock levels.
    Runs at 8:00 AM daily.
    
    Sends notifications for all medications below minimum stock.
    """
    try:
        low_stock_meds = Medication.objects.filter(
            stock__lte=models.F('min_stock')
        ).exclude(is_active=False)
        
        count = 0
        for medication in low_stock_meds:
            send_low_stock_notification_task.delay(medication.id)
            count += 1
        
        logger.info(f'Low stock check completed. Found {count} medications with low stock')
        return {
            'status': 'success',
            'medications_checked': count,
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f'Error checking low stock alerts: {e}')
        return {'status': 'error', 'message': str(e)}


@shared_task(bind=True, name='core.tasks.check_expiring_medications')
def check_expiring_medications(self, days_ahead=30):
    """
    Check for medications expiring within the specified number of days.
    
    Args:
        days_ahead: Number of days to look ahead for expiring medications
    """
    try:
        expiry_threshold = timezone.now().date() + timedelta(days=days_ahead)
        
        expiring_meds = Medication.objects.filter(
            expiry__lte=expiry_threshold,
            expiry__gte=timezone.now().date(),
            stock__gt=0
        ).exclude(is_active=False)
        
        count = 0
        for medication in expiring_meds:
            send_expiry_notification_task.delay(medication.id)
            count += 1
        
        logger.info(f'Expiry check completed. Found {count} medications expiring soon')
        return {
            'status': 'success',
            'medications_checked': count,
            'days_ahead': days_ahead,
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f'Error checking expiring medications: {e}')
        return {'status': 'error', 'message': str(e)}


from .backup import DatabaseBackup


# =============================================================================
# BACKUP TASKS (CELERY BEAT - SCHEDULED)
# =============================================================================

@shared_task(bind=True, name='core.tasks.database_backup_task')
def database_backup_task(self):
    """
    DAILY AUTOMATED BACKUP - Runs at 11:00 PM daily
    
    Creates a PostgreSQL backup using pg_dump.
    - Saves to /app/backups/ (Docker) or Backend/backups/ (local)
    - Keeps last 30 daily backups automatically
    - Copies backup to USB drive (D:\\ on Windows) if available
    - Alerts if USB is not connected
    
    CRITICAL: This backup cannot be lost!
    """
    try:
        db_backup = DatabaseBackup()
        result = db_backup.create_backup()
        
        if result["status"] == "success":
            logger.info(
                f"[BACKUP-TASK] SUCCESS: {result['filename']} ({result['size']} bytes)"
            )
        else:
            logger.error(f"[BACKUP-TASK] FAILED: {result['error']}")
            # Still return success for celery to mark task as complete
            # But the error is logged
        
        return result
        
    except Exception as e:
        logger.error(f"[BACKUP-TASK] Exception: {e}", exc_info=True)
        return {"status": "error", "error": str(e)}


@shared_task(bind=True, name='core.tasks.verify_latest_backup')
def verify_latest_backup():
    """
    BACKUP VERIFICATION TASK - Can run after daily backup
    
    Verifies the latest backup by:
    - Checking file exists and has minimum size
    - Comparing backup against live database
    - Logging BACKUP OK or BACKUP FAILED
    
    Runs after backup to catch issues early.
    """
    try:
        db_backup = DatabaseBackup()
        backups = db_backup.list_backups(limit=1)
        
        if not backups:
            logger.error("[VERIFY-BACKUP] No backups found to verify")
            return {"status": "error", "error": "No backups found"}
        
        latest_backup = backups[0]
        logger.info(f"[VERIFY-BACKUP] Verifying: {latest_backup['filename']}")
        
        result = db_backup.verify_backup(latest_backup["path"])
        
        if result["status"] == "ok":
            logger.info(
                f"[VERIFY-BACKUP] ✓ BACKUP OK - {latest_backup['filename']} verified"
            )
        else:
            logger.error(
                f"[VERIFY-BACKUP] ✗ BACKUP FAILED - {result.get('message', 'Unknown error')}"
            )
        
        return result
        
    except Exception as e:
        logger.error(f"[VERIFY-BACKUP] Exception: {e}", exc_info=True)
        return {"status": "error", "error": str(e)}


@shared_task(bind=True, name='core.tasks.weekly_usb_backup')
def weekly_usb_backup():
    """
    WEEKLY USB BACKUP - Runs every Sunday at midnight
    
    Ensures USB drive has a complete copy of latest backup.
    - Only copies if USB is connected (D:\\ on Windows)
    - Creates PharmacyBackups folder on USB
    - Keeps all weekly backups on USB for disaster recovery
    
    Alert: If USB is not detected, logs a warning
    """
    try:
        db_backup = DatabaseBackup()
        
        if not db_backup.usb_backup_dir:
            logger.warning(
                "[USB-BACKUP] ⚠️  USB drive not detected! "
                "Connect USB drive (D:) to create backup copies"
            )
            return {
                "status": "warning",
                "error": "USB drive not detected",
                "expected_path": "D:\\PharmacyBackups",
            }
        
        backups = db_backup.list_backups(limit=5)
        if not backups:
            logger.error("[USB-BACKUP] No backups to copy to USB")
            return {"status": "error", "error": "No backups found"}
        
        # Copy all recent backups to USB
        copied_count = 0
        for backup in backups:
            if db_backup._backup_to_usb(backup["path"], backup["filename"]):
                copied_count += 1
        
        logger.info(
            f"[USB-BACKUP] ✓ SUCCESS: Copied {copied_count} backup(s) to USB at {db_backup.usb_backup_dir}"
        )
        return {
            "status": "success",
            "backups_copied": copied_count,
            "usb_path": db_backup.usb_backup_dir,
        }
        
    except Exception as e:
        logger.error(f"[USB-BACKUP] Exception: {e}", exc_info=True)
        return {"status": "error", "error": str(e)}


@shared_task(bind=True, name='core.tasks.cleanup_old_backups')
def cleanup_old_backups():
    """
    DAILY BACKUP CLEANUP - Runs daily
    
    Removes backups older than 30 days.
    - Only keeps the last 30 days of daily backups
    - Logs which backups are deleted
    - Runs automatically to free disk space
    """
    try:
        db_backup = DatabaseBackup()
        db_backup._cleanup_old_backups()
        
        logger.info(
            f"[CLEANUP] Backup cleanup completed - keeping last {db_backup.retention_days} days"
        )
        return {
            "status": "success",
            "retention_days": db_backup.retention_days,
        }
        
    except Exception as e:
        logger.error(f"[CLEANUP] Exception: {e}", exc_info=True)
        return {"status": "error", "error": str(e)}


@shared_task(bind=True, name='core.tasks.generate_weekly_sales_report')
def generate_weekly_sales_report(self):
    """
    Weekly task to generate sales report.
    Runs every Monday at 7:00 AM.
    
    Generates a summary of sales for the past week and emails it to admins.
    """
    try:
        # Calculate date range for the past week
        end_date = timezone.now()
        start_date = end_date - timedelta(days=7)
        
        # Get sales data
        sales = Sale.objects.filter(
            created_at__gte=start_date,
            created_at__lte=end_date
        )
        
        total_sales = sales.count()
        total_revenue = sum(sale.total_amount for sale in sales)
        
        # Get top selling medications
        sale_ids = sales.values_list('id', flat=True)
        top_items = SaleItem.objects.filter(
            sale_id__in=sale_ids
        ).values('medication__name').annotate(
            total_quantity=models.Sum('quantity')
        ).order_by('-total_quantity')[:10]
        
        # Generate report
        top_items_list = [f"- {item['medication__name']}: {item['total_quantity']} units" for item in top_items]
        
        report = f"""
Pharmacy Weekly Sales Report
=============================
Period: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}

Summary:
- Total Sales: {total_sales}
- Total Revenue: ₦{total_revenue:,.2f}
- Average Sale Value: ₦{total_revenue/total_sales:,.2f if total_sales > 0 else 0}

Top Selling Medications:
{chr(10).join(top_items_list)}

Generated: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}
        """
        
        # Send report to admins
        admin_emails = list(
            User.objects.filter(role='admin', email__isnull=False)
            .exclude(email='')
            .values_list('email', flat=True)
        )
        
        if admin_emails:
            send_mail(
                'Weekly Sales Report',
                report,
                settings.DEFAULT_FROM_EMAIL,
                admin_emails,
                fail_silently=False,
            )
            logger.info('Weekly sales report sent to admins')
        
        logger.info(f'Weekly sales report generated: {total_sales} sales, ₦{total_revenue:,.2f} revenue')
        return {
            'status': 'success',
            'total_sales': total_sales,
            'total_revenue': float(total_revenue),
            'period_start': start_date.isoformat(),
            'period_end': end_date.isoformat(),
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f'Error generating weekly sales report: {e}')
        return {'status': 'error', 'message': str(e)}


# =============================================================================
# UTILITY TASKS
# =============================================================================

@shared_task(bind=True, name='core.tasks.cleanup_old_sessions')
def cleanup_old_sessions(self):
    """
    Periodic task to clean up old sessions.
    """
    try:
        from django.contrib.sessions.models import Session
        from django.utils import timezone
        
        expired_sessions = Session.objects.filter(
            expire_date__lt=timezone.now()
        )
        count = expired_sessions.count()
        expired_sessions.delete()
        
        logger.info(f'Cleaned up {count} expired sessions')
        return {'status': 'success', 'sessions_deleted': count}
        
    except Exception as e:
        logger.error(f'Error cleaning up sessions: {e}')
        return {'status': 'error', 'message': str(e)}


@shared_task(bind=True, name='core.tasks.health_check')
def health_check(self):
    """
    Health check task to verify Celery is working.
    """
    return {
        'status': 'healthy',
        'timestamp': timezone.now().isoformat(),
        'service': 'celery'
    }


# =============================================================================
# BULK OPERATIONS
# =============================================================================

@shared_task(bind=True, name='core.tasks.bulk_send_low_stock_notifications')
def bulk_send_low_stock_notifications(self):
    """
    Bulk task to send low stock notifications for all medications below threshold.
    """
    try:
        low_stock_meds = Medication.objects.filter(
            stock__lte=models.F('min_stock'),
            is_active=True
        )
        
        results = []
        for medication in low_stock_meds:
            result = send_low_stock_notification_task.delay(medication.id)
            results.append({
                'medication_id': medication.id,
                'task_id': str(result)
            })
        
        logger.info(f'Queued {len(results)} low stock notifications')
        return {
            'status': 'success',
            'notifications_queued': len(results),
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f'Error sending bulk low stock notifications: {e}')
        return {'status': 'error', 'message': str(e)}