"""
Authentication models for the EduPathway platform.

This module contains all authentication-related models including
User, UserProfile, UserSession, UserActivity, and UserSubject.
All models are designed to work consistently with core utils and payments.
"""

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.contrib.auth.base_user import BaseUserManager
from django.db import models
from django.utils import timezone
from django.core.validators import RegexValidator
from apps.courses.models import Subject,Course
import uuid
from apps.core.utils import calculate_age, standardize_phone_number,validate_kenyan_phone

# apps/authentication/models.py
class UserManager(BaseUserManager):
    def create_user(self, phone_number, password=None, email=None, **extra_fields):
        if not phone_number:
            raise ValueError("The Phone number must be set")
        phone_number = standardize_phone_number(phone_number)
        email = self.normalize_email(email) if email else None
        user = self.model(phone_number=phone_number, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, phone_number, password=None, email=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(phone_number, password, email, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(
        unique=False,
        blank=True,
        null=True,
        db_index=True,
        help_text="User's email address (optional)"
    )
    phone_number = models.CharField(
        max_length=15,
        unique=True,
        validators=[validate_kenyan_phone],
        help_text="Kenyan phone number for login and notifications"
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    is_premium = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    last_login = models.DateTimeField(blank=True, null=True)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'phone_number'
    REQUIRED_FIELDS = []  # Remove email from required fields
    
    class Meta:
        db_table = 'auth_user'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        indexes = [
            models.Index(fields=['phone_number']),
            models.Index(fields=['is_active', 'is_verified']),
            models.Index(fields=['date_joined']),
        ]
    
    def __str__(self):
        return self.phone_number
    
    def clean(self):
        super().clean()
        if self.phone_number:
            self.phone_number = standardize_phone_number(self.phone_number)
class UserProfile(models.Model):
    """
    Extended user profile information.
    
    Contains additional user data for personalization,
    payments, and educational preferences.
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile'
    )
    registration_ip = models.GenericIPAddressField(null=True, blank=True)
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_profile'
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'

class UserSession(models.Model):
    """
    User session tracking for security and analytics.
    
    Tracks user sessions across authentication and payments
    for security monitoring and fraud prevention.
    """
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sessions'
    )
    session_key = models.CharField(
        max_length=255,
        db_index=True,
        help_text="Session or JWT token identifier"
    )
    ip_address = models.GenericIPAddressField(
        help_text="User's IP address"
    )
    user_agent = models.TextField(
        help_text="User's browser user agent"
    )
    device_type = models.CharField(
        max_length=20,
        blank=True,
        help_text="Device type (mobile, tablet, desktop)"
    )
    browser = models.CharField(
        max_length=50,
        blank=True,
        help_text="Browser name"
    )
    os = models.CharField(
        max_length=50,
        blank=True,
        help_text="Operating system"
    )
    country = models.CharField(
        max_length=50,
        blank=True,
        help_text="Country based on IP"
    )
    city = models.CharField(
        max_length=100,
        blank=True,
        help_text="City based on IP"
    )
    
    # Session status
    is_active = models.BooleanField(
        default=True,
        help_text="Whether the session is currently active"
    )
    
    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Session creation time"
    )
    last_activity = models.DateTimeField(
        auto_now=True,
        help_text="Last activity timestamp"
    )
    logout_time = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Session logout time"
    )
    
    class Meta:
        db_table = 'user_session'
        verbose_name = 'User Session'
        verbose_name_plural = 'User Sessions'
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['session_key']),
            models.Index(fields=['ip_address']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.ip_address}"
    
    @property
    def duration(self):
        """Calculate session duration."""
        end_time = self.logout_time or timezone.now()
        return end_time - self.created_at


class UserActivity(models.Model):
    """
    User activity logging for audit and analytics.
    
    Tracks all user activities across authentication, payments,
    and other platform interactions for security and analytics.
    """
    
    ACTION_CHOICES = [
        # Authentication actions
        ('USER_REGISTERED', 'User Registered'),
        ('USER_LOGIN', 'User Login'),
        ('USER_LOGOUT', 'User Logout'),
        ('PASSWORD_CHANGED', 'Password Changed'),
        ('PASSWORD_RESET_REQUESTED', 'Password Reset Requested'),
        ('PASSWORD_RESET_COMPLETED', 'Password Reset Completed'),
        ('EMAIL_VERIFIED', 'Email Verified'),
        ('PROFILE_UPDATED', 'Profile Updated'),
        ('PHONE_VERIFIED', 'Phone Verified'),
        
        # Payment actions
        ('PAYMENT_INITIATED', 'Payment Initiated'),
        ('PAYMENT_COMPLETED', 'Payment Completed'),
        ('PAYMENT_FAILED', 'Payment Failed'),
        ('SUBSCRIPTION_CREATED', 'Subscription Created'),
        ('SUBSCRIPTION_CANCELLED', 'Subscription Cancelled'),
        ('REFUND_REQUESTED', 'Refund Requested'),
        ('REFUND_PROCESSED', 'Refund Processed'),
        
        # Course actions
        ('COURSE_VIEWED', 'Course Viewed'),
        ('COURSE_SELECTED', 'Course Selected'),
        ('COURSE_DESELECTED', 'Course Deselected'),
        ('APPLICATION_SUBMITTED', 'Application Submitted'),
        ('APPLICATION_UPDATED', 'Application Updated'),
        
        # Security actions
        ('SUSPICIOUS_ACTIVITY', 'Suspicious Activity'),
        ('ACCOUNT_LOCKED', 'Account Locked'),
        ('ACCOUNT_UNLOCKED', 'Account Unlocked'),
        ('SESSION_REVOKED', 'Session Revoked'),
        ('SECURITY_ALERT', 'Security Alert'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='activities'
    )
    action = models.CharField(
        max_length=50,
        choices=ACTION_CHOICES,
        db_index=True,
        help_text="Type of action performed"
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="When the action occurred"
    )
    ip_address = models.GenericIPAddressField(
        help_text="User's IP address"
    )
    details = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional details about the action"
    )
    success = models.BooleanField(
        default=True,
        help_text="Whether the action was successful"
    )
    error_message = models.TextField(
        blank=True,
        help_text="Error message if action failed"
    )
    request_id = models.CharField(
        max_length=100,
        blank=True,
        help_text="Request ID for tracking",
        default=uuid.uuid4
    )
    
    class Meta:
        db_table = 'user_activity'
        verbose_name = 'User Activity'
        verbose_name_plural = 'User Activities'
        indexes = [
            models.Index(fields=['user', 'action']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['ip_address']),
            models.Index(fields=['success']),
        ]
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.user.email} - {self.action} - {self.timestamp}"


class UserSubject(models.Model):
    """
    User's academic subjects and grades.
    
    Stores user's academic performance for course matching
    and university application requirements.
    """
    
    GRADE_CHOICES = [
        ('A', 'A'),
        ('A-', 'A-'),
        ('B+', 'B+'),
        ('B', 'B'),
        ('B-', 'B-'),
        ('C+', 'C+'),
        ('C', 'C'),
        ('C-', 'C-'),
        ('D+', 'D+'),
        ('D', 'D'),
        ('D-', 'D-'),
        ('E', 'E'),
    ]
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='subjects'
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        help_text="Reference to the subject"
    )
    grade = models.CharField(
        max_length=2,
        choices=GRADE_CHOICES,
        help_text="Grade achieved in the subject"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_subject'
        verbose_name = 'User Subject'
        verbose_name_plural = 'User Subjects'
        unique_together = ['user', 'subject']  # Prevent duplicate subjects per user
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['subject']),
            models.Index(fields=['grade']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.subject.name} ({self.grade})"
    
    @property
    def grade_points(self):
        """Convert grade to points for calculations."""
        grade_mapping = {
            'A': 12, 'A-': 11, 'B+': 10, 'B': 9, 'B-': 8,
            'C+': 7, 'C': 6, 'C-': 5, 'D+': 4, 'D': 3,
            'D-': 2, 'E': 1
        }
        return grade_mapping.get(self.grade, 0)
class UserSelectedCourse(models.Model):
    """
    Model to track courses selected by users
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='selected_courses')
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    is_applied = models.BooleanField(default=False)
    application_date = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'course']
        ordering = ['created_at']

    def __str__(self):
        return f"{self.user.phone_number} - {self.course.name}"
