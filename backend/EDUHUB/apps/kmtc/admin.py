# kmtc/admin.py — FINAL GOLD STANDARD (2025)
from django.contrib import admin
from django.utils.html import format_html
from .models import Campus, Faculty, Department, Programme, OfferedAt


@admin.register(Campus)
class CampusAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'city', 'programmes_count', 'is_active')
    list_filter = ('city', 'is_active')
    search_fields = ('name', 'code', 'city')
    readonly_fields = ('programmes_count',)
    fieldsets = (
        (None, {
            'fields': ('name','code', 'city', 'is_active')
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
    list_display = ('name', 'code', 'level', 'department', 'campuses_count', 'is_active')
    list_filter = ('level', 'is_active', 'department__faculty')
    search_fields = ('name', 'code', 'description', 'department__name', 'department__faculty__name')
    autocomplete_fields = ('department',)
    readonly_fields = ('campuses_count',)

    fieldsets = (
        (None, {
            'fields': ('name', 'code', 'department', 'level', 'duration', 'qualification', 'is_active')
        }),
        ('Description', {
            'fields': ('description',),
            'classes': ('collapse',)
        }),
        ('Stats', {
            'fields': ('campuses_count',),
            'classes': ('collapse',)
        }),
    )

    def campuses_count(self, obj):
        count = obj.offered_at.count()
        return format_html(f'<b style="color:#0891b2;">{count}</b> campuses')
    campuses_count.short_description = "Offered At"

@admin.register(OfferedAt)
class OfferedAtAdmin(admin.ModelAdmin):
    list_display = ('programme', 'campus_display')
    list_filter = ('offered_everywhere', 'campuses__city')
    autocomplete_fields = ('programme', 'campuses')
    filter_horizontal = ('campuses',)  

    def campus_display(self, obj):
        if obj.offered_everywhere:
            return format_html('<b style="color:green;">ALL CAMPUSES</b>')
        count = obj.campuses.count()
        return f"{count} campus(es)"
    campus_display.short_description = "Offered At"