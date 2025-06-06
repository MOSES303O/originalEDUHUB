from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import University, Faculty, Department
from .serializers import (
    UniversityListSerializer, 
    UniversityDetailSerializer,
    FacultySerializer,
    DepartmentSerializer
)
#from apps.core.utils import StandardResultsSetPagination


class UniversityViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing university information.
    
    list:
    #CHECK OUT THIS ERROR
    Return a paginated list of all active universities.
    
    retrieve:
    Return the details of a specific university by ID or slug.
    
    faculties:
    Return all faculties for a specific university.
    
    search:
    Search universities by name, code, or city.
    """
    queryset = University.objects.filter(is_active=True)
    permission_classes = [permissions.AllowAny]
    #pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['city', 'country']
    search_fields = ['name', 'code', 'city', 'description']
    ordering_fields = ['name', 'ranking', 'established_year']
    lookup_field = 'slug'

    def get_serializer_class(self):
        if self.action == 'list':
            return UniversityListSerializer
        return UniversityDetailSerializer

    @action(detail=True, methods=['get'])
    def faculties(self, request, slug=None):
        """
        Return all faculties for a specific university.
        """
        university = self.get_object()
        faculties = university.faculties.filter(is_active=True)
        serializer = FacultySerializer(faculties, many=True)
        return Response(serializer.data)


class FacultyViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing faculty information.
    
    list:
    Return a list of all faculties, optionally filtered by university.
    
    retrieve:
    Return the details of a specific faculty.
    
    departments:
    Return all departments for a specific faculty.
    """
    queryset = Faculty.objects.filter(is_active=True)
    serializer_class = FacultySerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['university']
    search_fields = ['name', 'description']

    @action(detail=True, methods=['get'])
    def departments(self, request, pk=None):
        """
        Return all departments for a specific faculty.
        """
        faculty = self.get_object()
        departments = faculty.departments.filter(is_active=True)
        serializer = DepartmentSerializer(departments, many=True)
        return Response(serializer.data)
