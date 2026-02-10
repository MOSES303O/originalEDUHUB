# apps/courses/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Subject, Program, CourseOffering,ProgramSubjectRequirement
from apps.authentication.models import UserSelectedCourse
from apps.universities.serializers import UniversityListSerializer
from django.contrib.contenttypes.models import ContentType

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
    program = ProgramSerializer(read_only=True)
    university_name = serializers.CharField(source='university.name', read_only=True)
    university_code = serializers.CharField(source='university.code', read_only=True)
    is_selected = serializers.SerializerMethodField()
    qualified = serializers.BooleanField(read_only=True, allow_null=True)
    user_points = serializers.FloatField(read_only=True, allow_null=True)
    required_points = serializers.FloatField(read_only=True, allow_null=True)
    points_source = serializers.CharField(read_only=True, allow_null=True)
    cluster = serializers.IntegerField(read_only=True, allow_null=True)
    qualification_details = serializers.DictField(read_only=True, allow_null=True)
    reason = serializers.CharField(read_only=True, allow_null=True)

    class Meta:
        model = CourseOffering
        fields = [
            'id', 'code', 'program', 'university_name', 'university_code',
            'duration_years', 'minimum_grade', 'tuition_fee_per_year',
            'is_selected', 'cluster_requirements',
            'qualified', 'user_points', 'required_points', 'points_source',
            'cluster', 'qualification_details', 'reason'
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
    program = ProgramSerializer(read_only=True)
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


class CourseSearchFilterSerializer(serializers.Serializer):
    q = serializers.CharField(required=False)
    category = serializers.CharField(required=False)
    university = serializers.UUIDField(required=False)
    min_fee = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    max_fee = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    duration = serializers.IntegerField(required=False)
    minimum_grade = serializers.CharField(required=False)
