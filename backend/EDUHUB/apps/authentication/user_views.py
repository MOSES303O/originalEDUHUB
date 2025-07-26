"""
User Authentication Views for EduPathway Platform

This module provides comprehensive user authentication functionalities including:
- User registration with phone number validation and subject submission
- User login with JWT token generation using phone number
- User logout with token blacklisting
- Password management (change, reset)
- User profile management
- Account activation and deactivation
- Subject selection during registration

All views are secured with proper error handling and follow Django REST Framework best practices.
"""

from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.template.loader import render_to_string
from rest_framework.response import Response
from django.conf import settings
import traceback
from rest_framework import permissions
from rest_framework.mixins import UpdateModelMixin, DestroyModelMixin
from rest_framework.generics import ListCreateAPIView
from rest_framework import status
from django.db import transaction
from django.utils import timezone
from django.core.cache import cache
from .models import User, UserProfile, UserSession, UserSelectedCourse
from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework.decorators import action
import logging
from datetime import timedelta
from apps.core.utils import standardize_phone_number, log_user_activity
from .models import User, UserProfile, UserSession, UserSubject
from .serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserProfileSerializer,
    UserSelectedCourseSerializer,
    PasswordChangeSerializer,
    UserSubjectSerializer,
)
from apps.core.mixins import APIResponseMixin, RateLimitMixin

logger = logging.getLogger(__name__)

class CustomAnonRateThrottle(AnonRateThrottle):
    """Custom rate throttle for anonymous users"""
    scope = 'anon_auth'
    rate = '10/min'

class CustomUserRateThrottle(UserRateThrottle):
    """Custom rate throttle for authenticated users"""
    scope = 'user_auth'
    rate = '30/min'

def create_error_response(message="", errors=None, status_code=400):
    return Response({
        "status": "error",
        "message": message,
        "errors": errors,
    }, status=status_code)

def create_success_response(success=True, message="", data=None, status_code=200):
    return Response({
        "status": "success" if success else "error",
        "message": message,
        "data": data,
    }, status=status_code)

