# kmtc/views.py — ADD THESE EXTRA VIEWS
from rest_framework import viewsets, generics, filters
from rest_framework.exceptions import NotFound
from django.db.models import Prefetch
from django.db import models
from django.shortcuts import get_object_or_404
from .models import Campus, Faculty, Department, Programme, OfferedAt
from .serializers import (
    CampusListSerializer, CampusDetailSerializer,
    FacultySerializer, DepartmentSerializer,
    ProgrammeSerializer, OfferedAtSerializer
)
from apps.core.utils import standardize_response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
import logging

logger = logging.getLogger(__name__)

# ← Your KMTC engine
from apps.courses.utils import KMTCCourseMatchingEngine

class CampusViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Campus.objects.filter(is_active=True).prefetch_related('programmes_offered__programme')
    lookup_field = 'code'

    def get_serializer_class(self):
        if self.action == 'list':
            return CampusListSerializer
        return CampusDetailSerializer


class FacultyViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Faculty.objects.all().prefetch_related('departments__programmes')
    serializer_class = FacultySerializer
    lookup_field = 'slug'


class DepartmentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Department.objects.all().prefetch_related('programmes')
    serializer_class = DepartmentSerializer
    lookup_field = 'slug'


# Updated ProgrammeViewSet only (replace the whole class)
class ProgrammeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /eduhub/kmtc/programmes/          → list all active KMTC programmes
                                          → includes qualification status if user is authenticated
    GET /eduhub/kmtc/programmes/{code}/   → detail of one programme with all campuses
                                          → includes qualification status if user is authenticated
    """
    serializer_class = ProgrammeSerializer
    lookup_field = 'code'
    lookup_value_regex = '[^/]+'
    permission_classes = [AllowAny]

    def get_queryset(self):
        offered_prefetch = Prefetch(
            'offered_at',
            queryset=OfferedAt.objects.prefetch_related('campuses'),
            to_attr='campuses_offered'
        )

        return Programme.objects.filter(is_active=True)\
            .select_related('department__faculty')\
            .prefetch_related(offered_prefetch)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        qualified_data = {}
        user_identifier = "anonymous"

        # Qualification engine — only for authenticated users
        if request.user.is_authenticated:
            try:
                user_identifier = request.user.phone_number or request.user.id
                engine = KMTCCourseMatchingEngine()

                for programme in queryset:
                    qualified, details = engine.check_user_qualification_for_kmtc_programme(
                        request.user, programme
                    )
                    qualified_data[programme.code] = {
                        "qualified": qualified,
                        "qualification_details": details,
                        "reason": details.get("reason"),
                        "missing_mandatory": details.get("missing_mandatory", []),
                        "subjects_count": details.get("subjects_count", 0),
                        "user_points": details.get("mean_points"),  # renamed for consistency
                    }
            except Exception as e:
                logger.exception(f"KMTC Qualification failed for user {user_identifier}")

        # Pass qualified_data to serializer via context
        serializer = self.get_serializer(
            queryset,
            many=True,
            context={'request': request, 'qualified_data': qualified_data}
        )

        return standardize_response(
            success=True,
            message="KMTC programmes retrieved successfully",
            data=serializer.data,
            status_code=status.HTTP_200_OK
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        qualified_data = {}

        # Qualification for single programme
        if request.user.is_authenticated:
            try:
                engine = KMTCCourseMatchingEngine()
                qualified, details = engine.check_user_qualification_for_kmtc_programme(
                    request.user, instance
                )
                qualified_data[instance.code] = {
                    "qualified": qualified,
                    "qualification_details": details,
                    "reason": details.get("reason"),
                    "missing_mandatory": details.get("missing_mandatory", []),
                    "subjects_count": details.get("subjects_count", 0),
                    "user_points": details.get("mean_points"),
                }
            except Exception as e:
                logger.exception("KMTC Qualification failed for single programme")

        serializer = self.get_serializer(
            instance,
            context={'request': request, 'qualified_data': qualified_data}
        )

        return standardize_response(
            success=True,
            message="KMTC programme retrieved successfully",
            data=serializer.data,
            status_code=status.HTTP_200_OK
        )
# Extra: Get all programmes in a campus
class CampusProgrammesView(generics.ListAPIView):
    serializer_class = ProgrammeSerializer

    def get_queryset(self):
        code = self.kwargs['code']

        try:
            campus = Campus.objects.get(code__iexact=code)
        except Campus.DoesNotExist:
            raise NotFound(detail=f"Campus with code '{code}' not found")

        # NEW CORRECT QUERY FOR ManyToMany
        # Find OfferedAt entries that include this campus OR are offered everywhere
        offered_entries = OfferedAt.objects.filter(
            models.Q(campuses=campus) | models.Q(offered_everywhere=True)
        ).select_related('programme__department__faculty')

        # Extract distinct programmes
        programmes = [entry.programme for entry in offered_entries]
        return programmes
# Extra: Get all campuses offering a programme
class ProgrammeCampusesView(generics.ListAPIView):
    serializer_class = OfferedAtSerializer

    def get_queryset(self):
        code = self.kwargs['code']
        programme = get_object_or_404(Programme, code__iexact=code)
        return OfferedAt.objects.filter(programme=programme)


# Global search across all KMTC data
class KMTCSearchView(generics.ListAPIView):
    serializer_class = ProgrammeSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'code', 'description', 'department__name', 'department__faculty__name']

    def get_queryset(self):
        return Programme.objects.filter(is_active=True)