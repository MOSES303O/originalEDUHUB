from django.db import models
from django.utils.text import slugify


class University(models.Model):
    """
    Model representing a university or higher education institution.
    """
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    code = models.CharField(max_length=20, unique=True, help_text="University code (e.g., UON, KU)")
    description = models.TextField(blank=True)
    website = models.URLField(blank=True)
    logo = models.ImageField(upload_to='universities/logos/', blank=True, null=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    type = models.CharField(max_length=50, choices=[
        ('public', 'Public University'),
        ('private', 'Private University'),
        ])    
    is_active = models.BooleanField(default=True)
    ranking = models.PositiveIntegerField(null=True, blank=True, help_text="National ranking")
    established_year = models.PositiveIntegerField(null=True, blank=True)    

    class Meta:
        verbose_name = "University"
        verbose_name_plural = "Universities"
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['code']),
            models.Index(fields=['city']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Faculty(models.Model):
    """
    Model representing a faculty or school within a university.
    """
    university = models.ForeignKey(University, on_delete=models.CASCADE, related_name='faculties')
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Faculty"
        verbose_name_plural = "Faculties"
        ordering = ['university', 'name']
        unique_together = ('university', 'name')

    def __str__(self):
        return f"{self.name} - {self.university.name}"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Department(models.Model):
    """
    Model representing a department within a faculty.
    """
    faculty = models.ForeignKey(Faculty, on_delete=models.CASCADE, related_name='departments')
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Department"
        verbose_name_plural = "Departments"
        ordering = ['faculty', 'name']
        unique_together = ('faculty', 'name')

    def __str__(self):
        return f"{self.name} - {self.faculty.name}"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class UniversityRequirement(models.Model):
    """
    Model representing general admission requirements for a university.
    """
    university = models.ForeignKey(University, on_delete=models.CASCADE, related_name='requirements')
    title = models.CharField(max_length=255)
    description = models.TextField()
    min_grade = models.CharField(max_length=5, blank=True, help_text="Minimum overall grade required (e.g., B+)")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "University Requirement"
        verbose_name_plural = "University Requirements"
        ordering = ['university', 'title']

    def __str__(self):
        return f"{self.title} - {self.university.name}"
