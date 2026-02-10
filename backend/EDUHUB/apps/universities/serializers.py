# universities/serializers.py — FINAL & CLEAN
from rest_framework import serializers
from .models import University, Faculty, Department,UniversityRequirement


class UniversityRequirementSerializer(serializers.ModelSerializer):
    class Meta:
        model = UniversityRequirement
        fields = ['title', 'description', 'min_grade']

class DepartmentSerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source='faculty.name', read_only=True)

    class Meta:
        model = Department
        fields = ['id', 'name', 'slug', 'faculty_name']


class FacultySerializer(serializers.ModelSerializer):
    departments = DepartmentSerializer(many=True, read_only=True)

    class Meta:
        model = Faculty
        fields = ['id', 'name', 'slug', 'departments']


class UniversityListSerializer(serializers.ModelSerializer):
    courses_count = serializers.SerializerMethodField()

    class Meta:
        model = University
        fields = ['id', 'code', 'name', 'city','description', 'type','accreditation', 'ranking', 'logo','courses_count']

    def get_courses_count(self, obj):
        return obj.offerings.filter(is_active=True).count()

class UniversityDetailSerializer(serializers.ModelSerializer):
    requirements = UniversityRequirementSerializer(many=True, read_only=True)

    class Meta:
        model = University
        fields = [
            'id', 'code', 'name','city', 'type',
            'description', 'website', 'accreditation', 'logo',
            'ranking', 'established_year', 'requirements'
        ]