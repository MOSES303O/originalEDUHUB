from rest_framework import serializers
from .models import University, Faculty, Department, UniversityRequirement


class UniversityRequirementSerializer(serializers.ModelSerializer):
    """
    Serializer for university requirements.
    """
    class Meta:
        model = UniversityRequirement
        fields = ['id', 'title', 'description', 'min_grade']


class DepartmentSerializer(serializers.ModelSerializer):
    """
    Serializer for university departments.
    """
    class Meta:
        model = Department
        fields = ['id', 'name', 'slug', 'description']


class FacultySerializer(serializers.ModelSerializer):
    """
    Serializer for university faculties with nested departments.
    """
    departments = DepartmentSerializer(many=True, read_only=True)

    class Meta:
        model = Faculty
        fields = ['id', 'name', 'slug', 'description', 'departments']


class UniversityListSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for listing universities.
    """
    class Meta:
        model = University
        fields = ['id', 'name', 'slug', 'code', 'logo', 'city','campus', 'ranking']


class UniversityDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for university information with nested faculties and requirements.
    """
    faculties = FacultySerializer(many=True, read_only=True)
    requirements = UniversityRequirementSerializer(many=True, read_only=True)

    class Meta:
        model = University
        fields = [
            'id', 'name', 'slug', 'code', 'description', 'website', 
            'logo', 'address', 'city', 'ranking','campus', 
            'established_year', 'faculties', 'requirements'
        ]
