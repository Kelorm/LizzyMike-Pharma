from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.db import transaction
from .models import Medication, BusinessDay
from .tasks import send_low_stock_notification_task, send_expiry_notification_task
from .audit_log import log_audit


@receiver(pre_save, sender=Medication)
def check_low_stock_alert(sender, instance, **kwargs):
    """Send alert when medication stock is low"""
    try:
        if instance.pk:
            old_instance = Medication.objects.get(pk=instance.pk)
            # Check if stock just went below minimum
            if (old_instance.stock > old_instance.min_stock and
                instance.stock <= instance.min_stock):

                # Send low stock alert
                send_low_stock_notification_task.delay(instance.id)
    except Medication.DoesNotExist:
        # New medication, no need to check
        pass


@receiver(pre_save, sender=Medication)
def check_expiry_alert(sender, instance, **kwargs):
    """Send alert when medication is expiring soon"""
    from django.utils import timezone
    thirty_days = timezone.now().date() + timezone.timedelta(days=30)
    if instance.expiry <= thirty_days:
        send_expiry_notification_task.delay(instance.id)


@receiver(pre_save, sender=BusinessDay)
def business_day_capture_previous_status(sender, instance, **kwargs):
    """Remember prior status so open/close/reopen can be audited on save."""
    if not instance.pk:
        instance._audit_prev_status = None
        return
    try:
        instance._audit_prev_status = (
            BusinessDay.objects.filter(pk=instance.pk)
            .values_list('status', flat=True)
            .first()
        )
    except Exception:
        instance._audit_prev_status = None


@receiver(post_save, sender=BusinessDay)
def business_day_audit_status_change(sender, instance, created, **kwargs):
    """
    Always record trading-day open / reopen / close in AuditTrail.
    Uses opened_by / closed_by so every code path (API, admin, scripts) is covered.
    """
    prev = getattr(instance, '_audit_prev_status', None)

    if created or (prev is None and instance.status == BusinessDay.STATUS_OPEN):
        action = 'open'
        user = instance.opened_by
        details = {
            'business_date': str(instance.business_date),
            'opening_float': str(instance.opening_float),
            'open_notes': instance.open_notes or '',
            'opened_by': getattr(instance.opened_by, 'username', None),
        }
    elif prev == BusinessDay.STATUS_CLOSED and instance.status == BusinessDay.STATUS_OPEN:
        action = 'reopen'
        user = instance.opened_by
        details = {
            'business_date': str(instance.business_date),
            'opening_float': str(instance.opening_float),
            'open_notes': instance.open_notes or '',
            'opened_by': getattr(instance.opened_by, 'username', None),
        }
    elif prev == BusinessDay.STATUS_OPEN and instance.status == BusinessDay.STATUS_CLOSED:
        action = 'close'
        user = instance.closed_by
        details = {
            'business_date': str(instance.business_date),
            'closing_cash': (
                str(instance.closing_cash) if instance.closing_cash is not None else None
            ),
            'close_notes': instance.close_notes or '',
            'closed_by': getattr(instance.closed_by, 'username', None),
        }
    else:
        return

    def _write():
        log_audit(
            user=user,
            action=action,
            entity='business_day',
            entity_id=str(instance.id),
            details=details,
        )

    transaction.on_commit(_write)