class UserRegistrationView(RateLimitMixin, APIView):
    """
    User Registration View
    
    Handles user registration with phone number validation, subject submission, and optional email.
    Creates user profile and sends welcome email (if email provided).
    
    POST /api/v1/auth/register/
    """
    permission_classes = [AllowAny]
    throttle_classes = [CustomAnonRateThrottle]
    
    def post(self, request):
        """
        Register a new user with phone number and subjects
        
        Expected JSON payload:
        {
            "phone_number": "+254712345678",
            "password": "moses123",
            "password_confirm": "moses123",
            "subjects": [
                {"subject_id": "uuid1", "grade": "A"},
                {"subject_id": "uuid2", "grade": "B"},
                ...
            ]
        }
        """
        try:
            ip_address = self.get_client_ip(request)
            logger.info(f"Registration attempt from IP: {ip_address}, payload: {request.data}")
            
            # Check rate limiting
            if not self.check_rate_limit(request, 'registration', limit=5, window=3600):
                return create_error_response(
                    message="Too many registration attempts. Please try again later.",
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS
                )
            
            # Check if user already exists
            phone_number = request.data.get('phone_number')
            if phone_number and User.objects.filter(phone_number=phone_number).exists():
                logger.warning(f"Registration attempt with existing phone number: {phone_number}")
                return create_error_response(
                    message="A user with this phone number already exists. Please log in.",
                    errors={'phone_number': ['This phone number is already registered.']},
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate input data
            serializer = UserRegistrationSerializer(data=request.data)
            if not serializer.is_valid():
                logger.warning(f"Registration validation failed: {serializer.errors}")
                return create_error_response(
                    message=serializer.errors.get('non_field_errors', ['Invalid registration data'])[0],
                    errors=serializer.errors,
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            # Create user with transaction
            with transaction.atomic():
                user = serializer.save()  # Creates user and subjects
                # Create user profile if it doesn't exist
                UserProfile.objects.get_or_create(user=user)
                
                # Generate JWT tokens
                refresh = RefreshToken.for_user(user)
                access_token = refresh.access_token
                
                # Create user session
                UserSession.objects.create(
                    user=user,
                    session_key=str(refresh),
                    ip_address=ip_address,
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    is_active=True
                )
                
                # Log successful registration
                log_user_activity(
                    user=user,
                    action='USER_REGISTERED',
                    ip_address=ip_address,
                    details={'registration_method': 'phone_number'}
                )
                
                # Send welcome email if email provided
                if user.email:
                    try:
                        self.send_welcome_email(user)
                    except Exception as e:
                        logger.error(f"Failed to send welcome email to {user.email}: {str(e)}")
                
                # Prepare response data
                user_data = {
                    'id': user.id,
                    'phone_number': user.phone_number,
                    'first_name': user.first_name or '',
                    'last_name': user.last_name or '',
                    'email': user.email,
                    'is_active': user.is_active,
                    'date_joined': user.date_joined.isoformat()
                }
                
                response_data = {
                    'user': user_data,
                    'tokens': {
                        'access': str(access_token),
                        'refresh': str(refresh)
                    }
                }
                
                logger.info(f"User registered successfully: {user.phone_number}")
                return create_success_response(
                    message="User registered successfully",
                    data=response_data,
                    status_code=status.HTTP_201_CREATED
                )
                
        except Exception as e:
            logger.error(f"Registration error: {str(e)}", exc_info=True)
            return create_error_response(
                message="Registration failed due to server error",
                errors={'detail': str(e), 'stack_trace': traceback.format_exc()},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def send_welcome_email(self, user):
        """Send welcome email to newly registered user"""
        subject = 'Welcome to EduPathway!'
        message = render_to_string('emails/welcome.html', {
            'user': user,
            'site_name': 'EduPathway',
            'site_url': settings.FRONTEND_URL
        })
        
        send_mail(
            subject=subject,
            message='',
            html_message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True
        )
    
    def get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
class UserLoginView(APIResponseMixin, RateLimitMixin, APIView):
    """
    User Login View
    
    Authenticates users using phone number and password (default: 'moses123').
    
    POST /api/v1/auth/login/
    """
    permission_classes = [AllowAny]
    throttle_classes = [CustomAnonRateThrottle]
    
    def post(self, request):
        """
        Login user with phone number
        
        Expected JSON payload:
        {
            "phone_number": "+254712345678",
            "password": "moses123"
        }
        """
        try:
            ip_address = self.get_client_ip(request)
            phone_number = request.data.get('phone_number', '')
            phone_number = standardize_phone_number(phone_number) if phone_number else ''
            failed_attempts_key = f"failed_login_{phone_number}_{ip_address}"
            failed_attempts = cache.get(failed_attempts_key, 0)

            if failed_attempts >= 5:
                return self.error_response(
                    message="Too many failed login attempts. Please try again later.",
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS
                )
            
            serializer = UserLoginSerializer(data=request.data)
            if not serializer.is_valid():
                cache.set(failed_attempts_key, failed_attempts + 1, 3600)
                return self.error_response(
                    message="Invalid login credentials",
                    errors=serializer.errors,
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            phone_number = serializer.validated_data['phone_number']
            password = serializer.validated_data['password']
            user = authenticate(request, phone_number=phone_number, password=password)

            if user is None:
                cache.set(failed_attempts_key, failed_attempts + 1, 3600)
                return self.error_response(
                    message="Invalid phone number or password",
                    status_code=status.HTTP_401_UNAUTHORIZED
                )
            
            if not user.is_active:
                return self.error_response(
                    message="Account is deactivated. Please contact support.",
                    status_code=status.HTTP_401_UNAUTHORIZED
                )

            cache.delete(failed_attempts_key)

            refresh = RefreshToken.for_user(user)
            access_token = refresh.access_token
            user_agent = request.META.get('HTTP_USER_AGENT', '')

            session, created = UserSession.objects.get_or_create(
                user=user,
                ip_address=ip_address,
                user_agent=user_agent,
                defaults={
                    'session_key': str(refresh),
                    'is_active': True,
                    'last_activity': timezone.now()
                }
            )

            if not created:
                session.session_key = str(refresh)
                session.is_active = True
                session.last_activity = timezone.now()
                session.save()

            user.last_login = timezone.now()
            user.save(update_fields=['last_login'])

            log_user_activity(
                user=user,
                action='USER_LOGIN',
                ip_address=ip_address,
                details={'login_method': 'phone_number'}
            )

            try:
                profile = user.profile
                profile_data = UserProfileSerializer(profile).data
            except UserProfile.DoesNotExist:
                profile_data = None

            user_data = {
                'id': user.id,
                'phone_number': user.phone_number,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'is_active': user.is_active,
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'profile': profile_data
            }

            response_data = {
                'user': user_data,
                'tokens': {
                    'access': str(access_token),
                    'refresh': str(refresh)
                }
            }

            return self.success_response(
                message="Login successful",
                data=response_data,
                status_code=status.HTTP_200_OK
            )

        except Exception as e:
            logger.error(f"Login error: {str(e)}")
            return self.error_response(
                message="Login failed due to server error",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

class UserLogoutView(APIResponseMixin, APIView):
    """
    User Logout View
    
    Logs out user by blacklisting their refresh token and deactivating session.
    
    POST /api/v1/auth/logout/
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [CustomUserRateThrottle]
    
    def post(self, request):
        """
        Logout user and invalidate tokens
        
        Expected JSON payload:
        {
            "refresh": "refresh_token_here"
        }
        """
        try:
            ip_address = self.get_client_ip(request)
            user = request.user
            
            refresh_token = request.data.get('refresh')
            
            if refresh_token:
                try:
                    token = RefreshToken(refresh_token)
                    token.blacklist()
                    
                    UserSession.objects.filter(
                        user=user,
                        session_key=refresh_token,
                        is_active=True
                    ).update(
                        is_active=False,
                        logout_time=timezone.now()
                    )
                    
                except TokenError:
                    logger.warning(f"Invalid refresh token provided for logout: {user.phone_number}")
            
            log_user_activity(
                user=user,
                action='USER_LOGOUT',
                ip_address=ip_address,
                details={'logout_method': 'manual'}
            )
            
            logger.info(f"User logged out successfully: {user.phone_number}")
            return self.success_response(
                message="Logout successful",
                status_code=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"Logout error: {str(e)}")
            return self.error_response(
                message="Logout failed due to server error",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

class UserProfileView(APIResponseMixin, APIView):
    """
    User Profile Management View
    
    Handles user profile retrieval and updates.
    
    GET /api/v1/auth/profile/
    PUT /api/v1/auth/profile/
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [CustomUserRateThrottle]
    
    def get(self, request):
        """Get current user's profile"""
        try:
            user = request.user
            profile, created = UserProfile.objects.get_or_create(user=user)
            
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
            
            return self.success_response(
                message="Profile retrieved successfully",
                data=response_data,
                status_code=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"Profile retrieval error: {str(e)}")
            return self.error_response(
                message="Failed to retrieve profile",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def put(self, request):
        """Update user profile"""
        try:
            user = request.user
            ip_address = self.get_client_ip(request)
            
            profile, created = UserProfile.objects.get_or_create(user=user)
            
            user_fields = ['first_name', 'last_name', 'email']
            user_updated = False
            
            for field in user_fields:
                if field in request.data:
                    setattr(user, field, request.data[field])
                    user_updated = True
            
            if user_updated:
                user.save()
            
            serializer = UserProfileSerializer(profile, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                
                log_user_activity(
                    user=user,
                    action='PROFILE_UPDATED',
                    ip_address=ip_address,
                    details={'updated_fields': list(request.data.keys())}
                )
                
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
                
                response_data = {
                    'user': user_data,
                    'profile': serializer.data
                }
                
                return self.success_response(
                    message="Profile updated successfully",
                    data=response_data,
                    status_code=status.HTTP_200_OK
                )
            else:
                return self.error_response(
                    message="Validation failed",
                    errors=serializer.errors,
                    status_code=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            logger.error(f"Profile update error: {str(e)}")
            return self.error_response(
                message="Failed to update profile",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

class PasswordChangeView(APIResponseMixin, APIView):
    """
    Password Change View
    
    Allows authenticated users to change their password.
    
    POST /api/v1/auth/change-password/
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [CustomUserRateThrottle]
    
    def post(self, request):
        """
        Change user password
        
        Expected JSON payload:
        {
            "old_password": "currentpassword",
            "new_password": "newpassword123",
            "new_password_confirm": "newpassword123"
        }
        """
        try:
            user = request.user
            ip_address = self.get_client_ip(request)
            
            serializer = PasswordChangeSerializer(data=request.data)
            if not serializer.is_valid():
                return self.error_response(
                    message="Validation failed",
                    errors=serializer.errors,
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            if not user.check_password(serializer.validated_data['old_password']):
                return self.error_response(
                    message="Current password is incorrect",
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            
            current_session_key = request.data.get('current_session')
            UserSession.objects.filter(user=user).exclude(
                session_key=current_session_key
            ).update(
                is_active=False,
                logout_time=timezone.now()
            )
            
            log_user_activity(
                user=user,
                action='PASSWORD_CHANGED',
                ip_address=ip_address,
                details={'method': 'user_initiated'}
            )
            
            logger.info(f"Password changed successfully for user: {user.phone_number}")
            return self.success_response(
                message="Password changed successfully",
                status_code=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"Password change error: {str(e)}")
            return self.error_response(
                message="Failed to change password",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

class TokenRefreshView(APIResponseMixin, APIView):
    """
    Token Refresh View
    
    Refreshes access token using refresh token.
    
    POST /api/v1/auth/refresh/
    """
    permission_classes = [AllowAny]
    throttle_classes = [CustomUserRateThrottle]
    
    def post(self, request):
        """
        Refresh access token
        
        Expected JSON payload:
        {
            "refresh": "refresh_token_here"
        }
        """
        try:
            refresh_token = request.data.get('refresh')
            ip_address = self.get_client_ip(request)
            
            if not refresh_token:
                logger.warning("Token refresh attempt without refresh token")
                return self.error_response(
                    message="Refresh token is required",
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                refresh = RefreshToken(refresh_token)
                access_token = refresh.access_token
                
                user_id = refresh.payload.get('user_id')
                user = User.objects.get(id=user_id)
                
                session = UserSession.objects.filter(
                    user=user,
                    session_key=refresh_token,
                    is_active=True
                ).first()
                
                if session:
                    session.last_activity = timezone.now()
                    session.save()
                else:
                    logger.warning(f"No active session found for refresh token: user_id={user_id}")
                    return self.error_response(
                        message="No active session found for this token",
                        status_code=status.HTTP_401_UNAUTHORIZED
                    )
                
                log_user_activity(
                    user=user,
                    action='TOKEN_REFRESHED',
                    ip_address=ip_address,
                    details={'method': 'refresh_token'}
                )
                
                return self.success_response(
                    message="Token refreshed successfully",
                    data={'access': str(access_token)},
                    status_code=status.HTTP_200_OK
                )
                
            except TokenError as e:
                logger.warning(f"Invalid refresh token: {str(e)}")
                return self.error_response(
                    message="Invalid or expired refresh token",
                    status_code=status.HTTP_401_UNAUTHORIZED
                )
            
            except User.DoesNotExist:
                logger.warning(f"User not found for refresh token: user_id={user_id}")
                return self.error_response(
                    message="User not found",
                    status_code=status.HTTP_401_UNAUTHORIZED
                )
                
        except Exception as e:
            logger.error(f"Token refresh error: {str(e)}")
            return self.error_response(
                message="Failed to refresh token",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

class UserSubjectViewSet(APIResponseMixin, viewsets.ModelViewSet):
    """
    ViewSet to manage user subjects.
    
    GET /api/v1/auth/subjects/
    POST /api/v1/auth/subjects/
    POST /api/v1/auth/subjects/bulk_create/
    """
    queryset = UserSubject.objects.all()
    serializer_class = UserSubjectSerializer
    permission_classes = [IsAuthenticated]
    throttle_classes = [CustomUserRateThrottle]
    
    def get_queryset(self):
        return UserSubject.objects.filter(user=self.request.user).order_by('subject__name')
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        log_user_activity(
            user=self.request.user,
            action='SUBJECT_ADDED',
            ip_address=self.get_client_ip(self.request),
            details={'subject_id': serializer.validated_data['subject'].id}
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
                return self.error_response(
                    message="No subjects provided",
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            if not 7 <= len(subjects_data) <= 9:
                return self.error_response(
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
                    ip_address=self.get_client_ip(request),
                    details={'count': len(created_subjects)}
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
            
            return self.success_response(
                message=f"Created {len(created_subjects)} subjects successfully",
                data=response_data,
                status_code=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            logger.error(f"Bulk subject creation error: {str(e)}")
            return self.error_response(
                message="Bulk creation failed",
                errors={'detail': str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

# In apps/authentication/user_views.py, update UserSelectedCoursesView
class UserSelectedCoursesView(APIResponseMixin, ListCreateAPIView, UpdateModelMixin, DestroyModelMixin):
    """
    GET: List courses selected by the authenticated user.
    POST: Select a new course for the user.
    PUT: Update a selected course.
    DELETE: Remove a selected course.
    
    GET /api/v1/user/selected-courses/
    POST /api/v1/user/selected-courses/
    PUT /api/v1/user/selected-courses/<int:pk>/
    DELETE /api/v1/user/selected-courses/<int:pk>/
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSelectedCourseSerializer

    def get_queryset(self):
        return UserSelectedCourse.objects.filter(user=self.request.user)

    def get_object(self):
        pk = self.kwargs.get('pk')
        try:
            return UserSelectedCourse.objects.get(pk=pk, user=self.request.user)
        except UserSelectedCourse.DoesNotExist:
            raise status.Http404("Selected course not found")

    def put(self, request, *args, **kwargs):
        try:
            response = self.update(request, *args, **kwargs)
            log_user_activity(
                user=request.user,
                action='COURSE_UPDATED',
                ip_address=self.get_client_ip(request),
                details={'course_id': str(self.get_object().course_id)}
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
            course_id = self.get_object().course_id
            response = self.destroy(request, *args, **kwargs)
            log_user_activity(
                user=request.user,
                action='COURSE_REMOVED',
                ip_address=self.get_client_ip(request),
                details={'course_id': str(course_id)}
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
class UserApplicationsView(APIResponseMixin, APIView):
    """
    View applications submitted by the user
    
    GET /api/v1/user/applications/
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [CustomUserRateThrottle]
    
    def get(self, request):
        user = request.user
        applied_courses = UserSelectedCourse.objects.filter(user=user, is_applied=True)
        serializer = UserSelectedCourseSerializer(applied_courses, many=True)
        return self.success_response(
            message="Applications retrieved successfully",
            data=serializer.data,
            status_code=status.HTTP_200_OK
        )