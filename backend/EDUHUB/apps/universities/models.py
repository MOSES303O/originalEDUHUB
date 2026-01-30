# apps/courses/models.py — FINAL, PROFESSIONAL VERSION
from django.db import models
from django.utils.text import slugify


class University(models.Model):
    TYPO_CHOICES = [
        ('public', 'Public University'),
        ('private', 'Private University'),
    ]
    name = models.CharField(max_length=255, unique=True)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    website = models.URLField(blank=True)
    accreditation = models.CharField(max_length=200, blank=True)
    logo = models.ImageField(upload_to='universities/logos/', blank=True, null=True)
    city = models.CharField(max_length=100)
    type = models.CharField(max_length=30, blank=True, null=True, choices=TYPO_CHOICES)
    is_active = models.BooleanField(default=True)
    ranking = models.PositiveIntegerField(null=True, blank=True)
    established_year = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        verbose_name_plural = "Universities"
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = slugify(self.name)[:20].upper()
        super().save(*args, **kwargs)


class Faculty(models.Model):
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Department(models.Model):
    faculty = models.ForeignKey(Faculty, on_delete=models.CASCADE, related_name='departments')
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, blank=True)

    class Meta:
        unique_together = ('faculty', 'name')
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.faculty})"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
class UniversityRequirement(models.Model):
    university = models.ForeignKey(University, on_delete=models.CASCADE, related_name='general_requirements')
    title = models.CharField(max_length=255)
    description = models.TextField()
    min_grade = models.CharField(max_length=5, blank=True, null=True)

    class Meta:
        ordering = ['university', 'title']

    def __str__(self):
        return f"{self.title} - {self.university.name}"