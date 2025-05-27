# backend/users/models.py
from django.db import models
from django.contrib.auth.models import User
from courses.models import Course

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    has_paid = models.BooleanField(default=False)
    selected_courses = models.ManyToManyField(Course, blank=True)
    
    def __str__(self):
        return f"{self.user.username}'s profile"