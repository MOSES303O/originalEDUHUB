from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Avg, Count, Case, When, IntegerField
from django.utils import timezone
from apps.core.utils import APIResponseMixin
from .models import (
    University, Subject, Course, UserSelectedCourse,
    CourseReview, CourseApplication, CourseSubjectRequirement
)
from .serializers import (
    UniversitySerializer, SubjectSerializer, CourseListSerializer,
    CourseDetailSerializer, UserSelectedCourseSerializer,
    CourseReviewSerializer, CourseApplicationSerializer,
    CourseMatchSerializer
)
from .utils import CourseMatchingEngine
import logging

logger = logging.getLogger(__name__)


class UniversityListView(generics.ListAPIView):
    """
    GET /api/v1/universities/
    List all active universities with optional filtering
    """
    queryset = University.objects.filter(is_active=True)
    serializer_class = UniversitySerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['type', 'location']
    search_fields = ['name', 'code', 'location']
    ordering_fields = ['name', 'established_year']
    ordering = ['name']

    def get_queryset(self):
        queryset = super().get_queryset()
        # Annotate with course count for better performance
        return queryset.annotate(
            course_count=Count('courses', filter=Q(courses__is_active=True))
        )


class UniversityDetailView(generics.RetrieveAPIView):
    """
    GET /api/v1/universities/{id}/
    Get detailed information about a specific university
    """
    queryset = University.objects.filter(is_active=True)
    serializer_class = UniversitySerializer


class SubjectListView(generics.ListAPIView):
    """
    GET /api/v1/subjects/
    List all active subjects with optional filtering
    """
    queryset = Subject.objects.filter(is_active=True)
    serializer_class = SubjectSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_core']
    search_fields = ['name', 'code']
    ordering_fields = ['name', 'category']
    ordering = ['name']


class CourseListView(generics.ListAPIView):
    """
    GET /api/v1/courses/
    List courses with filtering, searching, and pagination
    """
    serializer_class = CourseListSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'university', 'minimum_grade']
    search_fields = ['name', 'code', 'description', 'university__name']
    ordering_fields = ['name', 'tuition_fee_per_year', 'duration_years']
    ordering = ['name']

    def get_queryset(self):
        queryset = Course.objects.filter(is_active=True).select_related('university')
        
        # Add filters from query parameters
        min_fee = self.request.query_params.get('min_fee')
        max_fee = self.request.query_params.get('max_fee')
        duration = self.request.query_params.get('duration')
        
        if min_fee:
            try:
                queryset = queryset.filter(tuition_fee_per_year__gte=float(min_fee))
            except ValueError:
                pass
        
        if max_fee:
            try:
                queryset = queryset.filter(tuition_fee_per_year__lte=float(max_fee))
            except ValueError:
                pass
        
        if duration:
            try:
                queryset = queryset.filter(duration_years=int(duration))
            except ValueError:
                pass
        
        # Annotate with ratings
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


