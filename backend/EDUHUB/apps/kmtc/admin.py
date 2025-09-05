from django.contrib import admin
from .models import campus, Faculty, Department, campusRequirement, programmes

# Inlines
class DepartmentInline(admin.TabularInline):
    model = Department
    extra = 1 

class FacultyInline(admin.TabularInline):
    model = Faculty
    extra = 1
    show_change_link = True

class CampusRequirementInline(admin.TabularInline):
    model = campusRequirement
    extra = 1 

class ProgrammeInline(admin.TabularInline):
    model = programmes
    extra = 1

# Admins
@admin.register(campus)
class CampusAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'city', 'description')
    list_filter = ('city',)
    search_fields = ('name', 'code', 'description')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [FacultyInline, CampusRequirementInline]

@admin.register(Faculty)
class FacultyAdmin(admin.ModelAdmin):
    list_display = ('name', 'campo')
    list_filter = ('campo',)
    search_fields = ('name', 'description')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [DepartmentInline, ProgrammeInline]

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'faculty')
    list_filter = ('faculty',)
    search_fields = ('name', 'description')
    prepopulated_fields = {'slug': ('name',)}

@admin.register(campusRequirement)
class CampusRequirementAdmin(admin.ModelAdmin):
    list_display = ('title', 'campo', 'min_grade')
    list_filter = ('campo',)
    search_fields = ('title', 'description')

@admin.register(programmes)
class ProgrammeAdmin(admin.ModelAdmin):
    list_display = ('name', 'faculty', 'duration', 'is_active')
    list_filter = ('faculty', 'is_active')
    search_fields = ('name', 'description')
    prepopulated_fields = {'slug': ('name',)}
