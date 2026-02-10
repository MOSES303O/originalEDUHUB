# universities/admin.py — FINAL & GOLD STANDARD
from django.contrib import admin
from django.utils.html import format_html
from .models import (
    University,
    Faculty,
    Department,
    UniversityRequirement,
)
@admin.register(University)
class UniversityAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'city', 'type', 'ranking','description','is_active', 'get_courses_count')
    list_filter = ('type', 'city', 'is_active', 'ranking')
    search_fields = ('name', 'code', 'city', 'description')
    fieldsets = (
        (None, {
            'fields': ('name','code', 'type', 'city')
        }),
        ('Details', {
            'fields': ('description', 'website', 'accreditation', 'logo', 'ranking', 'established_year'),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('is_active',),
        }),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.prefetch_related('offerings') 
    def get_courses_count(self, obj):
        return obj.offerings.count() 
    get_courses_count.short_description = "Courses Offered"
@admin.register(Faculty)
class FacultyAdmin(admin.ModelAdmin):
    list_display = ('name', 'departments_count')
    search_fields = ('name',)
    readonly_fields = ('departments_count',)

    def departments_count(self, obj):
        count = obj.departments.count()
        return format_html(f'<b>{count}</b> departments')
    departments_count.short_description = "Departments"


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'faculty', 'courses_count')
    list_filter = ('faculty__name','slug')
    search_fields = ('name', 'faculty__name')

    def courses_count(self, obj):
        count = obj.courses.count()
        return format_html(f'<b>{count}</b> courses')
    courses_count.short_description = "Courses"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('faculty')

@admin.register(UniversityRequirement)
class UniversityRequirementAdmin(admin.ModelAdmin):
    list_display = ('university', 'title', 'min_grade')
    list_filter = ('university__name', 'min_grade')
    search_fields = ('university__name', 'title', 'description')
    autocomplete_fields = ('university',)