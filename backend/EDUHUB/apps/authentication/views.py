"""
Authentication views using standardized base classes.
"""

from rest_framework import status, permissions
from rest_framework.decorators import action
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import authenticate
from django.utils import timezone
from django.core.cache import cache

from apps.core.views import BaseAPIView, BaseModelViewSet
from apps.core.utils import (
    standardize_response, get_client_ip, log_user_activity,
    cache_key, generate_reference, validate_kenyan_phone,
    standardize_phone_number
)
from .models import User, UserProfile, UserSubject, UserSession
from .serializers import (
    UserRegistrationSerializer, UserLoginSerializer,
    UserProfileSerializer, UserDetailSerializer,
    UserSubjectSerializer, PasswordChangeSerializer
)


class UserRegistrationView(BaseAPIView):
    """
    User registration endpoint with standardized response format.
    
    POST /api/v1/auth/register/
    
    Request Body:
    {
        "email": "user@example.com",
        "password": "securepassword123",
        "password_confirm": "securepassword123",
        "first_name": "John",
        "last_name": "Doe",
        "phone_number": "+254712345678"
    }
    
    Response:
    {
        "success": true,
        "message": "User registered successfully",
        "data": {
            "user": {...},
            "tokens": {
                "access": "...",
                "refresh": "..."
            }
        }
    }
    """
    
    authentication_required = False
    rate_limit_scope = 'registration'
    rate_limit_count = 5
    rate_limit_window = 3600  # 1 hour
    
    def post(self, request):
        """
        Register a new user.
        """
        serializer = UserRegistrationSerializer(data=request.data)
        
        if not serializer.is_valid():
            return standardize_response(
                success=False,
                message="Registration validation failed",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Create user
            user = serializer.save()
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            
            # Create user session
            session_key = generate_reference('SESSION')
            UserSession.objects.create(
                user=user,
                session_key=session_key,
                ip_address=self.request_ip,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                is_active=True
            )
            
            # Log registration
            log_user_activity(
                user=user,
                action='USER_REGISTERED',
                details={'registration_method': 'email'},
                request=request
            )
            
            response_data = {
                'user': UserDetailSerializer(user).data,
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh)
                },
                'session_key': session_key
            }
            
            return standardize_response(
                success=True,
                message="User registered successfully",
                data=response_data,
                status_code=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            return standardize_response(
                success=False,
                message="Registration failed",
                errors={'detail': str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UserLoginView(BaseAPIView):
    """
    User login endpoint with standardized response format.
    
    POST /api/v1/auth/login/
    
    Request Body:
    {
        "email": "user@example.com",
        "password": "userpassword"
    }
    
    Response:
    {
        "success": true,
        "message": "Login successful",
        "data": {
            "user": {...},
            "tokens": {
                "access": "...",
                "refresh": "..."
            }
        }
    }
    """
    
    authentication_required = False
    rate_limit_scope = 'login'
    rate_limit_count = 10
    rate_limit_window = 3600  # 1 hour
    
    def post(self, request):
        """
        Authenticate user and return tokens.
        """
        serializer = UserLoginSerializer(data=request.data, context={'request': request})
        
        if not serializer.is_valid():
            return standardize_response(
                success=False,
                message="Invalid login credentials",
                errors=serializer.errors,
                status_code=status.HTTP_401_UNAUTHORIZED
            )
        
        try:
            user = serializer.validated_data['user']
            
            # Update last login
            user.last_login = timezone.now()
            user.save(update_fields=['last_login'])
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            
            # Create or update user session
            session_key = generate_reference('SESSION')
            session, created = UserSession.objects.get_or_create(
                user=user,
                ip_address=self.request_ip,
                defaults={
                    'session_key': session_key,
                    'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                    'is_active': True,
                    'last_activity': timezone.now()
                }
            )
            
            if not created:
                session.session_key = session_key
                session.last_activity = timezone.now()
                session.is_active = True
                session.save()
            
            # Log login
            log_user_activity(
                user=user,
                action='USER_LOGIN',
                details={'login_method': 'email'},
                request=request
            )
            
            response_data = {
                'user': UserDetailSerializer(user).data,
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh)
                },
                'session_key': session_key
            }
            
            return standardize_response(
                success=True,
                message="Login successful",
                data=response_data
            )
            
        except Exception as e:
            return standardize_response(
                success=False,
                message="Login failed",
                errors={'detail': str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UserLogoutView(BaseAPIView):
    """
    User logout endpoint with token blacklisting.
    
    POST /api/v1/auth/logout/
    
    Request Body:
    {
        "refresh_token": "..."
    }
    
    Response:
    {
        "success": true,
        "message": "Logout successful"
    }
    """
    
    rate_limit_scope = 'logout'
    rate_limit_count = 20
    rate_limit_window = 3600
    
    def post(self, request):
        """
        Logout user and blacklist tokens.
        """
        try:
            refresh_token = request.data.get('refresh_token')
            
            if refresh_token:
                try:
                    token = RefreshToken(refresh_token)
                    token.blacklist()
                except TokenError:
                    pass  # Token already invalid
            
            # Deactivate user sessions
            UserSession.objects.filter(
                user=request.user,
                ip_address=self.request_ip,
                is_active=True
            ).update(
                is_active=False,
                logout_time=timezone.now()
            )
            
            # Log logout
            log_user_activity(
                user=request.user,
                action='USER_LOGOUT',
                details={'logout_method': 'manual'},
                request=request
            )
            
            return standardize_response(
                success=True,
                message="Logout successful"
            )
            
        except Exception as e:
            return standardize_response(
                success=False,
                message="Logout failed",
                errors={'detail': str(e)},
                status_code=status.HTTP_400_BAD_REQUEST
            )


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
        """
        Return user's profile.
        """
        return UserProfile.objects.filter(user=self.request.user)
    
    def get_object(self):
        """
        Get or create user profile.
        """
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
            
            user_data = UserDetailSerializer(user).data
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
    """
    
    serializer_class = UserSubjectSerializer
    rate_limit_scope = 'subjects'
    rate_limit_count = 100
    rate_limit_window = 3600
    
    def get_queryset(self):
        """
        Return user's subjects.
        """
        return UserSubject.objects.filter(user=self.request.user).order_by('-year', 'subject_name')
    
    def perform_create(self, serializer):
        """
        Create subject for current user.
        """
        return serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """
        Bulk create subjects.
        
        POST /api/v1/auth/subjects/bulk_create/
        
        Request Body:
        {
            "subjects": [
                {
                    "subject_name": "Mathematics",
                    "grade": "A",
                    "year": 2023,
                    "exam_type": "KCSE"
                },
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
            
            created_subjects = []
            errors = []
            
            for subject_data in subjects_data:
                serializer = self.get_serializer(data=subject_data)
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
            return standardize_response(
                success=False,
                message="Bulk creation failed",
                errors={'detail': str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PasswordChangeView(BaseAPIView):
    """
    Password change endpoint.
    
    POST /api/v1/auth/change-password/
    
    Request Body:
    {
        "old_password": "currentpassword",
        "new_password": "newpassword123",
        "new_password_confirm": "newpassword123"
    }
    """
    
    rate_limit_scope = 'password_change'
    rate_limit_count = 5
    rate_limit_window = 3600
    
    def post(self, request):
        """
        Change user password.
        """
        serializer = PasswordChangeSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if not serializer.is_valid():
            return standardize_response(
                success=False,
                message="Password change validation failed",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Verify old password
            if not request.user.check_password(serializer.validated_data['old_password']):
                return standardize_response(
                    success=False,
                    message="Current password is incorrect",
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            # Set new password
            request.user.set_password(serializer.validated_data['new_password'])
            request.user.save()
            
            # Invalidate all user sessions except current
            UserSession.objects.filter(
                user=request.user,
                is_active=True
            ).exclude(
                ip_address=self.request_ip
            ).update(
                is_active=False,
                logout_time=timezone.now()
            )
            
            # Log password change
            log_user_activity(
                user=request.user,
                action='PASSWORD_CHANGED',
                details={'change_method': 'user_initiated'},
                request=request
            )
            
            return standardize_response(
                success=True,
                message="Password changed successfully"
            )
            
        except Exception as e:
            return standardize_response(
                success=False,
                message="Password change failed",
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
            
            # Deactivate session
            session.is_active = False
            session.logout_time = timezone.now()
            session.save()
            
            # Log session revocation
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
