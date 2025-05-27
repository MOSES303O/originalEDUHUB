# backend/api/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from courses.models import Subject, Course
from courses.serializers import SubjectSerializer, CourseSerializer
from users.models import Profile
from users.serializers import ProfileSerializer
from utils.pdf_generator import generate_pdf

class SubjectViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [AllowAny]

class CourseViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        queryset = Course.objects.all()
        subjects = self.request.query_params.getlist('subject')
        min_points = self.request.query_params.get('min_points')
        
        if subjects:
            queryset = queryset.filter(subjects__value__in=subjects).distinct()
        
        if min_points:
            queryset = queryset.filter(points__lte=int(min_points))
            
        return queryset

@api_view(['POST'])
@permission_classes([AllowAny])
def match_courses(request):
    subject_grades = request.data.get('subjectGrades', [])
    total_points = request.data.get('totalPoints', 0)
    
    # In a real implementation, this would have more sophisticated matching logic
    # For now, we'll just return success
    
    return Response({
        'success': True,
        'message': 'Courses matched successfully'
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    user = authenticate(username=username, password=password)
    
    if user:
        token, _ = Token.objects.get_or_create(user=user)
        profile, _ = Profile.objects.get_or_create(user=user)
        
        return Response({
            'token': token.key,
            'user_id': user.id,
            'email': user.email,
            'has_paid': profile.has_paid
        })
    
    return Response({'error': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    username = request.data.get('username')
    email = request.data.get('email')
    password = request.data.get('password')
    phone_number = request.data.get('phone_number')
    
    if User.objects.filter(username=username).exists():
        return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)
    
    if User.objects.filter(email=email).exists():
        return Response({'error': 'Email already exists'}, status=status.HTTP_400_BAD_REQUEST)
    
    user = User.objects.create_user(username=username, email=email, password=password)
    profile = Profile.objects.create(user=user, phone_number=phone_number)
    token, _ = Token.objects.get_or_create(user=user)
    
    return Response({
        'token': token.key,
        'user_id': user.id,
        'email': user.email,
        'has_paid': profile.has_paid
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def process_payment(request):
    user_id = request.data.get('user_id')
    
    try:
        profile = Profile.objects.get(user_id=user_id)
        profile.has_paid = True
        profile.save()
        
        return Response({
            'success': True,
            'message': 'Payment processed successfully'
        })
    except Profile.DoesNotExist:
        return Response({'error': 'User has not paid'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_courses_pdf(request):
    courses_data = request.data.get('courses', [])
    user_name = request.data.get('userName', 'Student')
    
    # Get course objects from database
    course_ids = [course['id'] for course in courses_data]
    courses = Course.objects.filter(id__in=course_ids)
    
    # Generate PDF
    pdf = generate_pdf(courses, user_name)
    
    # Return PDF as response
    response = Response(pdf, content_type='application/pdf')
    response['Content-Disposition'] = 'attachment; filename="OpenEdu-Selected-Courses.pdf"'
    
    return response