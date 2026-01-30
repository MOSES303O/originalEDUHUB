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
    GET /eduhub/kmtc/programmes/ → list all active KMTC programmes
    GET /eduhub/kmtc/programmes/{code}/ → detail of one programme with all campuses
    """
    serializer_class = ProgrammeSerializer
    lookup_field = 'code'
    lookup_value_regex = '[^/]+'

    def get_queryset(self):
        # We cannot use select_related('campus') because campuses is ManyToMany
        # Instead, we prefetch the OfferedAt and let the serializer handle campus fields via source=
        offered_prefetch = Prefetch(
            'offered_at',
            queryset=OfferedAt.objects.prefetch_related('campuses'),  # ← prefetch the m2m
            to_attr='campuses_offered'
        )

        return Programme.objects.filter(is_active=True)\
            .select_related('department__faculty')\
            .prefetch_related(offered_prefetch)


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