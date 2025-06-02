"""
User Authentication Views for EduPathway Platform

This module provides comprehensive user authentication functionalities including:
- User registration with validation and email verification
- User login with JWT token generation
- User logout with token blacklisting
- Password management (change, reset)
- User profile management
- Account activation and deactivation

All views are secured with proper error handling and follow Django REST Framework best practices.
"""

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.template.loader import render_to_string
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.core.cache import cache

from apps.courses.models import Subject, Course,UserSelectedCourse
from apps.courses.serializers import UserSelectedCourseSerializer
from rest_framework import viewsets,status, permissions
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from apps.authentication.serializers import SubjectSerializer  # Make sure this exists or define it
from rest_framework.decorators import action

import logging
import json
from datetime import datetime, timedelta

from .models import User, UserProfile, UserSession
from .serializers import (
    UserRegistrationSerializer, 
    UserLoginSerializer, 
    UserProfileSerializer,
    PasswordChangeSerializer,
    PasswordResetSerializer,
    PasswordResetConfirmSerializer
)
from apps.core.utils import create_success_response, create_error_response, log_user_action
from apps.core.mixins import RateLimitMixin
logger = logging.getLogger(__name__)


class CustomAnonRateThrottle(AnonRateThrottle):
    """Custom rate throttle for anonymous users"""
    scope = 'anon_auth'
    rate = '10/min'


class CustomUserRateThrottle(UserRateThrottle):
    """Custom rate throttle for authenticated users"""
    scope = 'user_auth'
    rate = '30/min'


