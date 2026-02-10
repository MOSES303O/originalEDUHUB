"""
Custom middleware for the EduPathway backend.
"""

import time
import logging
from django.http import JsonResponse
from django.core.cache import cache
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)

class RequestLoggingMiddleware(MiddlewareMixin):
    """
    Middleware to log all API requests and responses.
    """
    
    def process_request(self, request):
        """Log incoming requests."""
        request.start_time = time.time()

        logger.info(f"Request: {request.method} {request.path}")
        if request.user.is_authenticated:
            logger.info(f"User: {request.user.phone_number}")
        
        return None
    
    def process_response(self, request, response):
        """Log response details."""
        if hasattr(request, 'start_time'):
            duration = time.time() - request.start_time
            logger.info(f"Response: {response.status_code} - Duration: {duration:.2f}s")
        
        return response

class RateLimitMiddleware(MiddlewareMixin):
    """
    Simple rate limiting middleware.
    """
    
    def process_request(self, request):
        """Check rate limits for requests."""
        if not getattr(settings, 'RATE_LIMIT_ENABLE', True):
            return None
        
        ip = self.get_client_ip(request)
        
        ip_key = f"rate_limit_ip_{ip}"
        ip_requests = cache.get(ip_key, 0)
        
        if ip_requests >= getattr(settings, 'RATE_LIMIT_PER_IP', 100):
            return JsonResponse({
                'error': 'Rate limit exceeded. Please try again later.',
                'code': 'RATE_LIMIT_EXCEEDED'
            }, status=429)
        
        cache.set(ip_key, ip_requests + 1, 60)  

        if request.user.is_authenticated:
            user_key = f"rate_limit_user_{request.user.id}"
            user_requests = cache.get(user_key, 0)
            
            if user_requests >= getattr(settings, 'RATE_LIMIT_PER_USER', 200):
                return JsonResponse({
                    'error': 'User rate limit exceeded. Please try again later.',
                    'code': 'USER_RATE_LIMIT_EXCEEDED'
                }, status=429)
            
            cache.set(user_key, user_requests + 1, 60)
        
        return None
    
    def get_client_ip(self, request):
        """Get the client's IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    