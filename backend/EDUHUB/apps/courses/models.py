# apps/courses/models.py
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid

class Subject(models.Model):
    """
    Model representing academic subjects (e.g., English, Math, Physics).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=10, unique=True)
    is_core = models.BooleanField(default=False)  # Core subjects like English, Math
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Subject'
        indexes = [
            models.Index(fields=['is_core']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"

class Program(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=300, unique=True)
    details = models.TextField(blank=True)
    category = models.CharField(
        max_length=100,
        choices=[
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
        ]
    )
    typical_duration_years = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(10)]
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    required_subjects = models.ManyToManyField(
        Subject,
        through='ProgramSubjectRequirement',
        related_name='programs'
    )
    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class CourseOffering(models.Model):
    """
    How a Program is offered at a specific University
    """
    MINIMUM_GRADE_CHOICES = [
        ('A', 'A'), ('A-', 'A-'), ('B+', 'B+'), ('B', 'B'), ('B-', 'B-'),
        ('C+', 'C+'), ('C', 'C'), ('C-', 'C-'), ('D+', 'D+'), ('D', 'D'),
        ('D-', 'D-'), ('E', 'E'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name='offerings')
    university = models.ForeignKey('universities.University', on_delete=models.CASCADE, related_name='offerings')
    code = models.CharField(
    max_length=20,
    unique=True,
    db_index=True
    )
    # University-specific details
    duration_years = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text="Actual duration at this university (may vary from standard)"
    )
    tuition_fee_per_year = models.DecimalField(max_digits=12, decimal_places=2)
    minimum_grade = models.CharField(max_length=5, choices=MINIMUM_GRADE_CHOICES, blank=True, null=True)
    intake_months = models.JSONField(default=list)  
    career_prospects = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    cluster_requirements = models.TextField(blank=True, help_text="e.g., Cluster 1: Math + Physics + Chemistry")

    class Meta:
        unique_together = ['program', 'university']
        ordering = ['program__name']
        indexes = [
            models.Index(fields=['university']),
            models.Index(fields=['tuition_fee_per_year']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.program.name} at {self.university.name}"

    @property
    def average_rating(self):
        reviews = self.reviews.filter(is_approved=True)
        if reviews.exists():
            return reviews.aggregate(models.Avg('rating'))['rating__avg']
        return 0

    @property
    def total_reviews(self):
        return self.reviews.filter(is_approved=True).count()

class ProgramSubjectRequirement(models.Model):
    GRADE_CHOICES = [
        ('A', 'A'), ('A-', 'A-'), ('B+', 'B+'), ('B', 'B'), ('B-', 'B-'),
        ('C+', 'C+'), ('C', 'C'), ('C-', 'C-'), ('D+', 'D+'), ('D', 'D'),
        ('D-', 'D-'), ('E', 'E'),
    ]

    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name='subject_requirements')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    minimum_grade = models.CharField(max_length=2, choices=GRADE_CHOICES, blank=True)
    is_mandatory = models.BooleanField(default=True)

    class Meta:
        unique_together = ['program', 'subject']
        ordering = ['subject__name']

    def __str__(self):
        mandatory = " (Mandatory)" if self.is_mandatory else ""
        grade = f" - Min: {self.minimum_grade}" if self.minimum_grade else ""
        return f"{self.program.name} → {self.subject.name}{grade}{mandatory}"