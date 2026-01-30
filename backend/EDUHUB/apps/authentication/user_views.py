# apps/authentication/views.py
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
- Selected courses management (University + KMTC via GenericForeignKey)
"""

from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from django.db import transaction
from django.conf import settings
from django.core.cache import cache
from apps.core.utils import  standardize_phone_number
from rest_framework import generics, mixins, viewsets
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiTypes
from drf_spectacular.types import OpenApiTypes
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework.decorators import action
from apps.core.utils import logger, standardize_response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from apps.core.mixins import APIResponseMixin, RateLimitMixin
from apps.core.utils import logger,log_user_activity
from .models import User, UserProfile, UserSession, UserSubject, UserSelectedCourse
from .serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserProfileSerializer,
    UserSubjectSerializer,
    UserSelectedCourseSerializer,
    PasswordChangeSerializer,
    UserClusterPointsSerializer,
)
import logging

logger = logging.getLogger(__name__)

class CustomAnonRateThrottle(AnonRateThrottle):
    scope = 'anon_auth'
    rate = '10/min'

class CustomUserRateThrottle(UserRateThrottle):
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
    permission_classes = [AllowAny]
    throttle_classes = [CustomAnonRateThrottle]
    
    def post(self, request):
        try:
            ip_address = self.get_client_ip(request)
            logger.info(f"Registration attempt from IP: {ip_address}, payload: {request.data}")
            
            if not self.check_rate_limit(request, 'registration', limit=5, window=3600):
                return create_error_response(
                    message="Too many registration attempts. Please try again later.",
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS
                )
            
            phone_number = request.data.get('phone_number')
            if phone_number and User.objects.filter(phone_number=standardize_phone_number(phone_number)).exists():
                logger.warning(f"Registration attempt with existing phone number: {phone_number}")
                return create_error_response(
                    message="A user with this phone number already exists. Please log in.",
                    errors={'phone_number': ['This phone number is already registered.']},
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            serializer = UserRegistrationSerializer(data=request.data)
            if not serializer.is_valid():
                logger.warning(f"Registration validation failed: {serializer.errors}")
                return create_error_response(
                    message=serializer.errors.get('non_field_errors', ['Invalid registration data'])[0],
                    errors=serializer.errors,
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            with transaction.atomic():
                user = serializer.save()
                UserProfile.objects.get_or_create(user=user)
                
                refresh = RefreshToken.for_user(user)
                access_token = refresh.access_token
                
                UserSession.objects.create(
                    user=user,
                    session_key=str(refresh),
                    ip_address=ip_address,
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    is_active=True
                )
                
                log_user_activity(
                    user=user,
                    action='USER_REGISTERED',
                    ip_address=ip_address,
                    details={'registration_method': 'phone_number'}
                )
                
                user_data = {
                    'id': user.id,
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
                errors={'detail': str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR')

class UserLoginView(APIResponseMixin, RateLimitMixin, APIView):
    permission_classes = [AllowAny]
    throttle_classes = [CustomAnonRateThrottle]
    
    def post(self, request):
        try:
            ip_address = self.get_client_ip(request)
            phone_number = standardize_phone_number(request.data.get('phone_number', ''))
            failed_key = f"failed_login_{phone_number}_{ip_address}"
            failed_attempts = cache.get(failed_key, 0)

            if failed_attempts >= 5:
                return self.error_response(
                    message="Too many failed login attempts. Please try again later.",
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS
                )
            
            serializer = UserLoginSerializer(data=request.data)
            if not serializer.is_valid():
                cache.set(failed_key, failed_attempts + 1, 3600)
                return self.error_response(
                    message="REGISTER FIRST or INVALID CREDENTIALS",
                    errors=serializer.errors,
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            user = authenticate(request, phone_number=serializer.validated_data['phone_number'], password=serializer.validated_data['password'])
            if not user:
                cache.set(failed_key, failed_attempts + 1, 3600)
                print(f"Login failed - phone: {phone_number}, password_provided: {'password' in request.data}")
                return self.error_response(
                    message="Invalid phone number or password",
                    status_code=status.HTTP_401_UNAUTHORIZED
                )
            
            if not user.is_active:
                return self.error_response(
                    message="Account is deactivated. Please contact support.",
                    status_code=status.HTTP_401_UNAUTHORIZED
                )

            cache.delete(failed_key)

            refresh = RefreshToken.for_user(user)
            access_token = refresh.access_token
            user_agent = request.META.get('HTTP_USER_AGENT', '')

            session, _ = UserSession.objects.get_or_create(
                user=user,
                ip_address=ip_address,
                user_agent=user_agent,
                defaults={'session_key': str(refresh), 'is_active': True}
            )
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
                profile_data = UserProfileSerializer(user.profile).data
            except UserProfile.DoesNotExist:
                profile_data = None

            user_data = {
                'id': user.id,
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
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR')

class UserLogoutView(APIResponseMixin, APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [CustomUserRateThrottle]
    
    def post(self, request):
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
                    ).update(is_active=False, logout_time=timezone.now())
                except TokenError:
                    logger.warning(f"Invalid refresh token during logout: {user.phone_number}")
            
            log_user_activity(
                user=user,
                action='USER_LOGOUT',
                ip_address=ip_address,
                details={'logout_method': 'manual'}
            )
            
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
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR')

class UserUpdateView(APIResponseMixin, APIView):
    permission_classes = [IsAuthenticated]
    @extend_schema(
        summary="Update current user's cluster points",
        description="Partial update of the authenticated user's profile (currently only cluster_points)",
        request=UserClusterPointsSerializer,
        responses={
            200: OpenApiResponse(
                description="Cluster points updated",
                response=OpenApiTypes.OBJECT,
                examples=[{
                    "message": "Cluster points updated successfully",
                    "data": {
                        "cluster_points": "45.670",
                        "phone_number": "254713760749"
                    }
                }]
            ),
            400: OpenApiResponse(description="Validation failed"),
            401: OpenApiResponse(description="Unauthorized")
        },
        methods=['PATCH']
    )
    def partial_update(self, request, *args, **kwargs):
        user = request.user
        ip_address = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', 'unknown'))
    
        print(f"DEBUG PATCH - Received: {request.data}")
        print(f"DEBUG Before save - cluster_points: {user.cluster_points}")
    
        serializer = UserClusterPointsSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
    
            user.refresh_from_db()  # ← this line is critical
    
            print(f"DEBUG After save - cluster_points: {user.cluster_points}")
    
            log_user_activity(
                user=user,
                action='CLUSTER_POINTS_UPDATED',
                ip_address=ip_address,
                details={'new_value': serializer.validated_data.get('cluster_points')}
            )
    
            return standardize_response(
                message="Cluster points updated",
                data={
                    'cluster_points': str(user.cluster_points) if user.cluster_points else "00.000",
                    'phone_number': user.phone_number,
                },
                status_code=status.HTTP_200_OK
            )
        else:
            print(f"DEBUG Validation errors: {serializer.errors}")
            return standardize_response(
                message="Validation failed",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST
            )
class PasswordChangeView(APIResponseMixin, APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [CustomUserRateThrottle]
    
    def post(self, request):
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
            ).update(is_active=False, logout_time=timezone.now())
            
            log_user_activity(
                user=user,
                action='PASSWORD_CHANGED',
                ip_address=ip_address,
                details={'method': 'user_initiated'}
            )
            
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
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR')

class TokenRefreshView(APIResponseMixin, APIView):
    permission_classes = [AllowAny]
    throttle_classes = [CustomUserRateThrottle]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            ip_address = self.get_client_ip(request)
            
            if not refresh_token:
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
                
            except TokenError:
                return self.error_response(
                    message="Invalid or expired refresh token",
                    status_code=status.HTTP_401_UNAUTHORIZED
                )
            except User.DoesNotExist:
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
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR')

class UserSubjectViewSet(APIResponseMixin, viewsets.ModelViewSet):
    queryset = UserSubject.objects.all()
    serializer_class = UserSubjectSerializer
    permission_classes = [IsAuthenticated]
    
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
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', 'unknown')

class UserSelectedCoursesView(
    APIResponseMixin,
    generics.GenericAPIView,
    mixins.ListModelMixin,
    mixins.DestroyModelMixin,
):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSelectedCourseSerializer

    def get_queryset(self):
        return UserSelectedCourse.objects.filter(user=self.request.user).order_by('-created_at')

    def get(self, request, *args, **kwargs):
        return self.list(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            logger.warning(f"Selected course validation failed for user {request.user.phone_number}: {serializer.errors}")
            return create_error_response(
                message="Invalid data",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST
            )

        course_info = serializer.validated_data['course_info']

        # Idempotent: get or create — no error if already selected
        obj, created = UserSelectedCourse.objects.get_or_create(
            user=request.user,
            content_type=course_info['content_type'],
            object_id=course_info['object_id'],
            defaults={
                'course_name': course_info['course_name'],
                'institution': course_info['institution'],
                'is_applied': False
            }
        )

        if created:
            message = "Course added to your selection"
            status_code = status.HTTP_201_CREATED
            logger.info(f"Course selected: {obj.course_name} ({obj.institution}) by {request.user.phone_number}")
        else:
            message = "Course already selected"
            status_code = status.HTTP_200_OK
            logger.info(f"Duplicate selection ignored: {obj.course_name} for {request.user.phone_number}")

        log_user_activity(
            user=request.user,
            action='COURSE_SELECTED' if created else 'COURSE_ALREADY_SELECTED',
            ip_address=self.get_client_ip(request),
            details={
                'course_code': request.data.get('course_code'),
                'course_name': obj.course_name,
                'institution': obj.institution,
                'created': created
            }
        )

        return create_success_response(
            success=True,
            message=message,
            data=UserSelectedCourseSerializer(obj).data,
            status_code=status_code
        )

    def delete(self, request, *args, **kwargs):
    # If pk is provided in URL (e.g. /selected-courses/<uuid>/), use traditional delete
        if 'pk' in kwargs:
            instance = self.get_object()
            log_user_activity(
                user=request.user,
                action='COURSE_DESELECTED',
                ip_address=self.get_client_ip(request),
                details={
                    'course_name': instance.course_name,
                    'institution': instance.institution
                }
            )
            logger.info(f"Course deselected: {instance.course_name} ({instance.institution}) by {request.user.phone_number}")
            self.perform_destroy(instance)
            return create_success_response(
                success=True,
                message="Course removed from your selection",
                data=None,
                status_code=status.HTTP_200_OK
            )

        # New: Delete by course_name + institution (query params)
        course_name = request.query_params.get('course_name')
        institution = request.query_params.get('institution')

        if not course_name or not institution:
            return create_error_response(
                message="course_name and institution required for deletion",
                status_code=status.HTTP_400_BAD_REQUEST
            )

        try:
            instance = UserSelectedCourse.objects.get(
                user=request.user,
                course_name=course_name,
                institution=institution
            )
            log_user_activity(
                user=request.user,
                action='COURSE_DESELECTED',
                ip_address=self.get_client_ip(request),
                details={
                    'course_name': instance.course_name,
                    'institution': instance.institution
                }
            )
            logger.info(f"Course deselected by name: {instance.course_name} ({instance.institution}) by {request.user.phone_number}")
            instance.delete()
            return create_success_response(
                success=True,
                message="Course removed from your selection",
                data=None,
                status_code=status.HTTP_200_OK
            )
        except UserSelectedCourse.DoesNotExist:
            # Idempotent: already gone → success
            return create_success_response(
                success=True,
                message="Course already removed",
                data=None,
                status_code=status.HTTP_200_OK
            )
        except Exception as e:
            logger.error(f"Delete error: {str(e)}")
            return create_error_response(
                message="Failed to remove course",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', 'unknown')

class UserApplicationsView(APIResponseMixin, APIView):
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

class ContactFormView(APIResponseMixin, RateLimitMixin, APIView):
    permission_classes = [AllowAny]
    throttle_classes = [CustomAnonRateThrottle]

    def post(self, request):
        try:
            ip_address = self.get_client_ip(request)

            if not self.check_rate_limit(request, 'contact', limit=5, window=3600):
                return self.error_response(
                    message="Too many contact attempts. Try again later.",
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                )

            data = request.data
            name = data.get('name')
            email = data.get('email')
            phone = data.get('phone', '')
            subject = data.get('subject')
            message = data.get('message')

            if not all([name, email, subject, message]):
                return self.error_response(
                    message="Missing required fields",
                    status_code=status.HTTP_400_BAD_REQUEST,
                )

            admin_subject = f"New Contact: {subject}"
            admin_body = f"""
            Name: {name}
            Email: {email}
            Phone: {phone}
            Subject: {subject}

            Message:
            {message}
            """
            send_mail(
                subject=admin_subject,
                message=admin_body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=['eduhub254@gmail.com'],
                fail_silently=False,
            )

            user_subject = "Thank you for contacting EduHub!"
            user_body = (
                f"Hi {name},\n\n"
                "Thank you for reaching out! We'll get back to you soon.\n\n"
                "Best,\nEduHub Team"
            )
            send_mail(
                subject=user_subject,
                message=user_body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=True,
            )

            logger.info(
                f"Contact form submitted – IP: {ip_address} – Name: {name} – Email: {email}"
            )

            return self.success_response(
                message="Message sent successfully",
                data={"received": True},
                status_code=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.error(f"Contact form error: {str(e)}", exc_info=True)
            return self.error_response(
                message="Failed to send message",
                errors={"detail": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR')