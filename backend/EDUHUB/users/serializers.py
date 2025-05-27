# backend/users/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Profile

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    selected_courses = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    
    class Meta:
        model = Profile
        fields = ['id', 'user', 'phone_number', 'has_paid', 'selected_courses']