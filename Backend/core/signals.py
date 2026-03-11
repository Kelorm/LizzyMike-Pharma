from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.db import transaction
from .models import Medication
from .tasks import send_low_stock_notification_task, send_expiry_notification_task

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