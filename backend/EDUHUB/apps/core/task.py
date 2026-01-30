# apps/core/tasks.py
from celery import shared_task
from django.utils import timezone
from .models import User
import logging
from apps.payments.models import Payment, Transaction, MpesaCallback

logger = logging.getLogger(__name__)

@shared_task
def cleanup_expired_users():
    now = timezone.now()
    logger.info(f"Starting expired users cleanup at {now}")

    expired_users = User.objects.filter(
        account_expires_at__lt=now,
        account_expires_at__isnull=False
    )
    count = expired_users.count()

    if count == 0:
        logger.info("No expired users found")
        return

    deleted_count = 0
    for user in expired_users:
        try:
            user.subjects.all().delete()
            user.selected_courses.all().delete()
            # Delete payments & transactions too (as requested)
            Payment.objects.filter(user=user).delete()
            Transaction.objects.filter(payment__user=user).delete()
            MpesaCallback.objects.filter(payment__user=user).delete()

            user.is_active = False
            user.is_premium = False
            user.save(update_fields=['is_active', 'is_premium'])

            logger.info(f"Cleaned expired user: {user.phone_number} (ID: {user.id})")
            deleted_count += 1
        except Exception as e:
            logger.error(f"Failed to clean user {user.phone_number}: {e}")

    logger.info(f"Cleanup finished: {deleted_count}/{count} users cleaned")