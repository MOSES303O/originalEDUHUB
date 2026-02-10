# apps/courses/admin.py
from django.contrib import admin
from .models import Subject, Program, CourseOffering, ProgramSubjectRequirement
@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'is_core', 'is_active')
    search_fields = ('name', 'code')

class ProgramSubjectRequirementInline(admin.TabularInline):
    model = ProgramSubjectRequirement
    extra = 1
    autocomplete_fields = ['subject']
@admin.register(Program)
class ProgramAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'typical_duration_years','details','is_active') 
    list_filter = ('category', 'is_active', 'typical_duration_years')
    search_fields = ('name', 'category')
    inlines = [ProgramSubjectRequirementInline]
    ordering = ('name',)
class ProgramSubjectRequirementInline(admin.TabularInline):
    model = ProgramSubjectRequirement
    extra = 1
    autocomplete_fields = ['subject']
@admin.register(CourseOffering)
class CourseOfferingAdmin(admin.ModelAdmin):
    list_display = ('program', 'university', 'tuition_fee_per_year', 'code', 'duration_years', 'is_active','cluster_requirements')
    list_filter = ('program__category', 'university', 'is_active')
    search_fields = ('program__name', 'program__code', 'code', 'university__name')
    readonly_fields = ('average_rating', 'total_reviews')

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('program', 'university')