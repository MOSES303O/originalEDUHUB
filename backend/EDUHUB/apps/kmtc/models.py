from django.db import models
from django.utils.text import slugify


class campus(models.Model):
    """
    Model representing a  or higher education institution.
    """
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    code = models.CharField(max_length=20, unique=True, help_text="campus code (e.g., BMT, KAREN)")
    description = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    campusRequirement=models.ForeignKey('campusRequirement', on_delete=models.CASCADE, related_name='campus', blank=True, null=True)
    class Meta:
        verbose_name = "campus"
        verbose_name_plural = "campuses"
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['code']),
            models.Index(fields=['city']),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Faculty(models.Model):
    """
    Model representing a faculty or school within a .
    """
    campo = models.ForeignKey(campus, on_delete=models.CASCADE, related_name='faculties')
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, blank=True)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name = "Faculty"
        verbose_name_plural = "Faculties"
        ordering = ['campo', 'name']
        unique_together = ('campo', 'name')

    def __str__(self):
        return f"{self.name} - {self.campo.name}"

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


class campusRequirement(models.Model):
    """
    Model representing general admission requirements for a .
    """
    campo = models.ForeignKey(campus, on_delete=models.CASCADE, related_name='requirements')
    title = models.CharField(max_length=255)
    description = models.TextField()
    min_grade = models.CharField(max_length=5, blank=True, help_text="Minimum overall grade required (e.g., B+)")

    class Meta:
        verbose_name = "campus Requirement"
        verbose_name_plural = "campus Requirements"
        ordering = ['campo', 'title']

    def __str__(self):
        return f"{self.title} - {self.campo.name}"
class programmes(models.Model):
    """
    Model representing a programme offered by a .
    """
    faculty = models.ForeignKey(Faculty, on_delete=models.CASCADE, related_name='programmes')
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    duration = models.CharField(max_length=50, blank=True, help_text="Duration of the programme (e.g., 4 years)")
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Programme"
        verbose_name_plural = "Programmes"
        ordering = ['faculty', 'name']
        unique_together = ('faculty', 'name')

    def __str__(self):
        return f"{self.name} - {self.faculty.name}"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)