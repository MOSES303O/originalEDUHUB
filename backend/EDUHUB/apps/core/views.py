"""
Core base views and mixins for consistent API behavior across all apps.
"""

import logging
from typing import Dict, Any, Optional
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.core.cache import cache

from .utils import (
    standardize_response, get_client_ip, log_user_activity,
    cache_key, APIResponseMixin, RateLimitMixin
)

logger = logging.getLogger(__name__)

class BaseAPIView(APIView, APIResponseMixin, RateLimitMixin):
    """
    Base API view class with safe DRF behavior and standardized extensions.
    """

    rate_limit_scope = 'default'
    rate_limit_count = 60
    rate_limit_window = 3600
    authentication_required = True

    def initial(self, request, *args, **kwargs):
        """
        DRF lifecycle method called before any action (get/post/etc).
        """
        super().initial(request, *args, **kwargs)

        # Rate limiting
        if not self.check_rate_limit(request):
            raise exceptions.Throttled(detail="Rate limit exceeded.")

        # Capture request metadata
        self.request_ip = get_client_ip(request)
        self.request_timestamp = timezone.now()

    def handle_exception(self, exc):
        """
        DRF-compliant exception handling.
        """
        logger.error(f"API Error in {self.__class__.__name__}: {str(exc)}")

        # Log user error
        if hasattr(self.request, 'user') and self.request.user.is_authenticated:
            log_user_activity(
                user=self.request.user,
                action=f'API_ERROR_{self.__class__.__name__}',
                details={
                    'error': str(exc),
                    'endpoint': self.request.path,
                    'method': self.request.method
                },
                success=False,
                error_message=str(exc),
                request=self.request
            )

        return standardize_response(
            success=False,
            message="An error occurred while processing your request.",
            errors={'detail': str(exc)},
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    def check_rate_limit(self, request) -> bool:
        return self.check_rate_limit_for_view(
            request,
            self.rate_limit_scope,
            self.rate_limit_count,
            self.rate_limit_window
        )

    def get_permissions(self):
        """
        Add `IsAuthenticated` only if authentication_required is True.
        """
        permissions = super().get_permissions()
        if self.authentication_required:
            permissions.append(IsAuthenticated())
        return permissions


class BaseModelViewSet(ModelViewSet, APIResponseMixin, RateLimitMixin):
    """
    Base ModelViewSet with standardized functionality for CRUD operations.
    
    Features:
    - Standardized response format
    - Activity logging for all CRUD operations
    - Rate limiting
    - Error handling
    - Pagination support
    """
    
    # Rate limiting settings
    rate_limit_scope = 'crud'
    rate_limit_count = 100
    rate_limit_window = 3600
    
    def dispatch(self, request, *args, **kwargs):
        """
        Override dispatch to add common functionality.
        """
        # Check rate limiting
        if not self.check_rate_limit(
            request, 
            self.rate_limit_scope, 
            self.rate_limit_count, 
            self.rate_limit_window
        ):
            return standardize_response(
                success=False,
                message="Rate limit exceeded. Please try again later.",
                status_code=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        return super().dispatch(request, *args, **kwargs)
    
    def list(self, request, *args, **kwargs):
        """
        List objects with standardized response.
        """
        try:
            queryset = self.filter_queryset(self.get_queryset())
            
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                paginated_response = self.get_paginated_response(serializer.data)
                
                return standardize_response(
                    success=True,
                    message=f"{self.get_model_name()} list retrieved successfully",
                    data=paginated_response.data['results'],
                    meta={
                        'pagination': {
                            'count': paginated_response.data['count'],
                            'next': paginated_response.data['next'],
                            'previous': paginated_response.data['previous']
                        }
                    }
                )
            
            serializer = self.get_serializer(queryset, many=True)
            return standardize_response(
                success=True,
                message=f"{self.get_model_name()} list retrieved successfully",
                data=serializer.data
            )
            
        except Exception as e:
            logger.error(f"Error in {self.__class__.__name__}.list: {str(e)}")
            return standardize_response(
                success=False,
                message="Failed to retrieve data",
                errors={'detail': str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def create(self, request, *args, **kwargs):
        """
        Create object with standardized response and activity logging.
        """
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            instance = self.perform_create(serializer)
            
            # Log creation activity
            if hasattr(request, 'user') and request.user.is_authenticated:
                log_user_activity(
                    user=request.user,
                    action=f'{self.get_model_name().upper()}_CREATED',
                    details={
                        'object_id': instance.pk if instance else None,
                        'data': request.data
                    },
                    request=request
                )
            
            return standardize_response(
                success=True,
                message=f"{self.get_model_name()} created successfully",
                data=serializer.data,
                status_code=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            logger.error(f"Error in {self.__class__.__name__}.create: {str(e)}")
            return standardize_response(
                success=False,
                message=f"Failed to create {self.get_model_name().lower()}",
                errors={'detail': str(e)},
                status_code=status.HTTP_400_BAD_REQUEST
            )
    
    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve object with standardized response.
        """
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            
            return standardize_response(
                success=True,
                message=f"{self.get_model_name()} retrieved successfully",
                data=serializer.data
            )
            
        except Exception as e:
            logger.error(f"Error in {self.__class__.__name__}.retrieve: {str(e)}")
            return standardize_response(
                success=False,
                message=f"{self.get_model_name()} not found",
                errors={'detail': str(e)},
                status_code=status.HTTP_404_NOT_FOUND
            )
    
    def update(self, request, *args, **kwargs):
        """
        Update object with standardized response and activity logging.
        """
        try:
            partial = kwargs.pop('partial', False)
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            
            updated_instance = self.perform_update(serializer)
            
            # Log update activity
            if hasattr(request, 'user') and request.user.is_authenticated:
                log_user_activity(
                    user=request.user,
                    action=f'{self.get_model_name().upper()}_UPDATED',
                    details={
                        'object_id': instance.pk,
                        'updated_fields': list(request.data.keys()),
                        'data': request.data
                    },
                    request=request
                )
            
            return standardize_response(
                success=True,
                message=f"{self.get_model_name()} updated successfully",
                data=serializer.data
            )
            
        except Exception as e:
            logger.error(f"Error in {self.__class__.__name__}.update: {str(e)}")
            return standardize_response(
                success=False,
                message=f"Failed to update {self.get_model_name().lower()}",
                errors={'detail': str(e)},
                status_code=status.HTTP_400_BAD_REQUEST
            )
    
    def destroy(self, request, *args, **kwargs):
        """
        Delete object with standardized response and activity logging.
        """
        try:
            instance = self.get_object()
            object_id = instance.pk
            
            self.perform_destroy(instance)
            
            # Log deletion activity
            if hasattr(request, 'user') and request.user.is_authenticated:
                log_user_activity(
                    user=request.user,
                    action=f'{self.get_model_name().upper()}_DELETED',
                    details={'object_id': object_id},
                    request=request
                )
            
            return standardize_response(
                success=True,
                message=f"{self.get_model_name()} deleted successfully",
                status_code=status.HTTP_204_NO_CONTENT
            )
            
        except Exception as e:
            logger.error(f"Error in {self.__class__.__name__}.destroy: {str(e)}")
            return standardize_response(
                success=False,
                message=f"Failed to delete {self.get_model_name().lower()}",
                errors={'detail': str(e)},
                status_code=status.HTTP_400_BAD_REQUEST
            )
    
    def perform_create(self, serializer):
        """
        Perform the creation of the object.
        """
        return serializer.save()
    
    def perform_update(self, serializer):
        """
        Perform the update of the object.
        """
        return serializer.save()
    
    def perform_destroy(self, instance):
        """
        Perform the deletion of the object.
        """
        instance.delete()
    
    def get_model_name(self):
        """
        Get the model name for logging and messages.
        """
        if hasattr(self, 'queryset') and self.queryset is not None:
            return self.queryset.model.__name__
        elif hasattr(self, 'model') and self.model is not None:
            return self.model.__name__
        else:
            return 'Object'


class HealthCheckView(BaseAPIView):
    """
    Health check endpoint for monitoring.
    
    GET /api/v1/health/
    """
    
    authentication_required = False
    rate_limit_scope = 'health'
    rate_limit_count = 100
    rate_limit_window = 60  # 1 minute
    
    def get(self, request):
        """
        Return health status of the API.
        """
        health_data = {
            'status': 'healthy',
            'timestamp': timezone.now().isoformat(),
            'version': '1.0.0',
            'environment': 'development',  # This should come from settings
            'services': {
                'database': self.check_database(),
                'cache': self.check_cache(),
            }
        }
        
        return standardize_response(
            success=True,
            message="API is healthy",
            data=health_data
        )
    
    def check_database(self):
        """
        Check database connectivity.
        """
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            return {'status': 'connected', 'message': 'Database is accessible'}
        except Exception as e:
            return {'status': 'error', 'message': str(e)}
    
    def check_cache(self):
        """
        Check cache connectivity.
        """
        try:
            test_key = 'health_check_test'
            cache.set(test_key, 'test_value', 10)
            value = cache.get(test_key)
            cache.delete(test_key)
            
            if value == 'test_value':
                return {'status': 'connected', 'message': 'Cache is accessible'}
            else:
                return {'status': 'error', 'message': 'Cache test failed'}
        except Exception as e:
            return {'status': 'error', 'message': str(e)}


class APIDocumentationView(BaseAPIView):
    """
    API documentation endpoint.
    
    GET /api/v1/docs/
    """
    
    authentication_required = False
    rate_limit_scope = 'docs'
    rate_limit_count = 50
    rate_limit_window = 3600
    
    def get(self, request):
        """
        Return API documentation.
        """
        documentation = {
            'title': 'EduPathway API',
            'version': '1.0.0',
            'description': 'Educational platform API for course management and payments',
            'base_url': request.build_absolute_uri('/api/v1/'),
            'authentication': {
                'type': 'JWT',
                'header': 'Authorization: Bearer <token>',
                'endpoints': {
                    'login': '/api/v1/auth/login/',
                    'register': '/api/v1/auth/register/',
                    'refresh': '/api/v1/auth/refresh/',
                    'logout': '/api/v1/auth/logout/'
                }
            },
            'endpoints': {
                'authentication': {
                    'base_url': '/api/v1/auth/',
                    'methods': ['POST', 'GET', 'PUT', 'DELETE'],
                    'description': 'User authentication and profile management'
                },
                'payments': {
                    'base_url': '/api/v1/payments/',
                    'methods': ['POST', 'GET'],
                    'description': 'Payment processing and subscription management'
                },
                'courses': {
                    'base_url': '/api/v1/courses/',
                    'methods': ['GET', 'POST', 'PUT', 'DELETE'],
                    'description': 'Course and university management'
                }
            },
            'response_format': {
                'success': {
                    'success': True,
                    'message': 'Operation successful',
                    'data': {},
                    'timestamp': '2024-01-01T00:00:00Z'
                },
                'error': {
                    'success': False,
                    'message': 'Operation failed',
                    'errors': {},
                    'timestamp': '2024-01-01T00:00:00Z'
                }
            },
            'rate_limiting': {
                'default': '60 requests per hour',
                'authentication': '30 requests per hour',
                'payments': '10 requests per hour'
            }
        }
        
        return standardize_response(
            success=True,
            message="API documentation retrieved successfully",
            data=documentation
        )
