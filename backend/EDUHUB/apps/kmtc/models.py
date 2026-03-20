# kmtc/models.py — FINAL VERSION (CORRECT RELATIONSHIPS)
from django.db import models
from django.utils.text import slugify
from apps.courses.models import Subject  # For entry requirements


class Campus(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=20, unique=True)  # e.g., NAIROBI, KISUMU
    city = models.CharField(max_length=100)
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
    GRADE_CHOICES = [
        ('A', 'A'), ('A-', 'A-'), ('B+', 'B+'), ('B', 'B'), ('B-', 'B-'),
        ('C+', 'C+'), ('C', 'C'), ('C-', 'C-'), ('D+', 'D+'), ('D', 'D'),
        ('D-', 'D-'), ('E', 'E'),
    ]
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
    # 2. Primary subject + required minimum grade
    subject = models.ForeignKey(
        Subject,
        on_delete=models.PROTECT,
        null=True, 
        blank=True,
        help_text="Primary required subject (e.g. Biology, English)"
    )
    required_subjects = models.ManyToManyField(
        Subject,
        blank=True,
        through='ProgramEntryRequirement',
        related_name='kmtc_programmes'
    )
     # 1. Overall KCSE mean grade (optional — many programmes have it)
    min_mean_grade = models.CharField(
        max_length=2,
        choices=GRADE_CHOICES,
        blank=True,
        null=True,
        help_text="Minimum KCSE mean grade (e.g. 'C', 'C-', 'D+')"
    )
    is_any_from_group = models.BooleanField(
        default=False,
        help_text="User needs ANY of the alternatives (not all)"
    )

    required_count_from_group = models.PositiveSmallIntegerField(
        default=1,
        blank=True,
        null=True,
        help_text="If is_any_from_group=True, how many subjects from alternatives are required (1 or 2)"
    )

    class Meta:
        verbose_name = "KMTC Programme"
        verbose_name_plural = "KMTC Programmes"
        ordering = ['name']

    def __str__(self):
        # Defensive: check if we have the expected fields
        name = getattr(self, 'name', 'Unnamed Programme')
        code = getattr(self, 'code', '—')
        return f"{name} ({code})"


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
            self.campuses.clear()  
class ProgramEntryRequirement(models.Model):
    """
    Captures full KMTC entry requirement rules per programme.
    - Mean grade (KCSE overall)
    - Mandatory subjects with min grade
    - Alternatives (English or Kiswahili)
    - "Any X from group" rules
    """
    GRADE_CHOICES = [
        ('A', 'A'), ('A-', 'A-'), ('B+', 'B+'), ('B', 'B'), ('B-', 'B-'),
        ('C+', 'C+'), ('C', 'C'), ('C-', 'C-'), ('D+', 'D+'), ('D', 'D'),
        ('D-', 'D-'), ('E', 'E'),
    ]

    programme = models.ForeignKey(
        Programme,
        on_delete=models.CASCADE,
        related_name='entry_requirements'
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name='program_entry_requirements',
        null=True,
        blank=True
    )
    min_grade = models.CharField(
        max_length=2,
        choices=GRADE_CHOICES,
        blank=True,
        null=True,
        help_text="Minimum grade for this subject (or alternatives)"
    )

    # 3. Alternative subjects (e.g. "English or Kiswahili")
    alternatives = models.ManyToManyField(
        Subject,
        blank=True,
        related_name='alternative_for_entry_requirements',
        help_text="Subjects that can substitute the primary one"
    )

    # 4. Rule modifiers
    is_mandatory = models.BooleanField(
        default=True,
        help_text="This subject (or one of its alternatives) is required"
    )

    class Meta:
        verbose_name = "Programme Entry Requirement"
        verbose_name_plural = "Programme Entry Requirements"

    def __str__(self):
        parts = []
        if self.subject:
            grade = self.min_grade if self.min_grade else "—"
            parts.append(f"{self.subject.name} ≥ {grade}")
        else:
            parts.append("No subject specified")
        
        if self.alternatives.exists():
            alts = ", ".join(s.name for s in self.alternatives.all())
            parts.append(f"OR alternatives: {alts}")
        
        if self.is_mandatory:
            parts.append("(Mandatory)")
        
        return f"Requirement for {self.programme}: {'; '.join(parts)}" or "Empty requirement"          