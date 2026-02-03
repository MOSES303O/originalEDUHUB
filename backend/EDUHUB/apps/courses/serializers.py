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


class CourseSearchFilterSerializer(serializers.Serializer):
    q = serializers.CharField(required=False)
    category = serializers.CharField(required=False)
    university = serializers.UUIDField(required=False)
    min_fee = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    max_fee = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    duration = serializers.IntegerField(required=False)
    minimum_grade = serializers.CharField(required=False)

class RecommendedCourseSerializer(serializers.Serializer):
    """
    Serializer for recommended/qualified courses from CourseMatchingEngine.
    
    Handles dict output from engine (e.g. get_recommended_courses, qualify_user_for_all_offerings).
    Includes qualification status, points comparison, and selection info.
    """
    # Core identification
    id = serializers.CharField(source='offering_id', read_only=True)
    code = serializers.CharField(read_only=True, allow_null=True)
    
    # Program & University (nested)
    program = ProgramSerializer(source='program', read_only=True, allow_null=True)
    program_name = serializers.CharField(read_only=True, allow_null=True)
    university = UniversityListSerializer(source='university', read_only=True, allow_null=True)
    university_name = serializers.CharField(read_only=True, allow_null=True)
    
    # Course details (from engine or model)
    duration_years = serializers.IntegerField(read_only=True, allow_null=True)
    tuition_fee_per_year = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True, allow_null=True)
    minimum_grade = serializers.CharField(read_only=True, allow_null=True)
    cluster_requirements = serializers.CharField(read_only=True, allow_null=True)
    intake_months = serializers.ListField(child=serializers.CharField(), read_only=True, allow_null=True)
    career_prospects = serializers.CharField(read_only=True, allow_null=True)
    
    # Qualification & matching from engine
    qualified = serializers.BooleanField(read_only=True)
    qualification_details = serializers.DictField(read_only=True)
    user_points = serializers.FloatField(read_only=True, allow_null=True)
    required_points = serializers.FloatField(read_only=True, allow_null=True)
    points_source = serializers.CharField(read_only=True, allow_null=True)
    cluster = serializers.IntegerField(read_only=True, allow_null=True)
    match_score = serializers.FloatField(read_only=True, default=0.0)
    
    # User-specific
    is_selected = serializers.SerializerMethodField(read_only=True)

    def get_is_selected(self, obj):
        """
        Check if the current user has selected this course offering.
        Works with engine dict output (uses offering_id).
        """
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False

        offering_id = obj.get('offering_id')
        if not offering_id:
            return False

        try:
            return UserSelectedCourse.objects.filter(
                user=request.user,
                content_type=ContentType.objects.get_for_model(CourseOffering),
                object_id=offering_id
            ).exists()
        except Exception:
            return False

    class Meta:
        # This is a Serializer (not ModelSerializer) because input is dict from engine
        fields = [
            'id', 'code',
            'program', 'program_name',
            'university', 'university_name',
            'duration_years', 'tuition_fee_per_year', 'minimum_grade',
            'cluster_requirements', 'intake_months', 'career_prospects',
            'qualified', 'qualification_details',
            'user_points', 'required_points', 'points_source',
            'cluster', 'match_score',
            'is_selected'
        ]