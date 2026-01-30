# apps/courses/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Subject, Program, CourseOffering,ProgramSubjectRequirement
from apps.authentication.models import UserSelectedCourse
from apps.universities.serializers import UniversityListSerializer

User = get_user_model()

class SubjectSerializer(serializers.ModelSerializer):
    value = serializers.CharField(source='id') 
    label = serializers.CharField(source='name')

    class Meta:
        model = Subject
        fields = ['value', 'label', 'code']

class ProgramSubjectRequirementSerializer(serializers.ModelSerializer):
    """Nested serializer for subject requirements on Program"""
    subject = SubjectSerializer(read_only=True)

    class Meta:
        model = ProgramSubjectRequirement
        fields = ['subject', 'minimum_grade', 'is_mandatory']

class ProgramSerializer(serializers.ModelSerializer):
    """Lightweight program with requirements"""
    required_subjects = ProgramSubjectRequirementSerializer(
        source='subject_requirements',  # related_name from model
        many=True,
        read_only=True
    )

    class Meta:
        model = Program
        fields = [
            'id', 'name', 'category','details','typical_duration_years',
            'required_subjects'
        ]
class CourseOfferingListSerializer(serializers.ModelSerializer):
    """List view — matches your old style"""
    program = ProgramSerializer(read_only=True)
    university_name = serializers.CharField(source='university.name', read_only=True)
    university_code = serializers.CharField(source='university.code', read_only=True)
    is_selected = serializers.SerializerMethodField()

    class Meta:
        model = CourseOffering
        fields = [
            'id', 'code', 'program', 'university_name', 'university_code',
            'duration_years', 'minimum_grade', 'tuition_fee_per_year',
            'is_selected','cluster_requirements'
        ]

    def get_is_selected(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return UserSelectedCourse.objects.filter(
                user=request.user,
                content_type__model='courseoffering',
                object_id=obj.id
            ).exists()
        return False

class CourseOfferingDetailSerializer(serializers.ModelSerializer):
    """Full detail — includes program requirements"""
    program = ProgramSerializer(read_only=True)  # ← Now includes required_subjects
    university = UniversityListSerializer(read_only=True)
    is_selected = serializers.SerializerMethodField()

    class Meta:
        model = CourseOffering
        fields = [
            'id', 'code', 'program', 'university',
            'duration_years', 'minimum_grade', 'tuition_fee_per_year',
            'intake_months', 'career_prospects',
            'is_selected', 'created_at','cluster_requirements'
        ]

    def get_is_selected(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return UserSelectedCourse.objects.filter(
                user=request.user,
                content_type__model='courseoffering',
                object_id=obj.id
            ).exists()
        return False

class CourseMatchSerializer(serializers.Serializer):
    """For matching based on user subjects"""
    subjects = serializers.ListField(
        child=serializers.DictField(),
        help_text="[{'subject_id': 'uuid', 'grade': 'B+'}]"
    )
    preferred_categories = serializers.ListField(child=serializers.CharField(), required=False)
    max_tuition_fee = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    preferred_universities = serializers.ListField(child=serializers.UUIDField(), required=False)

    def validate_subjects(self, value):
        if not value:
            raise serializers.ValidationError("At least one subject required")
        valid_grades = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-']
        for s in value:
            if 'subject_id' not in s or 'grade' not in s:
                raise serializers.ValidationError("Each subject needs subject_id and grade")
            if s['grade'] not in valid_grades:
                raise serializers.ValidationError(f"Invalid grade: {s['grade']}")
            try:
                Subject.objects.get(id=s['subject_id'])
            except Subject.DoesNotExist:
                raise serializers.ValidationError(f"Subject {s['subject_id']} not found")
        return value

class CourseSearchFilterSerializer(serializers.Serializer):
    q = serializers.CharField(required=False)
    category = serializers.CharField(required=False)
    university = serializers.UUIDField(required=False)
    min_fee = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    max_fee = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    duration = serializers.IntegerField(required=False)
    minimum_grade = serializers.CharField(required=False)