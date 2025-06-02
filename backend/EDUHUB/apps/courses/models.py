from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
import uuid

User = get_user_model()


class University(models.Model):
    """
    Model representing universities and educational institutions
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, unique=True)
    code = models.CharField(max_length=10, unique=True)
    location = models.CharField(max_length=100)
    type = models.CharField(max_length=50, choices=[
        ('public', 'Public University'),
        ('private', 'Private University'),
        ('college', 'College'),
        ('technical', 'Technical Institute'),
    ])
    website = models.URLField(blank=True, null=True)
    description = models.TextField(blank=True)
    established_year = models.PositiveIntegerField(
        validators=[MinValueValidator(1800), MaxValueValidator(2030)],
        blank=True, null=True
    )
    logo = models.URLField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['type']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"


class Subject(models.Model):
    """
    Model representing academic subjects
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=10, unique=True)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=50, choices=[
        ('mathematics', 'Mathematics'),
        ('sciences', 'Sciences'),
        ('languages', 'Languages'),
        ('humanities', 'Humanities'),
        ('technical', 'Technical'),
        ('arts', 'Arts'),
    ])
    is_core = models.BooleanField(default=False)  # Core subjects like Math, English
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['category']),
            models.Index(fields=['is_core']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"


class Course(models.Model):
    """
    Model representing university courses/programs
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20)
    university = models.ForeignKey(University, on_delete=models.CASCADE, related_name='courses')
    description = models.TextField()
    duration_years = models.PositiveIntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)])
    
    # Entry requirements
    minimum_grade = models.CharField(max_length=5, choices=[
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
    ])
    required_subjects = models.ManyToManyField(Subject, through='CourseSubjectRequirement')
    
    # Course details
    category = models.CharField(max_length=100, choices=[
        ('engineering', 'Engineering'),
        ('medicine', 'Medicine & Health Sciences'),
        ('business', 'Business & Economics'),
        ('education', 'Education'),
        ('arts', 'Arts & Humanities'),
        ('sciences', 'Pure Sciences'),
        ('agriculture', 'Agriculture'),
        ('law', 'Law'),
        ('technology', 'Information Technology'),
        ('social_sciences', 'Social Sciences'),
    ])
    
    # Fees and costs
    tuition_fee_per_year = models.DecimalField(max_digits=10, decimal_places=2)
    application_fee = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    
    # Application details
    application_deadline = models.DateField(blank=True, null=True)
    intake_months = models.JSONField(default=list)  # e.g., [1, 9] for January and September
    
    # Additional info
    career_prospects = models.TextField(blank=True)
    accreditation = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        unique_together = ['code', 'university']
        indexes = [
            models.Index(fields=['category']),
            models.Index(fields=['minimum_grade']),
            models.Index(fields=['tuition_fee_per_year']),
            models.Index(fields=['is_active']),
            models.Index(fields=['university']),
        ]

    def __str__(self):
        return f"{self.name} - {self.university.name}"

    @property
    def average_rating(self):
        """Calculate average rating from reviews"""
        reviews = self.reviews.filter(is_approved=True)
        if reviews.exists():
            return reviews.aggregate(models.Avg('rating'))['rating__avg']
        return 0

    @property
    def total_reviews(self):
        """Get total number of approved reviews"""
        return self.reviews.filter(is_approved=True).count()


class CourseSubjectRequirement(models.Model):
    """
    Through model for Course-Subject relationship with specific requirements
    """
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    minimum_grade = models.CharField(max_length=5, choices=[
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
    ])
    is_mandatory = models.BooleanField(default=True)
    alternative_subjects = models.ManyToManyField(
        Subject, 
        related_name='alternative_for', 
        blank=True
    )

    class Meta:
        unique_together = ['course', 'subject']

    def __str__(self):
        return f"{self.course.name} - {self.subject.name} ({self.minimum_grade})"


class UserSelectedCourse(models.Model):
    """
    Model to track courses selected by users
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='selected_courses')
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    priority = models.PositiveIntegerField(default=1)  # 1 = highest priority
    notes = models.TextField(blank=True)
    is_applied = models.BooleanField(default=False)
    application_date = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'course']
        ordering = ['priority', 'created_at']

    def __str__(self):
        return f"{self.user.email} - {self.course.name}"


class CourseReview(models.Model):
    """
    Model for course reviews by users
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    rating = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    title = models.CharField(max_length=200)
    content = models.TextField()
    is_approved = models.BooleanField(default=False)
    is_anonymous = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['course', 'user']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.course.name} - {self.rating}/5 by {self.user.email}"


class CourseApplication(models.Model):
    """
    Model to track course applications
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='applications')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='applications')
    
    # Application status
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('submitted', 'Submitted'),
        ('under_review', 'Under Review'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('waitlisted', 'Waitlisted'),
    ], default='pending')
    
    # Application details
    application_number = models.CharField(max_length=50, unique=True, blank=True)
    submitted_at = models.DateTimeField(blank=True, null=True)
    documents_uploaded = models.JSONField(default=dict)
    
    # Tracking
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['user', 'course']
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.application_number:
            # Generate unique application number
            self.application_number = f"APP{timezone.now().year}{self.user.id.hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.application_number} - {self.user.email} - {self.course.name}"