from rest_framework import generics,status,serializers,permissions
from rest_framework.response import Response
from apps.core.views import BaseModelViewSet
from rest_framework.permissions import AllowAny
from rest_framework.generics import GenericAPIView
#from utils.activity_logger import log_user_activity
from django.db.models import Q, Avg, Count
from apps.core.utils import standardize_response
from apps.core.utils import log_user_activity
from .models import (
    Subject, Course,
    CourseReview, CourseApplication
)
#work on the stardardize_response function as it is being implemented twice in two apps differently
#from apps.universities.serializers import UniversityListSerializer
from .serializers import (
    SubjectSerializer, CourseListSerializer,
    CourseDetailSerializer,
    CourseReviewSerializer, CourseApplicationSerializer,
    CourseMatchSerializer,CourseStatisticsQuerySerializer, CourseSearchFilterSerializer
)
from .utils import CourseMatchingEngine,StandardAPIResponse
import logging
logger = logging.getLogger(__name__)
class SubjectViewSet(BaseModelViewSet):
    """
    Read-only endpoint to list all active subjects.
    
    GET /api/v1/subjects/ - List all subjects
    """
    serializer_class = SubjectSerializer
    permission_classes = [AllowAny]  # Public access for subject listing
    rate_limit_scope = 'subjects'
    rate_limit_count = 100
    rate_limit_window = 3600

    def get_queryset(self):
        return Subject.objects.filter(is_active=True).order_by('name')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return standardize_response(
            success=True,
            message="Subjects retrieved successfully",
            data=serializer.data
        )

class CourseListView(generics.ListCreateAPIView):
    """
    GET /api/v1/courses/
    List courses with filtering, searching, and pagination
    Supports filtering by university_code, university name, category, minimum_grade, tuition fees, and duration
    """
    serializer_class = CourseListSerializer
    search_fields = ['name', 'code', 'description', 'university_name', 'university_code']
    ordering_fields = ['name', 'tuition_fee_per_year', 'duration_years']
    ordering = ['name']

    def get_queryset(self):
        queryset = Course.objects.filter(is_active=True).select_related('university')
        
        university_code = self.request.query_params.get('university_code')
        if university_code:
            queryset = queryset.filter(university__code__iexact=university_code)
            if not queryset.exists():
                logger.warning(f"No courses found for university_code: {university_code}")

        university_name = self.request.query_params.get('university')
        if university_name:
            queryset = queryset.filter(university__name__iexact=university_name)

        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)

        minimum_grade = self.request.query_params.get('minimum_grade')
        if minimum_grade:
            queryset = queryset.filter(minimum_grade=minimum_grade)

        min_fee = self.request.query_params.get('min_fee')
        if min_fee:
            try:
                queryset = queryset.filter(tuition_fee_per_year__gte=float(min_fee))
            except ValueError:
                pass

        max_fee = self.request.query_params.get('max_fee')
        if max_fee:
            try:
                queryset = queryset.filter(tuition_fee_per_year__lte=float(max_fee))
            except ValueError:
                pass

        duration = self.request.query_params.get('duration')
        if duration:
            try:
                queryset = queryset.filter(duration_years=int(duration))
            except ValueError:
                pass

        return queryset.annotate(
            avg_rating=Avg('reviews__rating', filter=Q(reviews__is_approved=True)),
            review_count=Count('reviews', filter=Q(reviews__is_approved=True))
        )

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        if not queryset.exists() and request.query_params.get('university_code'):
            return standardize_response(
                success=False,
                message="No courses found for the specified university",
                data=[],
                status_code=status.HTTP_404_NOT_FOUND
            )
        serializer = self.get_serializer(queryset, many=True)
        return standardize_response(
            success=True,
            message="Courses retrieved successfully",
            data=serializer.data,
            status_code=status.HTTP_200_OK
        )
class CourseDetailView(generics.RetrieveAPIView):
    """
    GET /api/v1/courses/{id}/
    Get detailed information about a specific course
    """
    queryset = Course.objects.filter(is_active=True)
    serializer_class = CourseDetailSerializer

    def get_queryset(self):
        return super().get_queryset().select_related('university').prefetch_related(
            'coursesubjectrequirement_set__subject',
            'coursesubjectrequirement_set__alternative_subjects'
        )
