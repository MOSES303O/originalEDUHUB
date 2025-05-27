# backend/courses/serializers.py
from rest_framework import serializers
from .models import Subject, Course, Career, Campus

class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ['id', 'value', 'label']

class CareerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Career
        fields = ['name']

class CampusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campus
        fields = ['name']

class CourseSerializer(serializers.ModelSerializer):
    subjects = serializers.StringRelatedField(many=True)
    careers = CareerSerializer(many=True, read_only=True)
    campuses = CampusSerializer(many=True, read_only=True)
    
    class Meta:
        model = Course
        fields = [
            'id', 'code', 'title', 'university', 'description', 
            'full_description', 'points', 'duration', 'start_date', 
            'application_deadline', 'subjects', 'careers', 'campuses'
        ]