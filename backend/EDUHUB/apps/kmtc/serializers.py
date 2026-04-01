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

# kmtc/serializers.py
class ProgrammeSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    faculty_name = serializers.CharField(source='department.faculty.name', read_only=True)
    offered_at = OfferedAtSerializer(source='campuses_offered', many=True, read_only=True)

    # These fields will be injected manually in the view (not from model)
    qualified = serializers.BooleanField(read_only=True, allow_null=True, default=False)
    qualification_details = serializers.DictField(read_only=True, allow_null=True, default=dict)
    reason = serializers.CharField(read_only=True, allow_null=True, default=None)
    missing_mandatory = serializers.ListField(read_only=True, default=list)
    subjects_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Programme
        fields = [
            'id', 'code', 'name', 'level', 'duration', 'qualification',
            'description', 'department_name', 'faculty_name', 'offered_at',
            'qualified', 'qualification_details', 'reason', 
            'missing_mandatory', 'subjects_count'
        ]
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