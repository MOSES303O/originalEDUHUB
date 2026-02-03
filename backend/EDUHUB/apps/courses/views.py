# apps/courses/views.py
from rest_framework import generics, status
from apps.core.views import BaseModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.permissions import AllowAny
from django.db.models import Q
from apps.core.utils import standardize_response
from .models import Subject, Program, CourseOffering
from .utils import  CourseMatchingEngine
from rest_framework.views import APIView
from .serializers import (
    SubjectSerializer,
    ProgramSerializer,
    CourseOfferingListSerializer,
    CourseOfferingDetailSerializer,
    CourseSearchFilterSerializer,
    RecommendedCourseSerializer
)
import logging

logger = logging.getLogger(__name__)
class RecommendedCoursesView(APIView):
    """
    GET /courses/recommendations/
    
    Returns personalized list of recommended and qualified courses for the authenticated user.
    Uses CourseMatchingEngine to qualify and rank based on subjects, cluster points, and requirements.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, format=None):
        user = request.user

        try:
            engine = CourseMatchingEngine()
            recommended = engine.get_recommended_courses(user, limit=15)  # Adjust limit

            if not recommended:
                return standardize_response(
                    success=True,
                    message="No qualified or recommended courses found",
                    data=[],
                    status_code=status.HTTP_200_OK
                )

            serializer = RecommendedCourseSerializer(
                recommended,
                many=True,
                context={'request': request}
            )

            return standardize_response(
                success=True,
                message=f"{len(serializer.data)} recommended courses found",
                data=serializer.data,
                status_code=status.HTTP_200_OK
            )

        except Exception as e:
            logger.exception("Error in recommended courses view")
            return standardize_response(
                success=False,
                message="Failed to fetch recommendations",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
class SubjectViewSet(BaseModelViewSet):
    """
    Read-only endpoint to list all active subjects.
    
    GET /eduhub/courses/subjects/ - List all subjects
    """
    serializer_class = SubjectSerializer
    permission_classes = [AllowAny]
    rate_limit_scope = 'subjects'

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

class ProgramViewSet(BaseModelViewSet):
    """
    GET /eduhub/courses/programs/ - List all active programs
    """
    serializer_class = ProgramSerializer
    permission_classes = [AllowAny]
    lookup_field = 'id'  # UUID primary key

    def get_queryset(self):
        return Program.objects.filter(is_active=True).prefetch_related(
            'subject_requirements__subject'
        ).order_by('name')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return standardize_response(
            success=True,
            message="Programs retrieved successfully",
            data=serializer.data
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return standardize_response(
            success=True,
            message="Program retrieved successfully",
            data=serializer.data
        )
class CourseOfferingListView(generics.ListAPIView):
    serializer_class = CourseOfferingListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = CourseOffering.objects.filter(is_active=True).select_related(
            'program', 'university'
        ).prefetch_related(
            'program__subject_requirements__subject'  # Include program requirements
        )

        # Filters
        university_code = self.request.query_params.get('university_code')
        if university_code:
            queryset = queryset.filter(university__code__iexact=university_code)

        university_name = self.request.query_params.get('university')
        if university_name:
            queryset = queryset.filter(university__name__iexact=university_name)

        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(program__category=category)

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

        return queryset.order_by('program__name')

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True, context={'request': request})
        return standardize_response(
            success=True,
            message="Course offerings retrieved successfully",
            data=serializer.data
        )

class CourseOfferingDetailView(generics.RetrieveAPIView):
    """
    GET /eduhub/courses/offerings/{id}/
    Full course offering detail including cluster requirements
    """
    queryset = CourseOffering.objects.filter(is_active=True)
    serializer_class = CourseOfferingDetailSerializer
    permission_classes = [AllowAny]
    lookup_field = 'id'

    def get_queryset(self):
        return super().get_queryset().select_related(
            'program', 'university'
        ).prefetch_related(
            'program__subject_requirements__subject'  # Critical: program-level requirements
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, context={'request': request})
        return standardize_response(
            success=True,
            message="Course offering retrieved successfully",
            data=serializer.data
        )

class CourseSearchAPIView(generics.CreateAPIView):
    """
    POST /eduhub/courses/search/
    Advanced search using JSON payload
    """
    serializer_class = CourseSearchFilterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        filter_serializer = self.get_serializer(data=request.data)
        filter_serializer.is_valid(raise_exception=True)
        filters = filter_serializer.validated_data

        queryset = CourseOffering.objects.filter(is_active=True).select_related('program', 'university')

        if q := filters.get('q'):
            queryset = queryset.filter(
                Q(program__name__icontains=q) |
                Q(program__code__icontains=q) |
                Q(university__name__icontains=q)
            )

        if category := filters.get('category'):
            queryset = queryset.filter(program__category__iexact=category)

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

        results = CourseOfferingListSerializer(
            queryset,
            many=True,
            context={'request': request}
        ).data

        return standardize_response(
            success=True,
            message="Course offerings filtered successfully",
            data=results,
            status_code=status.HTTP_200_OK
        )
