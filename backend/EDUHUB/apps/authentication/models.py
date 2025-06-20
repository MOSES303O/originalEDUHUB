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
from apps.core.utils import calculate_age, standardize_phone_number


class UserManager(BaseUserManager):
    """Custom user manager for email-based authentication."""
    
    def create_user(self, email, password=None, **extra_fields):
        """Create and return a regular user."""
        if not email:
            raise ValueError('The Email field must be set')
        
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """Create and return a superuser."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom User model with email-based authentication.
    
    Designed to work consistently with authentication, payments,
    and other apps throughout the platform.
    """
    
    email = models.EmailField(
        unique=True,
        db_index=True,
        help_text="User's email address (used for login)"
    )
    first_name = models.CharField(
        max_length=30,
        help_text="User's first name"
    )
    last_name = models.CharField(
        max_length=30,
        help_text="User's last name"
    )
    phone_number = models.CharField(
        max_length=15,
        blank=True,
        null=True,
        validators=[
            RegexValidator(
                regex=r'^\+254[17]\d{8}$',
                message="Phone number must be in format: '+254712345678'"
            )
        ],
        help_text="Kenyan phone number for M-Pesa and notifications"
    )
    
    # Account status fields
    is_active = models.BooleanField(
        default=True,
        help_text="Designates whether this user should be treated as active"
    )
    is_staff = models.BooleanField(
        default=False,
        help_text="Designates whether the user can log into admin site"
    )
    is_verified = models.BooleanField(
        default=False,
        help_text="Designates whether the user has verified their email"
    )
    is_premium = models.BooleanField(
        default=False,
        help_text="Designates whether the user has premium subscription"
    )
    
    # Timestamps
    date_joined = models.DateTimeField(
        default=timezone.now,
        help_text="Date when the user joined the platform"
    )
    last_login = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Last login timestamp"
    )
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']
    
    class Meta:
        db_table = 'auth_user'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['is_active', 'is_verified']),
            models.Index(fields=['date_joined']),
        ]
    
    def __str__(self):
        return self.email
    
    def get_full_name(self):
        """Return the user's full name."""
        return f"{self.first_name} {self.last_name}".strip()
    
    def get_short_name(self):
        """Return the user's first name."""
        return self.first_name
    
    @property
    def is_profile_complete(self):
        """Check if user profile is complete."""
        try:
            profile = self.profile
            return bool(
                self.first_name and 
                self.last_name and 
                self.phone_number and
                profile.date_of_birth and
                profile.county
            )
        except UserProfile.DoesNotExist:
            return False
    
    def clean(self):
        """Clean and validate user data."""
        super().clean()
        if self.phone_number:
            self.phone_number = standardize_phone_number(self.phone_number)


class UserProfile(models.Model):
    """
    Extended user profile information.
    
    Contains additional user data for personalization,
    payments, and educational preferences.
    """
    
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
        ('', 'Prefer not to say'),
    ]
    
    COUNTY_CHOICES = [
        ('nairobi', 'Nairobi'),
        ('mombasa', 'Mombasa'),
        ('kisumu', 'Kisumu'),
        ('nakuru', 'Nakuru'),
        ('eldoret', 'Eldoret'),
        ('thika', 'Thika'),
        ('malindi', 'Malindi'),
        ('kitale', 'Kitale'),
        ('garissa', 'Garissa'),
        ('kakamega', 'Kakamega'),
        ('other', 'Other'),
    ]
    
    STUDY_MODE_CHOICES = [
        ('full_time', 'Full Time'),
        ('part_time', 'Part Time'),
        ('online', 'Online'),
        ('hybrid', 'Hybrid'),
    ]
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile'
    )
    
    # Personal information
    date_of_birth = models.DateField(
        blank=True,
        null=True,
        help_text="User's date of birth"
    )
    gender = models.CharField(
        max_length=1,
        choices=GENDER_CHOICES,
        blank=True,
        help_text="User's gender"
    )
    county = models.CharField(
        max_length=20,
        choices=COUNTY_CHOICES,
        blank=True,
        help_text="User's county of residence"
    )
    
    # Educational preferences
    preferred_study_mode = models.CharField(
        max_length=20,
        choices=STUDY_MODE_CHOICES,
        blank=True,
        help_text="Preferred mode of study"
    )
    preferred_location = models.CharField(
        max_length=100,
        blank=True,
        help_text="Preferred study location"
    )
    career_interests = models.TextField(
        blank=True,
        help_text="User's career interests and goals"
    )
    
    # Profile customization
    avatar = models.ImageField(
        upload_to='avatars/',
        blank=True,
        null=True,
        help_text="User's profile picture"
    )
    bio = models.TextField(
        max_length=500,
        blank=True,
        help_text="User's biography"
    )
    
    # Notification preferences
    email_notifications = models.BooleanField(
        default=True,
        help_text="Receive email notifications"
    )
    sms_notifications = models.BooleanField(
        default=False,
        help_text="Receive SMS notifications"
    )
    marketing_emails = models.BooleanField(
        default=False,
        help_text="Receive marketing emails"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_profile'
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'
    
    def __str__(self):
        return f"{self.user.get_full_name()}'s Profile"
    
    @property
    def age(self):
        """Calculate user's age."""
        return calculate_age(self.date_of_birth)


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
        help_text="Request ID for tracking"
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
    
    EXAM_TYPE_CHOICES = [
        ('kcse', 'KCSE'),
        ('igcse', 'IGCSE'),
        ('ib', 'International Baccalaureate'),
        ('sat', 'SAT'),
        ('other', 'Other'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='subjects'
    )
    subject_name = models.CharField(
        max_length=100,
        help_text="Name of the subject"
    )
    grade = models.CharField(
        max_length=2,
        choices=GRADE_CHOICES,
        help_text="Grade achieved in the subject"
    )
    year = models.PositiveIntegerField(
        help_text="Year the exam was taken"
    )
    exam_type = models.CharField(
        max_length=20,
        choices=EXAM_TYPE_CHOICES,
        default='kcse',
        help_text="Type of examination"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_subject'
        verbose_name = 'User Subject'
        verbose_name_plural = 'User Subjects'
        unique_together = ['user', 'subject_name', 'year', 'exam_type']
        indexes = [
            models.Index(fields=['user', 'year']),
            models.Index(fields=['subject_name']),
            models.Index(fields=['grade']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.subject_name} ({self.grade})"
    
    @property
    def grade_points(self):
        """Convert grade to points for calculations."""
        grade_mapping = {
            'A': 12, 'A-': 11, 'B+': 10, 'B': 9, 'B-': 8,
            'C+': 7, 'C': 6, 'C-': 5, 'D+': 4, 'D': 3,
            'D-': 2, 'E': 1
        }
        return grade_mapping.get(self.grade, 0)
