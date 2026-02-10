# apps/universities/views.py — FINAL, PROFESSIONAL VERSION
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import University,Faculty, Department
from apps.courses.models import CourseOffering
from .serializers import (
    UniversityListSerializer,
    UniversityDetailSerializer,
    FacultySerializer,
    DepartmentSerializer,
)
from apps.courses.serializers import CourseOfferingListSerializer

class UniversityViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for universities.

    - GET /eduhub/universities/ → List all active universities
    - GET /eduhub/universities/{code}/ → Retrieve university details
    - GET /eduhub/universities/{code}/courses/ → List all course offerings at this university
    """
    queryset = University.objects.filter(is_active=True).prefetch_related(
        'offerings__program' 
    )
    lookup_field = 'code'

    def get_serializer_class(self):
        if self.action == 'list':
            return UniversityListSerializer
        return UniversityDetailSerializer

    @action(detail=True, methods=['get'], url_path='courses')
    def courses(self, request, code=None):
        """
        Retrieve all active course offerings at this university.
        
        Includes program details, fees, duration, intake months, etc.
        
        Example: GET /eduhub/universities/UON/courses/
        """
        university = self.get_object()
        
        offerings = CourseOffering.objects.filter(
            university=university,
            is_active=True
        ).select_related('program').prefetch_related('subject_requirements__subject')

        serializer = CourseOfferingListSerializer(
            offerings,
            many=True,
            context={'request': request}
        )
        return Response(serializer.data)


class FacultyViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for global faculties (e.g., Engineering, Medicine).
    
    - GET /eduhub/universities/faculties/ → List all
    - GET /eduhub/universities/faculties/engineering/ → Detail
    """
    queryset = Faculty.objects.all().prefetch_related(
        'departments'
    )
    serializer_class = FacultySerializer
    lookup_field = 'slug'


class DepartmentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for departments within faculties.
    
    - GET /eduhub/universities/departments/ → List all
    - GET /eduhub/universities/departments/computer-science/ → Detail
    """
    queryset = Department.objects.all().select_related('faculty')
    serializer_class = DepartmentSerializer
    lookup_field = 'slug'