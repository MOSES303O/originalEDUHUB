from django.contrib import admin
from .models import University, Faculty, Department, UniversityRequirement


class DepartmentInline(admin.TabularInline):
    model = Department
    extra = 1


class FacultyInline(admin.TabularInline):
    model = Faculty
    extra = 1
    show_change_link = True


class UniversityRequirementInline(admin.TabularInline):
    model = UniversityRequirement
    extra = 1


@admin.register(University)
class UniversityAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'city','campus','accreditation','ranking', 'is_active')
    list_filter = ('is_active', 'city')
    search_fields = ('name', 'code','campus', 'description')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [FacultyInline, UniversityRequirementInline]

    fieldsets = (
        ('Basic Info', {
            'fields': ('name', 'slug', 'code', 'city','campus')  # ✅ Add slug here
        }),
        ('Details', {
            'fields': ('website', 'description', 'established_year','accreditation','logo')
        }),
        ('Status & Metadata', {
            'fields': ('is_active',)
        }),
    )

@admin.register(Faculty)
class FacultyAdmin(admin.ModelAdmin):
    list_display = ('name', 'university', 'is_active')
    list_filter = ('university', 'is_active')
    search_fields = ('name', 'description')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [DepartmentInline]


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'faculty', 'is_active')
    list_filter = ('faculty', 'is_active')
    search_fields = ('name', 'description')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(UniversityRequirement)
class UniversityRequirementAdmin(admin.ModelAdmin):
    list_display = ('title', 'university', 'min_grade', 'is_active')
    list_filter = ('university', 'is_active')
    search_fields = ('title', 'description')
