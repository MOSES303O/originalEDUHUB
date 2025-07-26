from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from django.core.cache import cache
from django.conf import settings
import time
import logging

logger = logging.getLogger(__name__)

class SecurityMiddleware(MiddlewareMixin):
    """Enhanced security middleware"""
    
    def process_request(self, request):
        # Rate limiting
        if self._is_rate_limited(request):
            return JsonResponse({
                'error': 'Rate limit exceeded. Please try again later.'
            }, status=429)
        
        # Security headers will be added in process_response
        return None
    
    def process_response(self, request, response):
        # Add security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        if not settings.DEBUG:
            response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        
        return response
    
    def _is_rate_limited(self, request):
        """Simple rate limiting implementation"""
        if request.user.is_authenticated:
            # Higher limits for authenticated users
            key = f'rate_limit_user_{request.user.id}'
            limit = 1000  # requests per hour
        else:
            # Lower limits for anonymous users
            ip = self._get_client_ip(request)
            key = f'rate_limit_ip_{ip}'
            limit = 100  # requests per hour
        
        current_requests = cache.get(key, 0)
        if current_requests >= limit:
            return True
        
        # Increment counter
        cache.set(key, current_requests + 1, timeout=3600)
        return False
    
    def _get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

class RequestLoggingMiddleware(MiddlewareMixin):
    """Log API requests for monitoring"""
    
    def process_request(self, request):
        request.start_time = time.time()
        
        # Log API requests
        if request.path.startswith('/api/'):
            logger.info(f"API Request: {request.method} {request.path} from {self._get_client_ip(request)}")
    
    def process_response(self, request, response):
        # Calculate response time
        if hasattr(request, 'start_time'):
            duration = time.time() - request.start_time
            
            # Log slow requests
            if duration > 2.0:  # Log requests taking more than 2 seconds
                logger.warning(f"Slow request: {request.method} {request.path} took {duration:.2f}s")
            
            # Add response time header
            response['X-Response-Time'] = f"{duration:.3f}s"
        
        return response
    
    def _get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip