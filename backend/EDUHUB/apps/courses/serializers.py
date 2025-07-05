from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Subject, Course, CourseSubjectRequirement,
    UserSelectedCourse, CourseReview, CourseApplication
)
from apps.universities.models import University
from apps.universities.serializers import UniversityListSerializer
User = get_user_model()
class SubjectSerializer(serializers.ModelSerializer):
    """
    Serializer for Subject model
    """
    class Meta:
        model = Subject
        fields = [
            'id', 'name', 'code', 'description',
            'is_core', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class CourseSubjectRequirementSerializer(serializers.ModelSerializer):
    """
    Serializer for CourseSubjectRequirement model
    """
    subject = SubjectSerializer(read_only=True)
    subject_id = serializers.UUIDField(write_only=True)
    alternative_subjects = SubjectSerializer(many=True, read_only=True)
    
    class Meta:
        model = CourseSubjectRequirement
        fields = [
            'subject', 'subject_id', 'minimum_grade', 'is_mandatory',
            'alternative_subjects'
        ]


class CourseListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for course listings
    """
    university_name = serializers.CharField(source='university.name', read_only=True)
    university_code = serializers.CharField(source='university.code', read_only=True)
    average_rating = serializers.ReadOnlyField()
    total_reviews = serializers.ReadOnlyField()
    is_selected = serializers.SerializerMethodField()
    
    class Meta:
        model = Course
        fields = [
            'id', 'name', 'code', 'university_name', 'university_code',
            'category','description', 'duration_years', 'minimum_grade',
            'tuition_fee_per_year', 'application_fee',
            'average_rating', 'total_reviews', 'is_selected'
        ]

    def get_is_selected(self, obj):
        """Check if course is selected by current user"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return UserSelectedCourse.objects.filter(
                user=request.user, course=obj
            ).exists()
        return False


class CourseDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for individual course view
    """
    university =UniversityListSerializer(read_only=True)
    required_subjects = CourseSubjectRequirementSerializer(
        source='coursesubjectrequirement_set', many=True, read_only=True
    )
    average_rating = serializers.ReadOnlyField()
    total_reviews = serializers.ReadOnlyField()
    is_selected = serializers.SerializerMethodField()
    user_application = serializers.SerializerMethodField()
    
    class Meta:
        model = Course
        fields = [
            'id', 'name', 'code', 'university', 'description',
            'duration_years', 'minimum_grade', 'required_subjects',
            'category', 'tuition_fee_per_year', 'application_fee',
            'application_deadline', 'intake_months', 'career_prospects',
            'accreditation', 'average_rating', 'total_reviews',
            'is_selected', 'user_application', 'created_at'
        ]

    def get_is_selected(self, obj):
        """Check if course is selected by current user"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return UserSelectedCourse.objects.filter(
                user=request.user, course=obj
            ).exists()
        return False

    def get_user_application(self, obj):
        """Get user's application status for this course"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                application = CourseApplication.objects.get(
                    user=request.user, course=obj
                )
                return {
                    'id': application.id,
                    'status': application.status,
                    'application_number': application.application_number,
                    'submitted_at': application.submitted_at
                }
            except CourseApplication.DoesNotExist:
                return None
        return None


class UserSelectedCourseSerializer(serializers.ModelSerializer):
    """
    Serializer for UserSelectedCourse model
    """
    course = CourseListSerializer(read_only=True)
    course_id = serializers.UUIDField(write_only=True)
    
    class Meta:
        model = UserSelectedCourse
        fields = [
            'id', 'course', 'course_id', 'priority', 'notes',
            'is_applied', 'application_date', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'is_applied', 'application_date']

    def validate_course_id(self, value):
        """Validate that the course exists and is active"""
        try:
            course = Course.objects.get(id=value, is_active=True)
            return value
        except Course.DoesNotExist:
            raise serializers.ValidationError("Course not found or inactive")

    def validate(self, data):
        """Validate that user hasn't already selected this course"""
        user = self.context['request'].user
        course_id = data.get('course_id')
        
        if self.instance is None:  # Creating new selection
            if UserSelectedCourse.objects.filter(user=user, course_id=course_id).exists():
                raise serializers.ValidationError("Course already selected")
        
        return data


