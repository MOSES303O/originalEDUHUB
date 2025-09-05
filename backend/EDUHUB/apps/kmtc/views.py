from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import campus, Faculty,programmes
from .serializers import (
    CampusListSerializer,
    FacultySerializer,
    DepartmentSerializer,
    CampusRequirementSerializer,    
    programmesSerializer
)
class CampusViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing campus information.
    
    list:
    Return a paginated list of all active campuses.
    
    retrieve:
    Return the details of a specific campus by ID or slug.
    
    faculties:
    Return all faculties for a specific campus.
    
    departments:
    Return all departments for a specific faculty within a campus.
    
    requirements:
    Return all requirements for a specific campus.
    
    search:
    Search campuses by name, code, or city.
    """
    queryset = campus.objects.all()  # ← Just fetch all campuses
    permission_classes = [permissions.AllowAny]
    filterset_fields = ['city', 'code', 'name']
    search_fields = ['name', 'code', 'city', 'description']
    ordering_fields = ['name', 'ranking', 'established_year']
    lookup_field = 'code'

    def get_serializer_class(self):
        if self.action == 'list':
            return CampusListSerializer
        return CampusRequirementSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()

        # Manually handle filtering
        city = request.query_params.get('city')
        code = request.query_params.get('code')
        name = request.query_params.get('name')

        if city:
            queryset = queryset.filter(city__icontains=city)
        if code:
            queryset = queryset.filter(code__icontains=code)
        if name:
            queryset = queryset.filter(name__icontains=name)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def faculties(self, request, *args, **kwargs):
        campus_instance = self.get_object()
        faculties = campus_instance.faculties.all()
        serializer = FacultySerializer(faculties, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def departments(self, request, *args, **kwargs):
        faculty_slug = request.query_params.get('faculty')
        if not faculty_slug:
            return Response({"detail": "Faculty slug is required."}, status=400)

        try:
            faculty_instance = Faculty.objects.get(slug=faculty_slug, campo=self.get_object())
            departments = faculty_instance.departments.all()
            serializer = DepartmentSerializer(departments, many=True)
            return Response(serializer.data)
        except Faculty.DoesNotExist:
            return Response({"detail": "Faculty not found."}, status=404)
class facultyViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing faculty information.
    
    list:
    Return a list of all faculties, optionally filtered by campus.
    
    retrieve:
    Return the details of a specific faculty.
    
    departments:
    Return all departments for a specific faculty.
    """
    queryset = Faculty.objects.all()
    serializer_class = FacultySerializer
    permission_classes = [permissions.AllowAny]
    search_fields = ['name', 'description']

    def get_queryset(self):
        queryset = self.queryset
        campus_code = self.request.query_params.get('campus_code')
        if campus_code:
            queryset = queryset.filter(campo__code=campus_code)
        return queryset

    @action(detail=True, methods=['get'])
    def departments(self, request, *args, **kwargs):
        faculty_instance = self.get_object()
        departments = faculty_instance.departments.all()
        serializer = DepartmentSerializer(departments, many=True)
        return Response(serializer.data) 
class programmesViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing programmes offered by a campus.
    
    list:
    Return a list of all programmes, optionally filtered by campus or faculty.
    
    retrieve:
    Return the details of a specific programme.
    """
    queryset = programmes.objects.all()
    serializer_class = programmesSerializer
    permission_classes = [permissions.AllowAny]
    filterset_fields = ['faculty__slug', 'campo__code']
    search_fields = ['name', 'description']
    
    def get_queryset(self):
        queryset = self.queryset
        campus_code = self.request.query_params.get('campus_code')
        faculty_slug = self.request.query_params.get('faculty_slug')
        
        if campus_code:
            queryset = queryset.filter(campo__code=campus_code)
        if faculty_slug:
            queryset = queryset.filter(faculty__slug=faculty_slug)
        
        return queryset