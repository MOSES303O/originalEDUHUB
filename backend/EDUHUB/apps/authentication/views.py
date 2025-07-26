"""
Authentication views using standardized base classes.
"""

from rest_framework import status, mixins, generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from apps.core.utils import logger, standardize_response, get_client_ip, log_user_activity
from django.utils import timezone
from .models import User, UserProfile, UserSession, UserSubject, UserSelectedCourse
from .serializers import (
    UserProfileSerializer,
    UserSubjectSerializer,
    UserSelectedCourseSerializer,
)
from apps.core.views import BaseAPIView, BaseModelViewSet
from apps.payments.models import UserSubscription

class UserProfileViewSet(BaseModelViewSet):
    """
    User profile management viewset.
    
    GET /api/v1/auth/profile/ - Get user profile
    PUT /api/v1/auth/profile/ - Update user profile
    PATCH /api/v1/auth/profile/ - Partial update user profile
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
        
        GET /api/v1/auth/profile/me/
        """
        try:
            user = request.user
            profile = self.get_object()
            
            user_data = {
                'id': user.id,
                'phone_number': user.phone_number,
                'first_name': user.first_name,
                'last_name': user.last_name,
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
    
    GET /api/v1/auth/subjects/ - List user subjects
    POST /api/v1/auth/subjects/ - Add new subject
    PUT /api/v1/auth/subjects/{id}/ - Update subject
    DELETE /api/v1/auth/subjects/{id}/ - Delete subject
    POST /api/v1/auth/subjects/bulk_create/ - Bulk create subjects
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
    
    GET /api/v1/auth/sessions/ - List active sessions
    DELETE /api/v1/auth/sessions/{session_id}/ - Revoke session
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

class UserSelectedCourseView(mixins.UpdateModelMixin, mixins.DestroyModelMixin, generics.ListCreateAPIView):
    """
    Manages user-selected courses.
    
    GET /api/v1/user/selected-courses/
    POST /api/v1/user/selected-courses/
    PUT /api/v1/user/selected-courses/{id}/
    DELETE /api/v1/user/selected-courses/{id}/
    """
    serializer_class = UserSelectedCourseSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get_queryset(self):
        return UserSelectedCourse.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        log_user_activity(
            user=self.request.user,
            action='COURSE_SELECTED',
            details={'course_id': serializer.validated_data['course_id']},
            request=self.request
        )
    
    def create(self, request, *args, **kwargs):
        try:
            response = super().create(request, *args, **kwargs)
            return standardize_response(
                success=True,
                message="Course added to selection successfully",
                data=response.data,
                status_code=status.HTTP_201_CREATED
            )
        except Exception as e:
            return standardize_response(
                success=False,
                message="Failed to add course to selection",
                errors={'detail': str(e)},
                status_code=status.HTTP_400_BAD_REQUEST
            )
    
    def update(self, request, *args, **kwargs):
        try:
            response = super().update(request, *args, **kwargs)
            return standardize_response(
                success=True,
                message="Course selection updated successfully",
                data=response.data,
                status_code=status.HTTP_200_OK
            )
        except Exception as e:
            return standardize_response(
                success=False,
                message="Failed to update course selection",
                errors={'detail': str(e)},
                status_code=status.HTTP_400_BAD_REQUEST
            )
    
    def destroy(self, request, *args, **kwargs):
        try:
            response = super().destroy(request, *args, **kwargs)
            return standardize_response(
                success=True,
                message="Course removed from selection successfully",
                data=None,
                status_code=status.HTTP_204_NO_CONTENT
            )
        except Exception as e:
            return standardize_response(
                success=False,
                message="Failed to remove course from selection",
                errors={'detail': str(e)},
                status_code=status.HTTP_400_BAD_REQUEST
            )