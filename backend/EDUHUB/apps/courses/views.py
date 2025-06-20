from rest_framework import generics, mixins, status,serializers,permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import GenericAPIView
#from utils.activity_logger import log_user_activity
from django.db.models import Q, Avg, Count
from apps.core.utils import standardize_response
from apps.core.utils import log_user_activity
from .models import (
    Subject, Course, UserSelectedCourse,
    CourseReview, CourseApplication
)
#work on the stardardize_response function as it is being implemented twice in two apps differently
#from apps.universities.serializers import UniversityListSerializer
from .serializers import (
    SubjectSerializer, CourseListSerializer,
    CourseDetailSerializer, UserSelectedCourseSerializer,
    CourseReviewSerializer, CourseApplicationSerializer,
    CourseMatchSerializer,CourseStatisticsQuerySerializer, CourseSearchFilterSerializer
)
from .utils import CourseMatchingEngine,StandardAPIResponse
import logging
logger = logging.getLogger(__name__)
class SubjectListView(generics.ListCreateAPIView):
    """
    GET /api/v1/subjects/
    List all active subjects with optional filtering
    """
    queryset = Subject.objects.filter(is_active=True)
    serializer_class = SubjectSerializer
    filterset_fields = ['name', 'code', 'is_core', 'is_active']
    search_fields = ['name', 'code']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

class CourseListView(generics.ListCreateAPIView):
    """
    GET /api/v1/courses/
    List courses with filtering, searching, and pagination
    """
    serializer_class = CourseListSerializer
    search_fields = ['name', 'code', 'description', 'university__name']
    ordering_fields = ['name', 'tuition_fee_per_year', 'duration_years']
    ordering = ['name']

    def get_queryset(self):
        queryset = Course.objects.filter(is_active=True).select_related('university')
        
        # 📌 Custom filtering for university name
        university_name = self.request.query_params.get('university')
        if university_name:
            queryset = queryset.filter(university__name__iexact=university_name)

        # Optional filters
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

        # Aggregate ratings
        return queryset.annotate(
            avg_rating=Avg('reviews__rating', filter=Q(reviews__is_approved=True)),
            review_count=Count('reviews', filter=Q(reviews__is_approved=True))
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
class UserSelectedCourseView(
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    generics.ListCreateAPIView
):
    """
    Manages user-selected courses.

    GET    /api/v1/user/selected-courses/         - List selected courses
    POST   /api/v1/user/selected-courses/         - Select a new course
    PUT    /api/v1/user/selected-courses/{id}/    - Update a selection
    DELETE /api/v1/user/selected-courses/{id}/    - Remove selection
    POST   /api/v1/user/selected-courses/bulk_create/ - Bulk select courses
    """
    serializer_class = UserSelectedCourseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserSelectedCourse.objects.filter(
            user=self.request.user
        ).select_related('course__university').order_by('priority', 'created_at')

    def perform_create(self, serializer):
        return serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        try:
            response = super().create(request, *args, **kwargs)
            return standardize_response(
                success=True,
                message="Course added to selection successfully",
                data=response.data,
                status_code=status.HTTP_201_CREATED
            )
        except Exception as e:
            return standardize_response(
                success=False,
                message="Failed to add course to selection",
                errors={'detail': str(e)},
                status_code=status.HTTP_400_BAD_REQUEST
            )

    def put(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def delete(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)


class BulkUserSelectedCourseCreateView(APIView):
    """
    POST /api/v1/user/selected-courses/bulk_create/
    Bulk create selected courses
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSelectedCourseSerializer

    def post(self, request):
        try:
            courses_data = request.data.get('courses', [])
            if not courses_data:
                return standardize_response(
                    success=False,
                    message="No courses provided",
                    status_code=status.HTTP_400_BAD_REQUEST
                )

            created = []
            errors = []

            for course_data in courses_data:
                serializer = self.serializer_class(data=course_data)
                if serializer.is_valid():
                    serializer.save(user=request.user)
                    created.append(serializer.data)
                else:
                    errors.append({
                        'course_data': course_data,
                        'errors': serializer.errors
                    })

            if created:
                log_user_activity(
                    user=request.user,
                    action='SELECTED_COURSES_BULK_CREATED',
                    details={'count': len(created)},
                    request=request
                )

            response_data = {
                'created': created,
                'errors': errors,
                'summary': {
                    'total_provided': len(courses_data),
                    'created_count': len(created),
                    'error_count': len(errors)
                }
            }

            return standardize_response(
                success=True,
                message=f"{len(created)} courses added to selection successfully",
                data=response_data,
                status_code=status.HTTP_201_CREATED
            )

        except Exception as e:
            return standardize_response(
                success=False,
                message="Bulk creation failed",
                errors={'detail': str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class UserSelectedCourseDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/v1/user/selected-courses/{id}/
    PUT /api/v1/user/selected-courses/{id}/
    DELETE /api/v1/user/selected-courses/{id}/
    Retrieve, update, or delete a selected course
    """
    serializer_class = UserSelectedCourseSerializer
    #permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserSelectedCourse.objects.filter(user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        try:
            response = super().destroy(request, *args, **kwargs)
            return StandardAPIResponse.success(
                message="Course removed from selection successfully"
            )
        except Exception as e:
            logger.error(f"Error removing course from selection: {str(e)}")
            return StandardAPIResponse.error(
                message="Failed to remove course from selection"
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
