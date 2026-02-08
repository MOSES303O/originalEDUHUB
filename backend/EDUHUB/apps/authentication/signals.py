# apps/authentication/signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import UserSubject
import logging
from apps.courses.utils import CourseMatchingEngine  # Import the engine class

logger = logging.getLogger(__name__)

@receiver([post_save, post_delete], sender=UserSubject)
def recalculate_user_cluster_points(sender, instance, **kwargs):
    """
    Recalculate user's cluster points after any change to their subjects.
    Uses the current CourseMatchingEngine logic.
    """
    user = instance.user
    
    # Get all current graded subjects for this user
    user_subjects = user.subjects.filter(grade__isnull=False).select_related('subject')
    
    if user_subjects.count() < 7:
        # Too few subjects — reset to None or 0
        user.cluster_points =  00.000
        user.save(update_fields=['cluster_points'])
        return

    engine = CourseMatchingEngine()
    
    # Temporary: use cluster 1 (or infer from user's most common interest)
    # Better: later replace with user-selected cluster or average
    cluster_number = 1  # ← CHANGE THIS LATER
    
    try:
        new_points = engine.calculate_cluster_points(user_subjects, cluster_number)
        user.cluster_points = new_points if new_points > 0 else None
        user.save(update_fields=['cluster_points'])
    except Exception as e:
        logger.exception(f"Failed to recalculate cluster points for user {user.phone_number}")
        # Don't crash admin — just skip