"""
Serializers for authentication app using updated core utils.
"""

from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.contrib.auth import authenticate
from django.utils import timezone

from .models import User, UserProfile, UserSubject, UserSession, UserActivity
from apps.core.utils import validate_kenyan_phone, standardize_phone_number


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration with updated phone validation.
    """
    
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'}
    )
    
    class Meta:
        model = User
        fields = [
            'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'phone_number',
            'date_of_birth'
        ]
        extra_kwargs = {
            'email': {'required': True},
            'first_name': {'required': True},
            'last_name': {'required': True},
        }
    
    def validate_email(self, value):
        """Validate email format and uniqueness."""
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError(
                "A user with this email already exists."
            )
        return value.lower()
    
    def validate_phone_number(self, value):
        """Validate Kenyan phone number using core utils."""
        if value and not validate_kenyan_phone(value):
            raise serializers.ValidationError(
                "Please enter a valid Kenyan phone number (e.g., +254712345678 or 0712345678)"
            )
        return value
    
    def validate_password(self, value):
        """Validate password strength."""
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value
    
    def validate(self, attrs):
        """Validate password confirmation and other cross-field validation."""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': "Password confirmation doesn't match."
            })
        
        # Validate date of birth
        if attrs.get('date_of_birth'):
            today = timezone.now().date()
            age = today.year - attrs['date_of_birth'].year
            if age < 16 or age > 100:
                raise serializers.ValidationError({
                    'date_of_birth': "Age must be between 16 and 100 years."
                })
        
        return attrs
    
    def create(self, validated_data):
        """Create user and profile with standardized phone number."""
        # Remove password_confirm
        validated_data.pop('password_confirm')
        
        # Standardize phone number if provided
        if validated_data.get('phone_number'):
            validated_data['phone_number'] = standardize_phone_number(
                validated_data['phone_number']
            )
        
        # Create user
        user = User.objects.create_user(**validated_data)
        
        # Create profile
        UserProfile.objects.create(user=user)
        
        return user


class UserLoginSerializer(serializers.Serializer):
    """
    Serializer for user login.
    """
    
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        required=True,
        style={'input_type': 'password'}
    )
    
    def validate_email(self, value):
        """Normalize email."""
        return value.lower()
    
    def validate(self, attrs):
        """Validate user credentials."""
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            # Check if user exists
            try:
                user = User.objects.get(email=email)
                if not user.is_active:
                    raise serializers.ValidationError(
                        "User account is deactivated."
                    )
            except User.DoesNotExist:
                raise serializers.ValidationError(
                    "Invalid email or password."
                )
            
            # Authenticate user
            user = authenticate(username=email, password=password)
            if not user:
                raise serializers.ValidationError(
                    "Invalid email or password."
                )
            
            attrs['user'] = user
        else:
            raise serializers.ValidationError(
                "Must include email and password."
            )
        
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for user profile management.
    """
    
    phone_number = serializers.CharField(source='user.phone_number', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'email', 'full_name', 'phone_number',
            'current_education_level', 'school_name', 'graduation_year',
            'preferred_study_mode', 'preferred_location', 'budget_range',
            'bio', 'interests', 'email_notifications', 'sms_notifications',
            'marketing_emails', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class UserSubjectSerializer(serializers.ModelSerializer):
    """
    Serializer for user subjects and grades.
    """
    
    grade_points = serializers.ReadOnlyField()
    
    class Meta:
        model = UserSubject
        fields = [
            'id', 'subject_name', 'grade', 'year',
            'exam_type', 'grade_points', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_subject_name(self, value):
        """Validate and normalize subject name."""
        return value.strip().title()
    
    def validate(self, attrs):
        """Validate unique constraint."""
        user = self.context['request'].user
        subject_name = attrs.get('subject_name')
        year = attrs.get('year')
        exam_type = attrs.get('exam_type')
        
        # Check for existing subject (excluding current instance for updates)
        queryset = UserSubject.objects.filter(
            user=user,
            subject_name=subject_name,
            year=year,
            exam_type=exam_type
        )
        
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        
        if queryset.exists():
            raise serializers.ValidationError(
                "You have already added this subject for this year and exam type."
            )
        
        return attrs


class PasswordChangeSerializer(serializers.Serializer):
    """
    Serializer for password change.
    """
    
    old_password = serializers.CharField(
        required=True,
        style={'input_type': 'password'}
    )
    new_password = serializers.CharField(
        required=True,
        min_length=8,
        style={'input_type': 'password'}
    )
    new_password_confirm = serializers.CharField(
        required=True,
        style={'input_type': 'password'}
    )
    
    def validate_new_password(self, value):
        """Validate new password strength."""
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value
    
    def validate(self, attrs):
        """Validate password confirmation."""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': "Password confirmation doesn't match."
            })
        return attrs


class UserDetailSerializer(serializers.ModelSerializer):
    """
    Detailed user serializer with profile and related data.
    """
    
    profile = UserProfileSerializer(read_only=True)
    subjects = UserSubjectSerializer(many=True, read_only=True)
    masked_phone = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name',
            'phone_number', 'masked_phone', 'is_active', 'is_verified',
            'date_joined', 'last_login', 'profile', 'subjects'
        ]
        read_only_fields = [
            'id', 'date_joined', 'last_login', 'is_verified'
        ]
    
    def get_masked_phone(self, obj):
        """Get masked phone number for display."""
        from apps.core.utils import mask_phone_number
        return mask_phone_number(obj.phone_number) if obj.phone_number else None
