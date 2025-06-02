from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth import login, logout
from django.core.cache import cache
from django.utils import timezone
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.conf import settings
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.openapi import OpenApiTypes

from .models import User, UserProfile, UserSession
from .serializers import (
    UserRegistrationSerializer, UserLoginSerializer,
    UserProfileSerializer, UserProfileDetailSerializer,
    PasswordChangeSerializer, PasswordResetSerializer
)
from apps.core.utils import get_client_ip, get_user_agent_info
from apps.core.permissions import IsOwnerOrReadOnly

class UserRegistrationView(generics.CreateAPIView):
    """User registration endpoint"""
    
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    
    @extend_schema(
        summary="Register a new user",
        description="Create a new user account with email verification",
        responses={201: UserProfileSerializer}
    )
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.save()
            
            # Create session tracking
            self._create_user_session(request, user)
            
            # Generate tokens
            refresh = RefreshToken.for_user(user)
            
            # Send welcome email (implement email service)
            self._send_welcome_email(user)
            
            return Response({
                'user': UserProfileSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                },
                'message': 'Registration successful. Please check your email for verification.'
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _create_user_session(self, request, user):
        """Create user session tracking"""
        ip_address = get_client_ip(request)
        user_agent_info = get_user_agent_info(request)
        
        UserSession.objects.create(
            user=user,
            session_key=request.session.session_key or '',
            ip_address=ip_address,
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            device_info=user_agent_info
        )
    
    def _send_welcome_email(self, user):
        """Send welcome email to new user"""
        # Implement email service
        pass

class UserLoginView(TokenObtainPairView):
    """Enhanced user login with session tracking"""
    
    serializer_class = UserLoginSerializer
    
    @extend_schema(
        summary="User login",
        description="Authenticate user and return JWT tokens",
        responses={200: {
            'type': 'object',
            'properties': {
                'user': UserProfileSerializer,
                'tokens': {
                    'type': 'object',
                    'properties': {
                        'refresh': {'type': 'string'},
                        'access': {'type': 'string'}
                    }
                }
            }
        }}
    )
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.validated_data['user']
            
            # Update last login
            user.last_login = timezone.now()
            user.last_login_ip = get_client_ip(request)
            user.save(update_fields=['last_login', 'last_login_ip'])
            
            # Create/update session
            self._update_user_session(request, user)
            
            # Generate tokens
            refresh = RefreshToken.for_user(user)
            
            # Cache user data for performance
            cache.set(f'user_profile_{user.id}', user, timeout=3600)
            
            return Response({
                'user': UserProfileSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                },
                'message': 'Login successful'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _update_user_session(self, request, user):
        """Update or create user session"""
        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        session, created = UserSession.objects.get_or_create(
            user=user,
            ip_address=ip_address,
            user_agent=user_agent,
            defaults={
                'session_key': request.session.session_key or '',
                'device_info': get_user_agent_info(request)
            }
        )
        
        if not created:
            session.last_activity = timezone.now()
            session.is_active = True
            session.save()

class UserLogoutView(APIView):
    """User logout endpoint"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        summary="User logout",
        description="Logout user and blacklist refresh token"
    )
    def post(self, request):
        try:
            refresh_token = request.data.get("refresh_token")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            
            # Deactivate user session
            ip_address = get_client_ip(request)
            UserSession.objects.filter(
                user=request.user,
                ip_address=ip_address,
                is_active=True
            ).update(is_active=False)
            
            # Clear cache
            cache.delete(f'user_profile_{request.user.id}')
            
            return Response({
                'message': 'Logout successful'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': 'Invalid token'
            }, status=status.HTTP_400_BAD_REQUEST)

class UserProfileView(generics.RetrieveUpdateAPIView):
    """User profile management"""
    
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user
    
    @extend_schema(
        summary="Get user profile",
        description="Retrieve authenticated user's profile"
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    @extend_schema(
        summary="Update user profile",
        description="Update authenticated user's profile information"
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)

class UserProfileDetailView(generics.RetrieveUpdateAPIView):
    """Detailed user profile with preferences"""
    
    serializer_class = UserProfileDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        profile, created = UserProfile.objects.get_or_create(user=self.request.user)
        return profile

class PasswordChangeView(APIView):
    """Password change endpoint"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        summary="Change password",
        description="Change user password with old password verification"
    )
    def post(self, request):
        serializer = PasswordChangeSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            serializer.save()
            
            # Invalidate all user sessions except current
            UserSession.objects.filter(
                user=request.user
            ).exclude(
                ip_address=get_client_ip(request)
            ).update(is_active=False)
            
            return Response({
                'message': 'Password changed successfully'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetRequestView(APIView):
    """Password reset request endpoint"""
    
    permission_classes = [permissions.AllowAny]
    
    @extend_schema(
        summary="Request password reset",
        description="Send password reset email to user"
    )
    def post(self, request):
        serializer = PasswordResetSerializer(data=request.data)
        
        if serializer.is_valid():
            email = serializer.validated_data['email']
            user = User.objects.get(email=email)
            
            # Generate reset token
            token = default_token_generator.make_token(user)
            
            # Store token in cache with expiration
            cache.set(f'password_reset_{user.id}', token, timeout=3600)  # 1 hour
            
            # Send reset email (implement email service)
            self._send_reset_email(user, token)
            
            return Response({
                'message': 'Password reset email sent'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _send_reset_email(self, user, token):
        """Send password reset email"""
        # Implement email service
        pass

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_sessions_view(request):
    """Get user's active sessions"""
    sessions = UserSession.objects.filter(
        user=request.user,
        is_active=True
    ).order_by('-last_activity')
    
    sessions_data = []
    for session in sessions:
        sessions_data.append({
            'id': session.id,
            'ip_address': session.ip_address,
            'device_info': session.device_info,
            'last_activity': session.last_activity,
            'is_current': session.ip_address == get_client_ip(request)
        })
    
    return Response(sessions_data)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def terminate_session_view(request, session_id):
    """Terminate a specific user session"""
    try:
        session = UserSession.objects.get(
            id=session_id,
            user=request.user
        )
        session.is_active = False
        session.save()
        
        return Response({
            'message': 'Session terminated successfully'
        })
    except UserSession.DoesNotExist:
        return Response({
            'error': 'Session not found'
        }, status=status.HTTP_404_NOT_FOUND)

class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        summary="Confirm password reset",
        description="Set a new password using the reset token",
    )
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Password has been reset successfully.'}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