class UserRegistrationView(RateLimitMixin, APIView):
    """
    User Registration View
    
    Handles user registration with comprehensive validation, password hashing,
    and optional email verification. Creates user profile and sends welcome email.
    
    POST /api/v1/auth/register/
    """
    permission_classes = [AllowAny]
    throttle_classes = [CustomAnonRateThrottle]
    
    def post(self, request):
        """
        Register a new user
        
        Expected JSON payload:
        {
            "email": "user@example.com",
            "password": "securepassword123",
            "password_confirm": "securepassword123",
            "first_name": "John",
            "last_name": "Doe",
            "phone_number": "+254712345678",
            "date_of_birth": "1995-01-01",
            "gender": "M",
            "county": "Nairobi"
        }
        """
        try:
            # Log registration attempt
            ip_address = self.get_client_ip(request)
            logger.info(f"Registration attempt from IP: {ip_address}")
            
            # Check rate limiting
            if not self.check_rate_limit(request, 'registration', limit=5, window=3600):
                return create_error_response(
                    success=False,
                    message="Too many registration attempts. Please try again later.",
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS
                )
            
            # Validate input data
            serializer = UserRegistrationSerializer(data=request.data)
            if not serializer.is_valid():
                logger.warning(f"Registration validation failed: {serializer.errors}")
                return create_error_response(
                    success=False,
                    message="Validation failed",
                    data={"errors": serializer.errors},
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if user already exists
            email = serializer.validated_data['email'].lower()
            if User.objects.filter(email=email).exists():
                logger.warning(f"Registration attempt with existing email: {email}")
                return create_error_response(
                    success=False,
                    message="A user with this email already exists.",
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            # Create user with transaction to ensure data consistency
            with transaction.atomic():
                # Create user
                user = User.objects.create_user(
                    email=email,
                    password=serializer.validated_data['password'],
                    first_name=serializer.validated_data['first_name'],
                    last_name=serializer.validated_data['last_name'],
                    phone_number=serializer.validated_data['phone_number'],
                    is_active=True  # Set to False if email verification is required
                )
                
                # Create user profile
                profile_data = {
                    'date_of_birth': serializer.validated_data.get('date_of_birth'),
                    'gender': serializer.validated_data.get('gender'),
                    'county': serializer.validated_data.get('county'),
                    'registration_ip': ip_address,
                    'registration_date': timezone.now()
                }
                
                UserProfile.objects.create(user=user, **profile_data)
                
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
                log_user_action(
                    user=user,
                    action='USER_REGISTERED',
                    ip_address=ip_address,
                    details={'registration_method': 'email'}
                )
                
                # Send welcome email (optional)
                try:
                    self.send_welcome_email(user)
                except Exception as e:
                    logger.error(f"Failed to send welcome email to {email}: {str(e)}")
                
                # Prepare response data
                user_data = {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'phone_number': user.phone_number,
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
                
                logger.info(f"User registered successfully: {email}")
                return create_success_response(
                    success=True,
                    message="User registered successfully",
                    data=response_data,
                    status_code=status.HTTP_201_CREATED
                )
                
        except Exception as e:
            logger.error(f"Registration error: {str(e)}")
            return create_success_response(
                success=False,
                message="Registration failed due to server error",
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
            fail_silently=False
        )


class UserLoginView(RateLimitMixin, APIView):
    """
    User Login View
    
    Authenticates users and generates JWT tokens for session management.
    Tracks login attempts and implements security measures.
    
    POST /api/v1/auth/login/
    """
    permission_classes = [AllowAny]
    throttle_classes = [CustomAnonRateThrottle]
    
    def post(self, request):
        """
        Authenticate user and generate tokens
        
        Expected JSON payload:
        {
            "email": "user@example.com",
            "password": "userpassword"
        }
        """
        try:
            ip_address = self.get_client_ip(request)
            logger.info(f"Login attempt from IP: {ip_address}")
            
            # Check rate limiting for failed login attempts
            email = request.data.get('email', '').lower()
            failed_attempts_key = f"failed_login_{email}_{ip_address}"
            failed_attempts = cache.get(failed_attempts_key, 0)
            
            if failed_attempts >= 5:
                logger.warning(f"Too many failed login attempts for {email} from {ip_address}")
                return create_error_response(
                    success=False,
                    message="Too many failed login attempts. Please try again later.",
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS
                )
            
            # Validate input data
            serializer = UserLoginSerializer(data=request.data)
            if not serializer.is_valid():
                return create_error_response(
                    success=False,
                    message="Invalid login credentials",
                    data={"errors": serializer.errors},
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']
            
            # Authenticate user
            user = authenticate(request, username=email, password=password)
            
            if user is None:
                # Increment failed attempts
                cache.set(failed_attempts_key, failed_attempts + 1, 3600)  # 1 hour
                
                logger.warning(f"Failed login attempt for {email} from {ip_address}")
                return create_success_response(
                    success=False,
                    message="Invalid email or password",
                    status_code=status.HTTP_401_UNAUTHORIZED
                )
            
            if not user.is_active:
                logger.warning(f"Login attempt for inactive user: {email}")
                return create_success_response(
                    success=False,
                    message="Account is deactivated. Please contact support.",
                    status_code=status.HTTP_401_UNAUTHORIZED
                )
            
            # Clear failed attempts on successful login
            cache.delete(failed_attempts_key)
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            access_token = refresh.access_token
            
            # Update or create user session
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
            
            # Update user's last login
            user.last_login = timezone.now()
            user.save(update_fields=['last_login'])
            
            # Log successful login
            log_user_action(
                user=user,
                action='USER_LOGIN',
                ip_address=ip_address,
                details={'login_method': 'email_password'}
            )
            
            # Get user profile data
            try:
                profile = user.profile
                profile_data = UserProfileSerializer(profile).data
            except UserProfile.DoesNotExist:
                profile_data = None
            
            # Prepare response data
            user_data = {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'phone_number': user.phone_number,
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
            
            logger.info(f"User logged in successfully: {email}")
            return create_success_response(
                success=True,
                message="Login successful",
                data=response_data,
                status_code=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"Login error: {str(e)}")
            return create_error_response(
                success=False,
                message="Login failed due to server error",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UserLogoutView(APIView):
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
            
            # Get refresh token from request
            refresh_token = request.data.get('refresh')
            
            if refresh_token:
                try:
                    # Blacklist the refresh token
                    token = RefreshToken(refresh_token)
                    token.blacklist()
                    
                    # Deactivate user session
                    UserSession.objects.filter(
                        user=user,
                        session_key=refresh_token,
                        is_active=True
                    ).update(
                        is_active=False,
                        logout_time=timezone.now()
                    )
                    
                except TokenError:
                    logger.warning(f"Invalid refresh token provided for logout: {user.email}")
            
            # Log logout activity
            log_user_activity(
                user=user,
                action='USER_LOGOUT',
                ip_address=ip_address,
                details={'logout_method': 'manual'}
            )
            
            logger.info(f"User logged out successfully: {user.email}")
            return create_success_response(
                success=True,
                message="Logout successful",
                status_code=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"Logout error: {str(e)}")
            return create_error_response(
                success=False,
                message="Logout failed due to server error",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class UserProfileView(APIView):
    """
    User Profile Management View
    
    Handles user profile retrieval and updates.
    
    GET /api/v1/auth/profile/ - Get user profile
    PUT /api/v1/auth/profile/ - Update user profile
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [CustomUserRateThrottle]
    
    def get(self, request):
        """Get current user's profile"""
        try:
            user = request.user
            
            # Get or create user profile
            profile, created = UserProfile.objects.get_or_create(user=user)
            
            # Serialize user data
            user_data = {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'phone_number': user.phone_number,
                'is_active': user.is_active,
                'date_joined': user.date_joined.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None
            }
            
            # Serialize profile data
            profile_data = UserProfileSerializer(profile).data
            
            response_data = {
                'user': user_data,
                'profile': profile_data
            }
            
            return create_success_response(
                success=True,
                message="Profile retrieved successfully",
                data=response_data,
                status_code=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"Profile retrieval error: {str(e)}")
            return standardize_response(
                success=False,
                message="Failed to retrieve profile",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def put(self, request):
        """Update user profile"""
        try:
            user = request.user
            ip_address = self.get_client_ip(request)
            
            # Get or create user profile
            profile, created = UserProfile.objects.get_or_create(user=user)
            
            # Update user fields
            user_fields = ['first_name', 'last_name', 'phone_number']
            user_updated = False
            
            for field in user_fields:
                if field in request.data:
                    setattr(user, field, request.data[field])
                    user_updated = True
            
            if user_updated:
                user.save()
            
            # Update profile fields
            serializer = UserProfileSerializer(profile, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                
                # Log profile update
                log_user_activity(
                    user=user,
                    action='PROFILE_UPDATED',
                    ip_address=ip_address,
                    details={'updated_fields': list(request.data.keys())}
                )
                
                # Prepare response data
                user_data = {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'phone_number': user.phone_number,
                    'is_active': user.is_active,
                    'date_joined': user.date_joined.isoformat(),
                    'last_login': user.last_login.isoformat() if user.last_login else None
                }
                
                response_data = {
                    'user': user_data,
                    'profile': serializer.data
                }
                
                return create_success_response(
                    success=True,
                    message="Profile updated successfully",
                    data=response_data,
                    status_code=status.HTTP_200_OK
                )
            else:
                return create_error_response(
                    success=False,
                    message="Validation failed",
                    data={"errors": serializer.errors},
                    status_code=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            logger.error(f"Profile update error: {str(e)}")
            return create_error_response(
                success=False,
                message="Failed to update profile",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class PasswordChangeView(APIView):
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
            
            # Validate input data
            serializer = PasswordChangeSerializer(data=request.data)
            if not serializer.is_valid():
                return create_error_response(
                    success=False,
                    message="Validation failed",
                    data={"errors": serializer.errors},
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            # Check old password
            if not user.check_password(serializer.validated_data['old_password']):
                return create_error_response(
                    success=False,
                    message="Current password is incorrect",
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            # Set new password
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            
            # Invalidate all existing sessions except current one
            current_session_key = request.data.get('current_session')
            UserSession.objects.filter(user=user).exclude(
                session_key=current_session_key
            ).update(
                is_active=False,
                logout_time=timezone.now()
            )
            
            # Log password change
            log_user_activity(
                user=user,
                action='PASSWORD_CHANGED',
                ip_address=ip_address,
                details={'method': 'user_initiated'}
            )
            
            logger.info(f"Password changed successfully for user: {user.email}")
            return create_success_response(
                success=True,
                message="Password changed successfully",
                status_code=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"Password change error: {str(e)}")
            return create_error_response(
                success=False,
                message="Failed to change password",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class TokenRefreshView(APIView):
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
            
            if not refresh_token:
                return create_error_response(
                    success=False,
                    message="Refresh token is required",
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                # Validate and refresh token
                refresh = RefreshToken(refresh_token)
                access_token = refresh.access_token
                
                # Update session activity
                UserSession.objects.filter(
                    session_key=refresh_token,
                    is_active=True
                ).update(last_activity=timezone.now())
                
                response_data = {
                    'access': str(access_token)
                }
                
                return create_success_response(
                    success=True,
                    message="Token refreshed successfully",
                    data=response_data,
                    status_code=status.HTTP_200_OK
                )
                
            except TokenError as e:
                logger.warning(f"Invalid refresh token: {str(e)}")
                return create_error_response(
                    success=False,
                    message="Invalid or expired refresh token",
                    status_code=status.HTTP_401_UNAUTHORIZED
                )
                
        except Exception as e:
            logger.error(f"Token refresh error: {str(e)}")
            return create_error_response(
                success=False,
                message="Failed to refresh token",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# Helper function decorators for common authentication operations
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_sessions(request):
    """
    Get all active sessions for the current user
    
    GET /api/v1/auth/sessions/
    """
    try:
        user = request.user
        sessions = UserSession.objects.filter(user=user, is_active=True)
        
        sessions_data = []
        for session in sessions:
            sessions_data.append({
                'id': session.id,
                'ip_address': session.ip_address,
                'user_agent': session.user_agent,
                'created_at': session.created_at.isoformat(),
                'last_activity': session.last_activity.isoformat(),
                'is_current': session.session_key == request.data.get('current_session')
            })
        
        return create_success_response(
            success=True,
            message="Sessions retrieved successfully",
            data={'sessions': sessions_data},
            status_code=status.HTTP_200_OK
        )
        
    except Exception as e:
        logger.error(f"Get sessions error: {str(e)}")
        return create_error_responsee(
            success=False,
            message="Failed to retrieve sessions",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def revoke_session(request, session_id):
    """
    Revoke a specific user session
    
    POST /api/v1/auth/sessions/{session_id}/revoke/
    """
    try:
        user = request.user
        ip_address = request.META.get('REMOTE_ADDR')
        
        session = UserSession.objects.filter(
            id=session_id,
            user=user,
            is_active=True
        ).first()
        
        if not session:
            return create_error_response(
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
            user=user,
            action='SESSION_REVOKED',
            ip_address=ip_address,
            details={'revoked_session_id': session_id}
        )
        
        return create_success_response(
            success=True,
            message="Session revoked successfully",
            status_code=status.HTTP_200_OK
        )
        
    except Exception as e:
        logger.error(f"Revoke session error: {str(e)}")
        return create_error_response(
            success=False,
            message="Failed to revoke session",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

class UserSubjectViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet to allow users to view available subjects and (optionally) select them.
    """
    queryset = Subject.objects.filter(is_active=True)
    serializer_class = SubjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='select')
    def select_subjects(self, request):
        """
        Endpoint for users to select subjects.
        Expected payload: {"subject_ids": [<uuid>, <uuid>, ...]}
        """
        subject_ids = request.data.get('subject_ids', [])
        user = request.user

        # Custom logic here: store in user profile, or create a UserSubjectSelection model
        # For now, just return selected subjects as confirmation
        subjects = Subject.objects.filter(id__in=subject_ids, is_active=True)
        return Response({
            "selected": SubjectSerializer(subjects, many=True).data
        }, status=status.HTTP_200_OK)

class UserSelectedCoursesView(APIView):
    """
    GET: List courses selected by the authenticated user.
    POST: Select a new course for the user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        selected_courses = UserSelectedCourse.objects.filter(user=user)
        serializer = UserSelectedCourseSerializer(selected_courses, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        """
        Expected payload:
        {
            "course_id": "<uuid>",
            "priority": 1,
            "notes": "Interested in data science"
        }
        """
        serializer = UserSelectedCourseSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            # Save the selected course
            course = serializer.validated_data['course_id']
            selected_course = UserSelectedCourse.objects.create(
                user=request.user,
                course_id=course,
                priority=request.data.get('priority', 1),
                notes=request.data.get('notes', '')
            )
            return Response(UserSelectedCourseSerializer(selected_course).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserApplicationsView(APIView):
    """
    View applications submitted by the user
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        applied_courses = UserSelectedCourse.objects.filter(user=user, is_applied=True)
        serializer = UserSelectedCourseSerializer(applied_courses, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)