class UserSelectedCourseListView(generics.ListCreateAPIView):
    """
    GET /api/v1/user/selected-courses/
    POST /api/v1/user/selected-courses/
    List and create user selected courses
    """
    serializer_class = UserSelectedCourseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserSelectedCourse.objects.filter(
            user=self.request.user
        ).select_related('course__university').order_by('priority', 'created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        try:
            response = super().create(request, *args, **kwargs)
            return StandardAPIResponse.success(
                data=response.data,
                message="Course added to selection successfully"
            )
        except Exception as e:
            logger.error(f"Error adding course to selection: {str(e)}")
            return StandardAPIResponse.error(
                message="Failed to add course to selection",
                errors=str(e)
            )


class UserSelectedCourseDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/v1/user/selected-courses/{id}/
    PUT /api/v1/user/selected-courses/{id}/
    DELETE /api/v1/user/selected-courses/{id}/
    Retrieve, update, or delete a selected course
    """
    serializer_class = UserSelectedCourseSerializer
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticatedOrReadOnly]

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
    permission_classes = [IsAuthenticated]

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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def match_courses(request):
    """
    POST /api/v1/courses/match/
    Match courses based on user subjects and preferences
    
    Request body:
    {
        "subjects": [
            {"subject_id": "uuid", "grade": "B+"},
            {"subject_id": "uuid", "grade": "A-"}
        ],
        "preferred_categories": ["engineering", "technology"],
        "max_tuition_fee": 500000,
        "preferred_universities": ["uuid1", "uuid2"]
    }
    """
    try:
        serializer = CourseMatchSerializer(data=request.data)
        if not serializer.is_valid():
            return StandardAPIResponse.error(
                message="Invalid input data",
                errors=serializer.errors
            )

        # Initialize course matching engine
        matching_engine = CourseMatchingEngine()
        
        # Get matched courses
        matched_courses = matching_engine.match_courses(
            user_subjects=serializer.validated_data['subjects'],
            preferred_categories=serializer.validated_data.get('preferred_categories', []),
            max_tuition_fee=serializer.validated_data.get('max_tuition_fee'),
            preferred_universities=serializer.validated_data.get('preferred_universities', [])
        )

        # Serialize the results
        course_serializer = CourseListSerializer(
            matched_courses, many=True, context={'request': request}
        )

        return StandardAPIResponse.success(
            data={
                'matched_courses': course_serializer.data,
                'total_matches': len(matched_courses),
                'matching_criteria': {
                    'subjects_count': len(serializer.validated_data['subjects']),
                    'preferred_categories': serializer.validated_data.get('preferred_categories', []),
                    'max_tuition_fee': serializer.validated_data.get('max_tuition_fee'),
                    'preferred_universities_count': len(serializer.validated_data.get('preferred_universities', []))
                }
            },
            message=f"Found {len(matched_courses)} matching courses"
        )

    except Exception as e:
        logger.error(f"Error in course matching: {str(e)}")
        return StandardAPIResponse.error(
            message="Failed to match courses",
            errors=str(e)
        )


@api_view(['GET'])
def course_search(request):
    """
    GET /api/v1/courses/search/
    Advanced course search with multiple filters
    """
    try:
        query = request.query_params.get('q', '')
        category = request.query_params.get('category', '')
        university_id = request.query_params.get('university', '')
        min_fee = request.query_params.get('min_fee')
        max_fee = request.query_params.get('max_fee')
        duration = request.query_params.get('duration')
        minimum_grade = request.query_params.get('minimum_grade', '')

        # Start with active courses
        courses = Course.objects.filter(is_active=True).select_related('university')

        # Apply filters
        if query:
            courses = courses.filter(
                Q(name__icontains=query) |
                Q(description__icontains=query) |
                Q(university__name__icontains=query) |
                Q(code__icontains=query)
            )

        if category:
            courses = courses.filter(category=category)

        if university_id:
            courses = courses.filter(university_id=university_id)

        if min_fee:
            try:
                courses = courses.filter(tuition_fee_per_year__gte=float(min_fee))
            except ValueError:
                pass

        if max_fee:
            try:
                courses = courses.filter(tuition_fee_per_year__lte=float(max_fee))
            except ValueError:
                pass

        if duration:
            try:
                courses = courses.filter(duration_years=int(duration))
            except ValueError:
                pass

        if minimum_grade:
            courses = courses.filter(minimum_grade=minimum_grade)

        # Annotate with ratings and order by relevance
        courses = courses.annotate(
            avg_rating=Avg('reviews__rating', filter=Q(reviews__is_approved=True)),
            review_count=Count('reviews', filter=Q(reviews__is_approved=True))
        ).order_by('-avg_rating', 'name')

        # Limit results for performance
        courses = courses[:50]

        serializer = CourseListSerializer(courses, many=True, context={'request': request})

        return StandardAPIResponse.success(
            data={
                'courses': serializer.data,
                'total_results': len(courses),
                'search_query': query,
                'applied_filters': {
                    'category': category,
                    'university_id': university_id,
                    'min_fee': min_fee,
                    'max_fee': max_fee,
                    'duration': duration,
                    'minimum_grade': minimum_grade
                }
            },
            message=f"Found {len(courses)} courses matching your search"
        )

    except Exception as e:
        logger.error(f"Error in course search: {str(e)}")
        return StandardAPIResponse.error(
            message="Failed to search courses",
            errors=str(e)
        )


@api_view(['GET'])
def course_statistics(request):
    """
    GET /api/v1/courses/statistics/
    Get course statistics and analytics
    """
    try:
        stats = {
            'total_courses': Course.objects.filter(is_active=True).count(),
            'total_universities': University.objects.filter(is_active=True).count(),
            'courses_by_category': Course.objects.filter(is_active=True).values('category').annotate(
                count=Count('id')
            ).order_by('-count'),
            'average_tuition_fee': Course.objects.filter(is_active=True).aggregate(
                avg_fee=Avg('tuition_fee_per_year')
            )['avg_fee'],
            'universities_by_type': University.objects.filter(is_active=True).values('type').annotate(
                count=Count('id')
            ).order_by('-count'),
            'most_popular_courses': Course.objects.filter(is_active=True).annotate(
                selection_count=Count('userselectedcourse')
            ).order_by('-selection_count')[:10].values('name', 'selection_count'),
        }

        return StandardAPIResponse.success(
            data=stats,
            message="Course statistics retrieved successfully"
        )

    except Exception as e:
        logger.error(f"Error getting course statistics: {str(e)}")
        return StandardAPIResponse.error(
            message="Failed to get course statistics",
            errors=str(e)
        )