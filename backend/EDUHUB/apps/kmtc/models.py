# kmtc/models.py — FINAL VERSION (CORRECT RELATIONSHIPS)
from django.db import models
from django.utils.text import slugify


class Campus(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=20, unique=True)  # e.g., NAIROBI, KISUMU
    city = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    requirements = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "KMTC Campus"
        verbose_name_plural = "KMTC Campuses"
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = slugify(self.name)
        super().save(*args, **kwargs)

# Faculty exists independently — can be offered at many campuses
class Faculty(models.Model):
    name = models.CharField(max_length=255, unique=True)  # e.g., "Rehabilitative Sciences"
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


# Department belongs to a Faculty — can be offered at many campuses
class Department(models.Model):
    faculty = models.ForeignKey(Faculty, on_delete=models.CASCADE, related_name='departments')
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, blank=True)

    class Meta:
        unique_together = ('faculty', 'name')
        ordering = ['name']

    def __str__(self):
        return f"{self.name} - {self.faculty}"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


# Programme belongs to a Department
class Programme(models.Model):
    LEVEL_CHOICES = [
        ('certificate', 'Certificate'),
        ('diploma', 'Diploma'),
        ('higher_diploma', 'Higher Diploma'),
        ('short_course', 'Short Course'),
    ]

    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='programmes')
    name = models.CharField(max_length=500)
    code = models.CharField(max_length=50, unique=True)  # e.g., KMTC-NUR
    duration = models.CharField(max_length=100, blank=True)
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='diploma')
    qualification = models.TextField(blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "KMTC Programme"
        verbose_name_plural = "KMTC Programmes"
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"


class OfferedAt(models.Model):
    programme = models.ForeignKey(Programme, on_delete=models.CASCADE, related_name='offered_at')
    campuses = models.ManyToManyField(
        Campus,
        blank=True,
        related_name='programmes_offered',
        help_text="Leave blank + check 'Offered Everywhere' if available in all campuses"
    )
    offered_everywhere = models.BooleanField(
        default=False,
        help_text="Check if this programme is offered at ALL KMTC campuses"
    )
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = ('programme',)  # No campus constraint when offered everywhere
        verbose_name = "Programme Offered At"

    def __str__(self):
        if self.offered_everywhere:
            return f"{self.programme} → ALL CAMPUSES"
        count = self.campuses.count()
        return f"{self.programme} → {count} campus(es)"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)  # Save first → get ID
        if self.offered_everywhere:
            self.campuses.clear()  # Now safe to clear