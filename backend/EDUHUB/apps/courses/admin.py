from django.contrib import admin
from .models import (
    Subject,
    Course,
    CourseSubjectRequirement,
    UserSelectedCourse,
    CourseReview,
    CourseApplication
)
@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'is_core', 'is_active')
    list_filter = ('is_core', 'is_active')
    search_fields = ('name', 'code')

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'university', 'category', 'minimum_grade', 'is_active')
    list_filter = ('category', 'minimum_grade', 'university', 'is_active')
    search_fields = ('name', 'code', 'university__name')


@admin.register(CourseSubjectRequirement)
class CourseSubjectRequirementAdmin(admin.ModelAdmin):
    list_display = ('course', 'subject', 'minimum_grade', 'is_mandatory')
    list_filter = ('minimum_grade', 'is_mandatory')
    search_fields = ('course__name', 'subject__name')


@admin.register(UserSelectedCourse)
class UserSelectedCourseAdmin(admin.ModelAdmin):
    list_display = ('user', 'course', 'priority', 'is_applied', 'application_date')
    list_filter = ('is_applied',)
    search_fields = ('user__email', 'course__name')


@admin.register(CourseReview)
class CourseReviewAdmin(admin.ModelAdmin):
    list_display = ('course', 'user', 'rating', 'is_approved', 'is_anonymous', 'created_at')
    list_filter = ('rating', 'is_approved', 'is_anonymous')
    search_fields = ('course__name', 'user__email', 'title')


@admin.register(CourseApplication)
class CourseApplicationAdmin(admin.ModelAdmin):
    list_display = ('application_number', 'user', 'course', 'status', 'submitted_at')
    list_filter = ('status', 'submitted_at')
    search_fields = ('application_number', 'user__email', 'course__name')
