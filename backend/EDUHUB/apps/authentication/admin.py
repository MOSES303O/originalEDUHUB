from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth import get_user_model
from .models import UserSelectedCourse

User = get_user_model()


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('phone_number', 'email', 'is_staff', 'is_superuser')
    search_fields = ('phone_number', 'email')
    ordering = ('phone_number',)

    fieldsets = (
        (None, {'fields': ('phone_number', 'email', 'password')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login',)}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('phone_number', 'email', 'password1', 'password2'),
        }),
    )
@admin.register(UserSelectedCourse)
class UserSelectedCourseAdmin(admin.ModelAdmin):
    list_display = ('user', 'course','is_applied', 'application_date')
    list_filter = ('is_applied',)
    search_fields = ('user__email','user__phone_number', 'course__name')
