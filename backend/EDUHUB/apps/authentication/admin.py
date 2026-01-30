from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth import get_user_model
from .models import UserSelectedCourse,UserSubject

User = get_user_model()


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('phone_number', 'is_premium', 'is_staff','cluster_points', 'is_active', 'date_joined')
    list_filter = ('is_premium', 'is_staff', 'is_active')
    search_fields = ('phone_number',)
    ordering = ('-date_joined',)

    fieldsets = (
        (None, {'fields': ('phone_number', 'password')}),
        ('Personal info', {'fields': ('is_premium', 'cluster_points')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('phone_number', 'password1', 'password2', 'is_premium'),
        }),
    )

    readonly_fields = ('date_joined', 'last_login')
@admin.register(UserSelectedCourse)
class UserSelectedCourseAdmin(admin.ModelAdmin):
    list_display = ('user','id','course_display', 'institution', 'is_applied', 'created_at')
    list_filter = ('is_applied', 'institution', 'created_at')
    search_fields = (
        'user__phone_number',
        'course_name',
        'object_id',
    )
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)

    def course_display(self, obj):
        """Show course name + code beautifully"""
        return f"{obj.course_name} ({obj.object_id})"
    course_display.short_description = "Course"

    def institution(self, obj):
        """Show KMTC or University"""
        return obj.institution
    institution.short_description = "Institution"
@admin.register(UserSubject)
class UserSelectedSubjectAdmin(admin.ModelAdmin):
    list_display = ('user', 'subject')
    search_fields = ('grade', 'subject')