from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from .models import Medication, User

@shared_task
def send_low_stock_notification_task(medication_id):
    try:
        medication = Medication.objects.get(id=medication_id)
        subject = f'Low Stock Alert: {medication.name}'
        message = f"Medication {medication.name} is low on stock. Current: {medication.stock}"
        admin_emails = [user.email for user in User.objects.filter(role='admin') if user.email]
        
        if admin_emails:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                admin_emails,
                fail_silently=True,
            )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error sending low stock notification: {e}")

@shared_task
def send_expiry_notification_task(medication_id):
    try:
        medication = Medication.objects.get(id=medication_id)
        subject = f'Expiry Alert: {medication.name}'
        message = f"Medication {medication.name} expires on {medication.expiry}"
        admin_emails = [user.email for user in User.objects.filter(role='admin') if user.email]
        
        if admin_emails:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                admin_emails,
                fail_silently=True,
            )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error sending expiry notification: {e}")