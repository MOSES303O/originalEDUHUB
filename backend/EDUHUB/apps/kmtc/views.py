# kmtc/views.py
from rest_framework import viewsets, generics, filters
from django.db import models
from django.db.models import Prefetch
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
import logging

logger = logging.getLogger(__name__)

# CORRECT IMPORT - Engine is in kmtc app
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


class ProgrammeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /eduhub/kmtc/programmes/          → list all active KMTC programmes + qualification
    GET /eduhub/kmtc/programmes/{code}/   → detail of one programme + qualification
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
    
        if request.user.is_authenticated:
            try:
                user_identifier = request.user.phone_number or str(request.user.id)
                engine = KMTCCourseMatchingEngine()
    
                logger.info(f"Starting KMTC qualification check for user: {user_identifier} | {len(queryset)} programmes")
    
                for programme in queryset:
                    code_key = str(programme.code).strip()
    
                    qualified, details = engine.check_user_qualification_for_kmtc_programme(
                        request.user, programme
                    )
    
                    qualified_data[code_key] = {
                        "qualified": qualified,
                        "qualification_details": details,
                        "reason": details.get("reason"),
                        "missing_mandatory": details.get("missing_mandatory", []),
                        "subjects_count": details.get("subjects_count", 0),
                    }
    
                    logger.info(f"QUALIFIED: {qualified} for {programme.name} ({code_key}) | Reason: {details.get('reason')}")
    
            except Exception as e:
                logger.exception(f"KMTC Qualification failed for user {user_identifier}")
    
        # Serialize first
        serializer = self.get_serializer(queryset, many=True, context={'request': request})
        data = serializer.data
    
        # MANUAL MERGE - This is what makes university courses work
        for item in data:
            code_key = str(item.get('code', '')).strip()
            if code_key in qualified_data:
                item.update(qualified_data[code_key])
    
        logger.info(f"Final qualified_data keys: {list(qualified_data.keys())}")
        if data:
            logger.info(f"Serialized data sample (first item): {data[0]}")
    
        return standardize_response(
            success=True,
            message="KMTC programmes retrieved successfully",
            data=data,
            status_code=status.HTTP_200_OK
        )
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        qualified_data = {}

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
                    "user_points": None,
                }
            except Exception as e:
                logger.exception(f"KMTC Qualification failed for programme {instance.code}")

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


# Extra Views (unchanged - they look good)
class CampusProgrammesView(generics.ListAPIView):
    serializer_class = ProgrammeSerializer

    def get_queryset(self):
        code = self.kwargs['code']
        campus = get_object_or_404(Campus, code__iexact=code)

        offered_entries = OfferedAt.objects.filter(
            models.Q(campuses=campus) | models.Q(offered_everywhere=True)
        ).select_related('programme__department__faculty')

        return [entry.programme for entry in offered_entries]


class ProgrammeCampusesView(generics.ListAPIView):
    serializer_class = OfferedAtSerializer

    def get_queryset(self):
        code = self.kwargs['code']
        programme = get_object_or_404(Programme, code__iexact=code)
        return OfferedAt.objects.filter(programme=programme)


class KMTCSearchView(generics.ListAPIView):
    serializer_class = ProgrammeSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'code', 'description', 'department__name', 'department__faculty__name']

    def get_queryset(self):
        return Programme.objects.filter(is_active=True)