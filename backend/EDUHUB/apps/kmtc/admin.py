# kmtc/admin.py — FINAL GOLD STANDARD (2025)
from django.contrib import admin
from django.utils.html import format_html

from .models import Campus, Faculty, Department, Programme, OfferedAt, ProgramEntryRequirement


# Inline for managing entry requirements directly from Programme
class ProgramEntryRequirementInline(admin.TabularInline):
    model = ProgramEntryRequirement
    extra = 1
    autocomplete_fields = ['subject']
    fields = ('subject', 'min_grade', 'is_mandatory', 'alternatives')
    readonly_fields = ('id',)
    verbose_name = "Entry Requirement"
    verbose_name_plural = "Entry Requirements"


@admin.register(Campus)
class CampusAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'city', 'programmes_count', 'is_active')
    list_filter = ('city', 'is_active')
    search_fields = ('name', 'code', 'city')
    readonly_fields = ('programmes_count',)
    fieldsets = (
        (None, {
            'fields': ('name', 'code', 'city', 'is_active')
        }),
    )

    def programmes_count(self, obj):
        count = obj.programmes_offered.count()
        return format_html(f'<b style="color:#16a34a;">{count}</b> programmes')
    programmes_count.short_description = "Programmes Offered"


@admin.register(Faculty)
class FacultyAdmin(admin.ModelAdmin):
    list_display = ('name', 'departments_count', 'programmes_count')
    search_fields = ('name',)
    readonly_fields = ('departments_count', 'programmes_count')

    def departments_count(self, obj):
        count = obj.departments.count()
        return format_html(f'<b>{count}</b>')
    departments_count.short_description = "Departments"

    def programmes_count(self, obj):
        count = Programme.objects.filter(department__faculty=obj).count()
        return format_html(f'<b style="color:#dc2626;">{count}</b>')
    programmes_count.short_description = "Total Programmes"


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'faculty', 'programmes_count')
    list_filter = ('faculty__name',)
    search_fields = ('name', 'faculty__name')

    def programmes_count(self, obj):
        count = obj.programmes.count()
        return format_html(f'<b style="color:#7c3aed;">{count}</b>')
    programmes_count.short_description = "Programmes"

@admin.register(Programme)
class ProgrammeAdmin(admin.ModelAdmin):
    # ────────────────────────────────────────────────
    # Show ALL fields — using custom methods where needed
    # ────────────────────────────────────────────────
    list_display = (
        'name',
        'code',
        'level',
        'department',
        'subject',                      # ForeignKey → OK
        'required_subjects_count',      # ManyToMany → count
        'required_subjects_preview',    # ManyToMany → short preview
        'min_mean_grade',
        'is_any_from_group',
        'required_count_from_group',
        'duration',
        'qualification_short',          # TextField → shortened
        'description_short',            # TextField → shortened
        'is_active',
        'campuses_count',               # reverse relation → count
    )

    # Useful filters and search
    list_filter = (
        'level',
        'is_active',
        'department__faculty',
        'min_mean_grade',
        'is_any_from_group',
    )
    search_fields = (
        'name', 'code', 'description',
        'department__name', 'department__faculty__name',
        'subject__name',
    )
    autocomplete_fields = ('department', 'subject')
    readonly_fields = ('campuses_count',)

    # Inlines
    inlines = [ProgramEntryRequirementInline]

    # Fieldsets in change form
    fieldsets = (
        (None, {
            'fields': (
                'name', 'code', 'department', 'level',
                'duration', 'qualification', 'is_active'
            )
        }),
        ('Entry Requirements', {
            'fields': (
                'subject', 'min_mean_grade',
                'is_any_from_group', 'required_count_from_group'
            )
        }),
        ('Description', {
            'fields': ('description',),
            'classes': ('collapse',)
        }),
        ('Statistics', {
            'fields': ('campuses_count',),
            'classes': ('collapse',)
        }),
    )

    # ────────────────────────────────────────────────
    # Custom display methods for every field
    # ────────────────────────────────────────────────

    def required_subjects_count(self, obj):
        return obj.required_subjects.count()
    required_subjects_count.short_description = "Req. Subjects (count)"

    def required_subjects_preview(self, obj):
        subjects = obj.required_subjects.values_list('name', flat=True)[:5]
        names = ", ".join(subjects)
        more = f" (+{obj.required_subjects.count() - len(subjects)} more)" if obj.required_subjects.count() > 5 else ""
        return names + more if names else "—"
    required_subjects_preview.short_description = "Required Subjects"

    def qualification_short(self, obj):
        return (obj.qualification[:60] + "...") if obj.qualification else "—"
    qualification_short.short_description = "Qualification"

    def description_short(self, obj):
        return (obj.description[:60] + "...") if obj.description else "—"
    description_short.short_description = "Description"

    def campuses_count(self, obj):
        count = obj.offered_at.count()
        return format_html(f'<b style="color:#0891b2;">{count}</b> campuses')
    campuses_count.short_description = "Offered At"

    # Optional: color-code some boolean/choice fields
    def is_active(self, obj):
        color = "#16a34a" if obj.is_active else "#dc2626"
        return format_html(f'<span style="color:{color};">{obj.is_active}</span>')
    is_active.boolean = True  # shows nice check/cross icon

    def is_any_from_group(self, obj):
        return format_html(
            '<span style="color:#16a34a;">ANY</span>'
            if obj.is_any_from_group else
            '<span style="color:#dc2626;">ALL</span>'
        )

@admin.register(OfferedAt)
class OfferedAtAdmin(admin.ModelAdmin):
    list_display = ('programme', 'campus_display')
    list_filter = ('offered_everywhere', 'campuses__city')
    autocomplete_fields = ('programme', 'campuses')
    filter_horizontal = ('campuses',)  # ← Nice for selecting many campuses

    def campus_display(self, obj):
        if obj.offered_everywhere:
            return format_html('<b style="color:green;">ALL CAMPUSES</b>')
        count = obj.campuses.count()
        return f"{count} campus(es)"
    campus_display.short_description = "Offered At"


@admin.register(ProgramEntryRequirement)
class ProgramEntryRequirementAdmin(admin.ModelAdmin):
    list_display = ('programme', 'subject', 'min_grade',)
    list_filter = ('programme__department__faculty', 'min_grade', 'is_mandatory')
    search_fields = ('programme__name', 'subject__name')
    autocomplete_fields = ('programme', 'subject')
    list_select_related = ('programme', 'subject')