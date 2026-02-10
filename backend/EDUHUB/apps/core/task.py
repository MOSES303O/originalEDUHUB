# apps/core/tasks.py
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from apps.authentication.models import User, UserSubject, UserSelectedCourse
from apps.payments.models import Payment, Transaction, MpesaCallback, Subscription
import logging

logger = logging.getLogger(__name__)

@shared_task
def cleanup_expired_subscriptions_and_users():
    now = timezone.now()
    logger.info(f"Starting cleanup task at {now}")

    expired_subscriptions = Subscription.objects.filter(
        end_date__lt=now - timedelta(hours=6),
        end_date__isnull=False
    )

    payment_deleted = 0
    for sub in expired_subscriptions:
        try:
            # Delete only payment-related records
            Payment.objects.filter(subscription=sub).delete()
            Transaction.objects.filter(payment__subscription=sub).delete()
            MpesaCallback.objects.filter(payment__subscription=sub).delete()

            # Mark subscription inactive (keep record for audit/renewal eligibility)
            sub.active = False
            sub.is_renewal_eligible = now <= (sub.end_date + timedelta(hours=24))
            sub.save(update_fields=['active', 'is_renewal_eligible'])

            payment_deleted += 1
            logger.info(f"Deleted payment data for expired subscription {sub.id} (user: {sub.user.phone_number})")
        except Exception as e:
            logger.error(f"6h cleanup failed for subscription {sub.id}: {e}")

    # === PHASE 2: 24-hour cleanup (user content + user account) ===
    expired_users = User.objects.filter(
        account_expires_at__lt=now,
        account_expires_at__isnull=False
    )

    users_processed = 0
    for user in expired_users.iterator():
        try:
            # Delete user-generated content
            UserSubject.objects.filter(user=user).delete()
            UserSelectedCourse.objects.filter(user=user).delete()

            # Soft-delete user (recommended for audit/recovery)
            user.is_active = False
            user.is_premium = False
            user.premium_expires_at = None
            user.account_expires_at = None
            user.save(update_fields=[
                'is_active', 'is_premium',
                'premium_expires_at', 'account_expires_at'
            ])

            # Alternative: Hard delete (uncomment if you want permanent removal)
            # user.delete()

            users_processed += 1
            logger.info(f"24h cleanup completed: user {user.phone_number} deactivated/deleted")
        except Exception as e:
            logger.error(f"24h cleanup failed for user {user.phone_number}: {e}")

    logger.info(
        f"Cleanup summary: {payment_deleted} subscriptions cleaned (6h), "
        f"{users_processed} users cleaned (24h)"
    )