class CourseReviewListView(generics.ListCreateAPIView):
    """
    GET /api/v1/courses/{course_id}/reviews/
    POST /api/v1/courses/{course_id}/reviews/
    List and create course reviews
    """
    serializer_class = CourseReviewSerializer
    #permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        course_id = self.kwargs['course_id']
        return CourseReview.objects.filter(
            course_id=course_id, is_approved=True
        ).select_related('user').order_by('-created_at')

    def perform_create(self, serializer):
        course_id = self.kwargs['course_id']
        try:
            course = Course.objects.get(id=course_id, is_active=True)
            serializer.save(user=self.request.user, course=course)
        except Course.DoesNotExist:
            raise serializers.ValidationError("Course not found")

class CourseApplicationListView(generics.ListCreateAPIView):
    """
    GET /api/v1/user/applications/
    POST /api/v1/user/applications/
    List and create course applications
    """
    serializer_class = CourseApplicationSerializer
    #permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CourseApplication.objects.filter(
            user=self.request.user
        ).select_related('course__university').order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        try:
            response = super().create(request, *args, **kwargs)
            return StandardAPIResponse.success(
                data=response.data,
                message="Application created successfully"
            )
        except Exception as e:
            logger.error(f"Error creating application: {str(e)}")
            return StandardAPIResponse.error(
                message="Failed to create application",
                errors=str(e)
            )
class CourseStatisticsAPIView(GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        query_serializer = CourseStatisticsQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)
        filters = query_serializer.validated_data

        queryset = Course.objects.filter(is_active=True)
        if category := filters.get('category'):
            queryset = queryset.filter(category__iexact=category)
        if university := filters.get('university'):
            queryset = queryset.filter(university_id=university)

        stats = queryset.aggregate(
            total_courses=Count('id'),
            avg_fee=Avg('tuition_fee_per_year'),
            avg_duration=Avg('duration_years')
        )
        return Response(StandardAPIResponse.success("Course statistics", stats))
class CourseSearchAPIView(generics.CreateAPIView):
    """
    POST /api/v1/courses/search/
    Search courses using a JSON payload
    """
    serializer_class = CourseSearchFilterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        filter_serializer = self.get_serializer(data=request.data)
        filter_serializer.is_valid(raise_exception=True)
        filters = filter_serializer.validated_data

        queryset = Course.objects.filter(is_active=True)

        if q := filters.get('q'):
            queryset = queryset.filter(
                Q(name__icontains=q) |
                Q(code__icontains=q) |
                Q(description__icontains=q) |
                Q(university__name__icontains=q)
            )
        if category := filters.get('category'):
            queryset = queryset.filter(category__iexact=category)
        if university := filters.get('university'):
            queryset = queryset.filter(university_id=university)
        if min_fee := filters.get('min_fee'):
            queryset = queryset.filter(tuition_fee_per_year__gte=min_fee)
        if max_fee := filters.get('max_fee'):
            queryset = queryset.filter(tuition_fee_per_year__lte=max_fee)
        if duration := filters.get('duration'):
            queryset = queryset.filter(duration_years=duration)
        if grade := filters.get('minimum_grade'):
            queryset = queryset.filter(minimum_grade__iexact=grade)

        results = CourseListSerializer(queryset, many=True, context=self.get_serializer_context()).data
        return Response(StandardAPIResponse.success("Courses filtered", results))
class CourseMatchAPIView(GenericAPIView):
    serializer_class = CourseMatchSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        engine = CourseMatchingEngine()
        matched_courses = engine.match(
            user=request.user,
            subject_grades=serializer.validated_data['subjects'],
            preferred_categories=serializer.validated_data.get('preferred_categories'),
            max_tuition_fee=serializer.validated_data.get('max_tuition_fee'),
            preferred_universities=serializer.validated_data.get('preferred_universities')
        )

        response_serializer = CourseListSerializer(
            matched_courses, many=True, context=self.get_serializer_context()
        )
        return Response(StandardAPIResponse.success("Matched courses", response_serializer.data))
