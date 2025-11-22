"""
Authentication views using standardized base classes.
"""

from rest_framework import status,permissions
from rest_framework.decorators import action
from rest_framework.generics import GenericAPIView
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from io import BytesIO
import csv
from rest_framework.mixins import ListModelMixin, CreateModelMixin, UpdateModelMixin, DestroyModelMixin
from rest_framework_simplejwt.authentication import JWTAuthentication
from apps.core.mixins import APIResponseMixin
from apps.core.utils import logger, standardize_response, log_user_activity
from django.utils import timezone
from django.http import HttpResponse
from .models import User, UserProfile, UserSession, UserSubject, UserSelectedCourse
from .serializers import (
    UserProfileSerializer,
    UserSubjectSerializer,
    UserSelectedCourseSerializer,
)
from apps.core.views import BaseAPIView, BaseModelViewSet
class UserProfileViewSet(BaseModelViewSet):
    """
    User profile management viewset.
    
    GET /eduhub/auth/profile/ - Get user profile
    PUT /eduhub/auth/profile/ - Update user profile
    PATCH /eduhub/auth/profile/ - Partial update user profile
    """
    serializer_class = UserProfileSerializer
    rate_limit_scope = 'profile'
    rate_limit_count = 50
    rate_limit_window = 3600
    
    def get_queryset(self):
        return UserProfile.objects.filter(user=self.request.user)
    
    def get_object(self):
        profile, created = UserProfile.objects.get_or_create(user=self.request.user)
        return profile
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        Get current user's detailed profile.
        
        GET /eduhub/auth/profile/me/
        """
        try:
            user = request.user
            profile = self.get_object()
            
            user_data = {
                'id': user.id,
                'phone_number': user.phone_number,
                'email': user.email,
                'is_active': user.is_active,
                'date_joined': user.date_joined.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None
            }
            profile_data = UserProfileSerializer(profile).data
            
            response_data = {
                'user': user_data,
                'profile': profile_data
            }
            
            return standardize_response(
                success=True,
                message="Profile retrieved successfully",
                data=response_data
            )
            
        except Exception as e:
            return standardize_response(
                success=False,
                message="Failed to retrieve profile",
                errors={'detail': str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class UserSubjectViewSet(BaseModelViewSet):
    """
    User subjects management viewset.
    
    GET /eduhub/auth/subjects/ - List user subjects
    POST /eduhub/auth/subjects/ - Add new subject
    PUT /eduhub/auth/subjects/{id}/ - Update subject
    DELETE /eduhub/auth/subjects/{id}/ - Delete subject
    POST /eduhub/auth/subjects/bulk_create/ - Bulk create subjects
    """
    authentication_classes = [JWTAuthentication]
    serializer_class = UserSubjectSerializer
    rate_limit_scope = 'subjects'
    rate_limit_count = 100
    rate_limit_window = 3600
    
    def get_queryset(self):
        return UserSubject.objects.filter(user=self.request.user).order_by('subject__name')
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        log_user_activity(
            user=self.request.user,
            action='SUBJECT_ADDED',
            details={'subject_id': serializer.validated_data['subject'].id},
            request=self.request
        )
    
    @action(detail=False, methods=['post'], url_path='bulk_create')
    def bulk_create(self, request):
        """
        Bulk create subjects for a user.
        
        Expected JSON payload:
        {
            "subjects": [
                {"subject_id": "uuid1", "grade": "A"},
                {"subject_id": "uuid2", "grade": "B"},
                ...
            ]
        }
        """
        try:
            subjects_data = request.data.get('subjects', [])
            if not subjects_data:
                return standardize_response(
                    success=False,
                    message="No subjects provided",
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            if not 7 <= len(subjects_data) <= 9:
                return standardize_response(
                    success=False,
                    message="You must provide 7 to 9 subjects.",
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            created_subjects = []
            errors = []
            
            for subject_data in subjects_data:
                serializer = self.get_serializer(data=subject_data, context={'request': request})
                if serializer.is_valid():
                    subject = serializer.save(user=request.user)
                    created_subjects.append(serializer.data)
                else:
                    errors.append({
                        'subject_data': subject_data,
                        'errors': serializer.errors
                    })
            
            if created_subjects:
                log_user_activity(
                    user=request.user,
                    action='SUBJECTS_BULK_CREATED',
                    details={'count': len(created_subjects)},
                    request=request
                )
            
            response_data = {
                'created': created_subjects,
                'errors': errors,
                'summary': {
                    'total_provided': len(subjects_data),
                    'created_count': len(created_subjects),
                    'error_count': len(errors)
                }
            }
            
            return standardize_response(
                success=True,
                message=f"Created {len(created_subjects)} subjects successfully",
                data=response_data,
                status_code=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            logger.error(f"Bulk subject creation error: {str(e)}")
            return standardize_response(
                success=False,
                message="Bulk creation failed",
                errors={'detail': str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class UserSessionsView(BaseAPIView):
    """
    User sessions management.
    
    GET /eduhub/auth/sessions/ - List active sessions
    DELETE /eduhub/auth/sessions/{session_id}/ - Revoke session
    """
    rate_limit_scope = 'sessions'
    rate_limit_count = 30
    rate_limit_window = 3600
    
    def get(self, request):
        """
        Get user's active sessions.
        """
        try:
            sessions = UserSession.objects.filter(
                user=request.user,
                is_active=True
            ).order_by('-last_activity')
            
            sessions_data = []
            for session in sessions:
                sessions_data.append({
                    'id': session.id,
                    'session_key': session.session_key,
                    'ip_address': session.ip_address,
                    'user_agent': session.user_agent,
                    'created_at': session.created_at.isoformat(),
                    'last_activity': session.last_activity.isoformat(),
                    'is_current': session.ip_address == self.request_ip
                })
            
            return standardize_response(
                success=True,
                message="Sessions retrieved successfully",
                data={'sessions': sessions_data}
            )
            
        except Exception as e:
            return standardize_response(
                success=False,
                message="Failed to retrieve sessions",
                errors={'detail': str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def delete(self, request, session_id=None):
        """
        Revoke a specific session.
        """
        try:
            if not session_id:
                return standardize_response(
                    success=False,
                    message="Session ID is required",
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            session = UserSession.objects.filter(
                id=session_id,
                user=request.user,
                is_active=True
            ).first()
            
            if not session:
                return standardize_response(
                    success=False,
                    message="Session not found",
                    status_code=status.HTTP_404_NOT_FOUND
                )
            
            session.is_active = False
            session.logout_time = timezone.now()
            session.save()
            
            log_user_activity(
                user=request.user,
                action='SESSION_REVOKED',
                details={'revoked_session_id': session_id},
                request=request
            )
            
            return standardize_response(
                success=True,
                message="Session revoked successfully"
            )
            
        except Exception as e:
            return standardize_response(
                success=False,
                message="Failed to revoke session",
                errors={'detail': str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
class UserSelectedCoursesView(APIResponseMixin, GenericAPIView, ListModelMixin, CreateModelMixin, UpdateModelMixin, DestroyModelMixin):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSelectedCourseSerializer
    # throttle_classes = [CustomUserRateThrottle]  # Uncomment if defined

    def get_queryset(self):
        return UserSelectedCourse.objects.filter(user=self.request.user)

    def get_object(self):
        pk = self.kwargs.get('pk')
        try:
            return UserSelectedCourse.objects.get(pk=pk, user=self.request.user)
        except UserSelectedCourse.DoesNotExist:
            return self.error_response(
                message="Selected course not found",
                status_code=status.HTTP_404_NOT_FOUND
            )

    def perform_create(self, serializer):
        print(f"Creating selected course for user: {self.request.user.phone_number}, course: {self.request.data.get('course')}")
        serializer.save(user=self.request.user)
        log_user_activity(
            user=self.request.user,
            action='COURSE_SELECTED',
            ip_address=self.get_client_ip(self.request),
            details={'course_code': str(self.request.data.get('course'))}
        )

    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            return self.success_response(
                message="Course selected successfully",
                data=serializer.data,
                status_code=status.HTTP_201_CREATED
            )
        except Exception as e:
            print(f"Error creating selected course: {str(e)}")
            return self.error_response(
                message="Failed to select course",
                errors={'detail': str(e)},
                status_code=status.HTTP_400_BAD_REQUEST
            )

    def put(self, request, *args, **kwargs):
        try:
            response = self.update(request, *args, **kwargs)
            log_user_activity(
                user=request.user,
                action='COURSE_UPDATED',
                ip_address=self.get_client_ip(request),
                details={'course_code': str(self.get_object().course.id)}
            )
            return self.success_response(
                message="Course selection updated successfully",
                data=response.data,
                status_code=status.HTTP_200_OK
            )
        except Exception as e:
            return self.error_response(
                message="Failed to update course selection",
                errors={'detail': str(e)},
                status_code=status.HTTP_400_BAD_REQUEST
            )

    def delete(self, request, *args, **kwargs):
        try:
            course_code = self.get_object().course.code
            response = self.destroy(request, *args, **kwargs)
            log_user_activity(
                user=request.user,
                action='COURSE_REMOVED',
                ip_address=self.get_client_ip(request),
                details={'course_code': str(course_code)}
            )
            return self.success_response(
                message="Course removed from selection successfully",
                data=None,
                status_code=status.HTTP_204_NO_CONTENT
            )
        except Exception as e:
            return self.error_response(
                message="Failed to remove course from selection",
                errors={'detail': str(e)},
                status_code=status.HTTP_400_BAD_REQUEST
            )

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR')

    @action(detail=False, methods=['get'], url_path='download')
    def download(self, request):
        try:
            format = request.query_params.get('format', 'pdf')
            queryset = self.get_queryset()
            if not queryset.exists():
                return self.error_response(
                    message="No selected courses to download",
                    status_code=status.HTTP_404_NOT_FOUND
                )

            if format == 'pdf':
                buffer = BytesIO()
                p = canvas.Canvas(buffer, pagesize=letter)
                p.setFont("Helvetica", 12)
                p.drawString(100, 750, f"Selected Courses for {request.user.phone_number}")
                y = 700
                for course in queryset:
                    p.drawString(100, y, f"Course: {course.course.name} ({course.course.id}), Selected: {course.created_at}")
                    y -= 20
                p.showPage()
                p.save()
                buffer.seek(0)
                response = HttpResponse(buffer, content_type='application/pdf')
                response['Content-Disposition'] = 'attachment; filename="selected_courses.pdf"'
                log_user_activity(
                    user=request.user,
                    action='COURSE_DOWNLOADED',
                    ip_address=self.get_client_ip(request),
                    details={'format': 'pdf', 'count': queryset.count()}
                )
                return response
            elif format == 'csv':
                response = HttpResponse(content_type='text/csv')
                response['Content-Disposition'] = 'attachment; filename="selected_courses.csv"'
                writer = csv.writer(response)
                writer.writerow(['Course ID', 'Course Name', 'University', 'Selected At'])
                for course in queryset:
                    writer.writerow([
                        course.course.id,
                        course.course.name,
                        course.course.university_name or 'N/A',
                        course.created_at
                    ])
                log_user_activity(
                    user=request.user,
                    action='COURSE_DOWNLOADED',
                    ip_address=self.get_client_ip(request),
                    details={'format': 'csv', 'count': queryset.count()}
                )
                return response
            else:
                return self.error_response(
                    message="Invalid format. Use 'pdf' or 'csv'.",
                    status_code=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            print(f"Error generating download: {str(e)}")
            return self.error_response(
                message="Failed to generate download",
                errors={'detail': str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )