# apps/authentication/serializers.py
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.contrib.auth import authenticate
from django.contrib.contenttypes.models import ContentType
from apps.kmtc.models import Programme
from apps.courses.models import Subject, CourseOffering  # ← CHANGED: CourseOffering instead of Course
from .models import User, UserProfile, UserSubject, UserSelectedCourse
from apps.core.utils import validate_kenyan_phone, standardize_phone_number
from decimal import Decimal, InvalidOperation

class UserSubjectSerializer(serializers.Serializer):
    subject_id = serializers.UUIDField()
    grade = serializers.ChoiceField(choices=[
        ('A', 'A'), ('A-', 'A-'), ('B+', 'B+'), ('B', 'B'), ('B-', 'B-'),
        ('C+', 'C+'), ('C', 'C'), ('C-', 'C-'), ('D+', 'D+'), ('D', 'D'),
        ('D-', 'D-'), ('E', 'E')
    ])

    def validate_subject_id(self, value):
        if not Subject.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError(f"Subject with ID {value} does not exist or is inactive.")
        return value

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={'input_type': 'password'},
        required=True
    )
    password_confirm = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'},
        required=True
    )
    subjects = UserSubjectSerializer(many=True, required=True)

    class Meta:
        model = User
        fields = [
            'phone_number', 'password', 'password_confirm',
            'subjects'
        ]
        extra_kwargs = {
            'phone_number': {'required': True},
        }

    def validate_phone_number(self, value):
        if not validate_kenyan_phone(value):
            raise serializers.ValidationError(
                "Please enter a valid Kenyan phone number (e.g., +254712345678 or 0712345678)"
            )
        standardized_phone = standardize_phone_number(value)
        if User.objects.filter(phone_number=standardized_phone).exists():
            raise serializers.ValidationError(
                "A user with this phone number already exists."
            )
        return standardized_phone

    def validate_subjects(self, value):
        if not (7 <= len(value) <= 9):
            raise serializers.ValidationError(
                "You must select between 7 and 9 subjects."
            )
        subject_ids = [item['subject_id'] for item in value]
        if len(subject_ids) != len(set(subject_ids)):
            raise serializers.ValidationError(
                "Duplicate subjects are not allowed."
            )
        return value

    def validate(self, attrs):
        if attrs.get('password') != attrs.get('password_confirm'):
            raise serializers.ValidationError({
                'password_confirm': "Passwords do not match."
            })
        return attrs

    def create(self, validated_data):
        subjects_data = validated_data.pop('subjects', [])
        validated_data.pop('password_confirm', None)
        user = User.objects.create_user(
            phone_number=validated_data['phone_number'],
            password=validated_data.get('password'),
        )
        UserProfile.objects.create(user=user)

        for subject_data in subjects_data:
            UserSubject.objects.create(
                user=user,
                subject_id=subject_data['subject_id'],
                grade=subject_data['grade']
            )

        return user

class UserLoginSerializer(serializers.Serializer):
    phone_number = serializers.CharField(required=True)
    password = serializers.CharField(
        required=True,
        style={'input_type': 'password'}
    )

    def validate(self, attrs):
        phone_number = standardize_phone_number(attrs.get('phone_number'))
        password = attrs.get('password')

        if not phone_number or not password:
            raise serializers.ValidationError(
                "Must include phone number and password."
            )

        user = authenticate(phone_number=phone_number, password=password)
        if not user:
            raise serializers.ValidationError(
                "Invalid phone number or password.",
                code='authentication'
            )
        if not user.is_active:
            raise serializers.ValidationError(
                "User account is deactivated."
            )

        attrs['user'] = user
        attrs['phone_number'] = phone_number
        return attrs

class UserProfileSerializer(serializers.ModelSerializer):
    phone_number = serializers.CharField(source='user.phone_number', read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'phone_number',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']
class UserSubjectModelSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject = serializers.PrimaryKeyRelatedField(queryset=Subject.objects.all())

    class Meta:
        model = UserSubject
        fields = ['id', 'subject', 'subject_name', 'grade', 'created_at', 'updated_at']
        read_only_fields = ['id', 'subject_name', 'created_at', 'updated_at']

    def validate(self, attrs):
        user = self.context['request'].user
        subject = attrs.get('subject')
        queryset = UserSubject.objects.filter(user=user, subject=subject)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError(
                f"You have already added the subject '{subject.name}'."
            )
        return attrs

class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, style={'input_type': 'password'})
    new_password = serializers.CharField(required=True, min_length=8, style={'input_type': 'password'})
    new_password_confirm = serializers.CharField(required=True, style={'input_type': 'password'})

    def validate_new_password(self, value):
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': "Password confirmation doesn't match."
            })
        return attrs
    
class UserClusterPointsSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['cluster_points']
        extra_kwargs = {
            'cluster_points': {'required': False, 'allow_null': True}
        }

    def to_internal_value(self, data):
        if 'cluster_points' in data:
            value = data['cluster_points']
            if isinstance(value, str):
                try:
                    data['cluster_points'] = Decimal(value)
                except InvalidOperation:
                    raise serializers.ValidationError({
                        'cluster_points': 'Must be a valid decimal number (e.g. 44.000)'
                    })
        return super().to_internal_value(data)

class UserDetailSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    subjects = UserSubjectModelSerializer(many=True, read_only=True)
    masked_phone = serializers.SerializerMethodField()
    cluster_points = serializers.DecimalField(
        max_digits=6,
        decimal_places=3,
        read_only=False,
        required=False
    )

    class Meta:
        model = User
        fields = [
            'id', 'phone_number', 'masked_phone', 'is_active', 'is_verified',
            'date_joined', 'cluster_points', 'last_login', 'profile', 'subjects'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'is_verified']

    def get_masked_phone(self, obj):
        from apps.core.utils import mask_phone_number
        return mask_phone_number(obj.phone_number) if obj.phone_number else None

class UserSelectedCourseSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(write_only=True)
    course_name = serializers.CharField(read_only=True)
    institution = serializers.CharField(read_only=True)

    class Meta:
        model = UserSelectedCourse
        fields = [
            'id', 'course_code', 'course_name', 'institution',
            'is_applied', 'application_date', 'created_at'
        ]
        read_only_fields = ['id', 'course_name', 'institution', 'created_at']

    def validate_course_code(self, value):
        """Find course in University (CourseOffering) OR KMTC (Programme)"""
        print(f"[Serializer] Validating course_code: {value} (type: {type(value)})")

        # 1. Try University CourseOffering (code is integer, but we accept string if numeric)
        try:
            # Safe: only attempt int() if the value looks numeric
            if str(value).isdigit():
                offering = CourseOffering.objects.filter(
                    code=int(value),
                    is_active=True
                ).select_related('program').first()
                if offering:
                    print(f"[Serializer] Found regular university course: {offering.program.name}")
                    return {
                        'content_type': ContentType.objects.get_for_model(CourseOffering),
                        'object_id': offering.id,
                        'course_name': offering.program.name,
                        'institution': offering.university.name
                    }
        except (ValueError, TypeError):
            # Silently skip if value can't be converted to int (e.g. "die")
            pass

        # 2. Try KMTC Programme (string code)
        try:
            prog = Programme.objects.get(code=value)
            print(f"[Serializer] Found KMTC programme: {prog.name}")
            return {
                'content_type': ContentType.objects.get_for_model(Programme),
                'object_id': prog.id,
                'course_name': prog.name,
                'institution': "KMTC"
            }
        except Programme.DoesNotExist:
            pass

        # 3. Final failure
        raise serializers.ValidationError(
            f"Course with code '{value}' not found in University offerings or KMTC programmes"
        )

    def validate(self, data):
        user = self.context['request'].user
        course_info = data.get('course_code')  # This is now the dict from validate_course_code

        if not course_info:
            raise serializers.ValidationError("Invalid course_code")

        # Check if already selected
        exists = UserSelectedCourse.objects.filter(
            user=user,
            content_type=course_info['content_type'],
            object_id=course_info['object_id']
        ).exists()

        if exists and not self.instance:
            raise serializers.ValidationError(
                f"You have already selected: {course_info['course_name']} ({course_info['institution']})"
            )

        data['course_info'] = course_info
        return data

    def create(self, validated_data):
        course_info = validated_data.pop('course_info')

        selected = UserSelectedCourse.objects.create(
            user=self.context['request'].user,
            content_type=course_info['content_type'],
            object_id=course_info['object_id'],
            course_name=course_info['course_name'],
            institution=course_info['institution'],
            is_applied=False
        )

        print(f"SUCCESS: {selected.course_name} ({selected.institution}) saved for {selected.user}")
        return selected

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['course_name'] = instance.course_name
        ret['institution'] = instance.institution
        return ret