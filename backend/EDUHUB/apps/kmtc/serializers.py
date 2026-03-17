# kmtc/serializers.py
from rest_framework import serializers
from .models import Campus, Faculty, Department, Programme, OfferedAt

class CampusSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campus
        fields = ['name', 'code', 'city']
class OfferedAtSerializer(serializers.ModelSerializer):
    campuses = CampusSimpleSerializer(many=True, read_only=True)
    offered_everywhere = serializers.BooleanField(read_only=True)

    class Meta:
        model = OfferedAt
        fields = ['campuses', 'offered_everywhere']

class ProgrammeSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    faculty_name = serializers.CharField(source='department.faculty.name', read_only=True)
    offered_at = OfferedAtSerializer(source='campuses_offered', many=True, read_only=True)

    # Qualification fields — populated via context from view
    qualified = serializers.SerializerMethodField(read_only=True)
    qualification_details = serializers.SerializerMethodField(read_only=True)
    reason = serializers.SerializerMethodField(read_only=True)
    missing_mandatory = serializers.SerializerMethodField(read_only=True)
    user_points = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Programme
        fields = [
            'id', 'code', 'name', 'level', 'duration', 'qualification',
            'description', 'department_name', 'faculty_name', 'offered_at',
            'qualified', 'qualification_details', 'reason', 'missing_mandatory',
            'user_points'
        ]

    def get_qualified(self, obj):
        return self.context.get('qualified_data', {}).get(obj.code, {}).get('qualified', None)

    def get_qualification_details(self, obj):
        return self.context.get('qualified_data', {}).get(obj.code, {}).get('qualification_details', None)

    def get_reason(self, obj):
        return self.context.get('qualified_data', {}).get(obj.code, {}).get('reason', None)

    def get_missing_mandatory(self, obj):
        return self.context.get('qualified_data', {}).get(obj.code, {}).get('missing_mandatory', [])

    def get_user_points(self, obj):
        return self.context.get('qualified_data', {}).get(obj.code, {}).get('user_points', None)
class DepartmentSerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source='faculty.name', read_only=True)
    programmes = ProgrammeSerializer(many=True, read_only=True)

    class Meta:
        model = Department
        fields = ['id', 'name', 'slug', 'faculty_name', 'programmes']


class FacultySerializer(serializers.ModelSerializer):
    departments = DepartmentSerializer(many=True, read_only=True)

    class Meta:
        model = Faculty
        fields = ['id', 'name', 'slug', 'departments']


class CampusListSerializer(serializers.ModelSerializer):
    programmes_count = serializers.SerializerMethodField()

    class Meta:
        model = Campus
        fields = ['id', 'code', 'name', 'city', 'programmes_count']

    def get_programmes_count(self, obj):
        return obj.programmes_offered.count()


class CampusDetailSerializer(serializers.ModelSerializer):
    programmes_offered = serializers.SerializerMethodField()

    class Meta:
        model = Campus
        fields = ['id', 'code', 'name', 'city', 'programmes_offered']

    def get_programmes_offered(self, obj):
        offered = OfferedAt.objects.filter(campus=obj).select_related('programme__department__faculty')
        return ProgrammeSerializer([oa.programme for oa in offered], many=True).data