class CourseReviewSerializer(serializers.ModelSerializer):
    """
    Serializer for CourseReview model
    """
    user_name = serializers.SerializerMethodField()
    course_name = serializers.CharField(source='course.name', read_only=True)
    
    class Meta:
        model = CourseReview
        fields = [
            'id', 'course_name', 'user_name', 'rating', 'title',
            'content', 'is_anonymous', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'course_name', 'user_name']

    def get_user_name(self, obj):
        """Return user name or 'Anonymous' based on preference"""
        if obj.is_anonymous:
            return "Anonymous"
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email


class CourseApplicationSerializer(serializers.ModelSerializer):
    """
    Serializer for CourseApplication model
    """
    course = CourseListSerializer(read_only=True)
    course_id = serializers.UUIDField(write_only=True)
    
    class Meta:
        model = CourseApplication
        fields = [
            'id', 'course', 'course_id', 'status', 'application_number',
            'submitted_at','created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'application_number', 'submitted_at', 'created_at', 'updated_at'
        ]

    def validate_course_id(self, value):
        """Validate that the course exists and is active"""
        try:
            course = Course.objects.get(id=value, is_active=True)
            return value
        except Course.DoesNotExist:
            raise serializers.ValidationError("Course not found or inactive")


class CourseMatchSerializer(serializers.Serializer):
    """
    Serializer for course matching based on user subjects and grades
    """
    subjects = serializers.ListField(
        child=serializers.DictField(
            child=serializers.CharField()
        ),
        help_text="List of subjects with grades, e.g., [{'subject_id': 'uuid', 'grade': 'B+'}]"
    )
    preferred_categories = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        help_text="List of preferred course categories"
    )
    max_tuition_fee = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False,
        help_text="Maximum tuition fee per year"
    )
    preferred_universities = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        help_text="List of preferred university IDs"
    )

    def validate_subjects(self, value):
        """Validate subjects data"""
        if not value:
            raise serializers.ValidationError("At least one subject is required")
        
        valid_grades = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-']
        
        for subject_data in value:
            if 'subject_id' not in subject_data or 'grade' not in subject_data:
                raise serializers.ValidationError(
                    "Each subject must have 'subject_id' and 'grade'"
                )
            
            if subject_data['grade'] not in valid_grades:
                raise serializers.ValidationError(
                    f"Invalid grade: {subject_data['grade']}"
                )
            
            # Validate subject exists
            try:
                Subject.objects.get(id=subject_data['subject_id'])
            except Subject.DoesNotExist:
                raise serializers.ValidationError(
                    f"Subject with ID {subject_data['subject_id']} not found"
                )
        
        return value 
class SubjectScoreSerializer(serializers.Serializer):
    subject_code = serializers.CharField(max_length=10)
    grade = serializers.CharField(max_length=5)

class CourseMatchSerializer(serializers.Serializer):
    kcse_mean_grade = serializers.CharField(max_length=5)
    subject_scores = SubjectScoreSerializer(many=True)

    def validate_subject_scores(self, value):
        if not value:
            raise serializers.ValidationError("At least one subject score is required.")
        return value
class CourseSearchFilterSerializer(serializers.Serializer):
    q = serializers.CharField(required=False, help_text="Search keyword")
    category = serializers.CharField(required=False)
    university = serializers.UUIDField(required=False)
    min_fee = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    max_fee = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    duration = serializers.IntegerField(required=False)
    minimum_grade = serializers.CharField(required=False)
class CourseStatisticsQuerySerializer(serializers.Serializer):
    category = serializers.CharField(required=False)
    university = serializers.UUIDField(required=False)
