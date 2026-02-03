# apps/authentication/signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import UserSubject, User
from apps.courses.utils import CourseMatchingEngine  # Import the engine class

@receiver([post_save, post_delete], sender=UserSubject)
def recalculate_user_cluster_points(sender, instance, **kwargs):
    """
    Automatically recalculate and save user's cluster_points whenever
    UserSubject is created, updated, or deleted.
    """
    user = instance.user
    engine = CourseMatchingEngine()

    # Get all current subjects for this user
    user_subjects = UserSubject.objects.filter(user=user, grade__isnull=False)

    if user_subjects.count() < 7:
        # If less than 7 subjects → reset to default (0.000)
        if user.cluster_points != 0.000:
            user.cluster_points = 0.000
            user.save(update_fields=['cluster_points'])
    else:
        # Calculate from best 7 subjects
        calculated = engine.calculate_cluster_points_from_subjects(user_subjects)
        if user.cluster_points != calculated:
            user.cluster_points = calculated
            user.save(update_fields=['cluster_points'])