from .models import campus, Faculty, Department, campusRequirement,programmes
from rest_framework import serializers

class CampusRequirementSerializer(serializers.ModelSerializer):
    """
    Serializer for campus requirements.
    """
    class Meta:
        model = campusRequirement
        fields = ['id', 'title', 'description', 'min_grade']

class DepartmentSerializer(serializers.ModelSerializer):
    """
    Serializer for campus departments.
    """
    class Meta:
        model = Department
        fields = ['id', 'name', 'slug', 'description']

class FacultySerializer(serializers.ModelSerializer):
    """
    Serializer for campus faculties with nested departments.
    """
    departments = DepartmentSerializer(many=True, read_only=True)

    class Meta:
        model = Faculty
        fields = ['id', 'name', 'slug', 'description', 'departments'] 

class CampusListSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for listing campuses.
    """
    class Meta:
        model = campus
        fields = ['id', 'name', 'slug', 'code','city','description']
class programmesSerializer(serializers.ModelSerializer):
    """
    Serializer for programmes offered by a campus.
    """
    class Meta:
        model = programmes
        fields = ['id', 'name', 'slug', 'description', 'duration', 'faculty']