"""
Core utilities for the EduPathway platform.

This module contains shared utility functions, mixins, and helpers
used across different apps in the project. All utilities are designed
to be consistent across authentication, payments, and other apps.
"""

import logging
import json
import re
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Union
from decimal import Decimal
import phonenumbers
from phonenumbers import NumberParseException

from django.http import JsonResponse
from django.core.cache import cache
from django.utils import timezone
from django.conf import settings
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.response import Response

logger = logging.getLogger(__name__)

def standardize_response(
    success: bool,
    message: str,
    data: Optional[Dict[str, Any]] = None,
    status_code: int = status.HTTP_200_OK,
    errors: Optional[Dict[str, Any]] = None,
    meta: Optional[Dict[str, Any]] = None
) -> Response:
    """
    Standardize API response format across all apps.

    Args:
        success: Boolean indicating if the operation was successful.
        message: Human-readable message describing the result.
        data: Optional data payload to include in response.
        status_code: HTTP status code for the response.
        errors: Optional error details for failed operations.
        meta: Optional metadata (pagination, etc.).

    Returns:
        DRF Response object with standardized format.
    """
    response_data = {
        'success': success,
        'message': message,
        'timestamp': timezone.now().isoformat(),
    }

    if data is not None:
        response_data['data'] = data
    else:
        response_data['data'] = {}

    if errors is not None:
        response_data['errors'] = errors

    if meta is not None:
        response_data['meta'] = meta

    # DO NOT include 'status_code' inside the payload — DRF handles it via Response argument
    return Response(response_data, status=status_code)


def log_user_activity(
    user,
    action: str,
    ip_address: str,
    details: Optional[Dict[str, Any]] = None,
    success: bool = True,
    error_message: str = "",
    request_id: Optional[str] = None
) -> None:
    """
    Log user activity for audit and analytics across all apps.
    
    Creates a UserActivity record to track user actions throughout
    the platform including authentication, payments, course interactions.
    
    Args:
        user: User instance performing the action
        action: Action type (from UserActivity.ACTION_CHOICES)
        ip_address: IP address of the user
        details: Optional additional details about the action
        success: Whether the action was successful
        error_message: Error message if action failed
        request_id: Optional request ID for tracking
    """
    try:
        from apps.authentication.models import UserActivity
        UserActivity.objects.create(
            user=user,
            action=action,
            ip_address=ip_address,
            details=details or {},
            success=success,
            error_message=error_message,
            request_id=request_id or str(uuid.uuid4())  # Generate UUID if None
        )
        
        logger.info(f"User activity logged: {user.phone_number} - {action} - Success: {success}")
        
    except Exception as e:
        logger.error(f"Failed to log user activity: {str(e)}", exc_info=True)


class APIResponseMixin:
    """
    Mixin for standardized API responses across all apps.
    
    Provides helper methods for creating consistent API responses
    in authentication, payments, courses, and other views.
    """
    
    def success_response(
        self,
        message: str = "Operation successful",
        data: Optional[Dict[str, Any]] = None,
        status_code: int = status.HTTP_200_OK,
        meta: Optional[Dict[str, Any]] = None
    ) -> Response:
        """Create a success response."""
        return standardize_response(
            success=True,
            message=message,
            data=data,
            status_code=status_code,
            meta=meta
        )
    
    def error_response(
        self,
        message: str = "Operation failed",
        errors: Optional[Dict[str, Any]] = None,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        data: Optional[Dict[str, Any]] = None
    ) -> Response:
        """Create an error response."""
        return standardize_response(
            success=False,
            message=message,
            errors=errors,
            status_code=status_code,
            data=data
        )
    
    def validation_error_response(
        self,
        errors: Dict[str, Any],
        message: str = "Validation failed"
    ) -> Response:
        """Create a validation error response."""
        return standardize_response(
            success=False,
            message=message,
            errors=errors,
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    def not_found_response(
        self,
        message: str = "Resource not found"
    ) -> Response:
        """Create a not found response."""
        return standardize_response(
            success=False,
            message=message,
            status_code=status.HTTP_404_NOT_FOUND
        )
    
    def unauthorized_response(
        self,
        message: str = "Authentication required"
    ) -> Response:
        """Create an unauthorized response."""
        return standardize_response(
            success=False,
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    
    def forbidden_response(
        self,
        message: str = "Permission denied"
    ) -> Response:
        """Create a forbidden response."""
        return standardize_response(
            success=False,
            message=message,
            status_code=status.HTTP_403_FORBIDDEN
        )


class RateLimitMixin:
    """
    Mixin for rate limiting functionality across all apps.
    
    Provides methods for implementing rate limiting on authentication,
    payment, and other sensitive endpoints.
    """
    
    def get_client_ip(self, request) -> str:
        """
        Get client IP address from request.
        
        Extracts the real client IP considering proxy headers.
        """
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', '127.0.0.1')
        return ip
    
    def check_rate_limit(
        self,
        request,
        action: str,
        limit: int = 10,
        window: int = 3600,
        user_specific: bool = False
    ) -> bool:
        """
        Check if request is within rate limit.
        
        Args:
            request: Django request object
            action: Action identifier for rate limiting
            limit: Maximum number of requests allowed
            window: Time window in seconds
            user_specific: Whether to apply per-user rate limiting
        
        Returns:
            True if within limit, False if exceeded
        """
        ip_address = self.get_client_ip(request)
        
        if user_specific and hasattr(request, 'user') and request.user.is_authenticated:
            cache_key = f"rate_limit_{action}_{request.user.id}_{ip_address}"
        else:
            cache_key = f"rate_limit_{action}_{ip_address}"
        
        current_requests = cache.get(cache_key, 0)
        
        if current_requests >= limit:
            logger.warning(f"Rate limit exceeded for {action} from {ip_address}")
            return False
        
        # Increment counter
        cache.set(cache_key, current_requests + 1, window)
        return True
    
    def get_rate_limit_status(
        self,
        request,
        action: str,
        limit: int = 10,
        user_specific: bool = False
    ) -> Dict[str, Any]:
        """
        Get current rate limit status.
        
        Returns information about current rate limit usage.
        """
        ip_address = self.get_client_ip(request)
        
        if user_specific and hasattr(request, 'user') and request.user.is_authenticated:
            cache_key = f"rate_limit_{action}_{request.user.id}_{ip_address}"
        else:
            cache_key = f"rate_limit_{action}_{ip_address}"
        
        current_requests = cache.get(cache_key, 0)
        remaining = max(0, limit - current_requests)
        
        return {
            'limit': limit,
            'used': current_requests,
            'remaining': remaining,
            'reset_time': cache.ttl(cache_key)
        }


def validate_kenyan_phone(phone_number: str) -> bool:
    """
    Validate Kenyan phone number.
    
    Args:
        phone_number: Phone number to validate
    
    Returns:
        True if valid, False otherwise
    """
    try:
        # Parse the phone number
        parsed = phonenumbers.parse(phone_number, 'KE')
        
        # Check if it's a valid Kenyan number
        return (
            phonenumbers.is_valid_number(parsed) and
            parsed.country_code == 254
        )
    except NumberParseException:
        return False


def standardize_phone_number(phone: str) -> Optional[str]:
    """
    Standardize Kenyan phone number to format expected by M-Pesa.
    
    Args:
        phone: Phone number in various formats
        
    Returns:
        Standardized phone number or None if invalid
    """
    if not phone:
        return None
    
    # Remove all non-digit characters
    phone = re.sub(r'\D', '', phone)
    
    # Handle different formats
    if phone.startswith('254'):
        # Already in international format
        return phone
    elif phone.startswith('0'):
        # Local format (0740408496)
        return '254' + phone[1:]
    elif len(phone) == 9:
        # Missing leading zero (740408496)
        return '254' + phone
    else:
        return None


def generate_reference(prefix: str = 'PAY') -> str:
    """
    Generate a unique payment reference.
    
    Args:
        prefix: Prefix for the reference
        
    Returns:
        Unique reference string
    """
    timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
    unique_id = str(uuid.uuid4())[:8].upper()
    return f"{prefix}{timestamp}{unique_id}"


def calculate_age(birth_date) -> Optional[int]:
    """
    Calculate age from birth date.
    
    Used in authentication for age validation and payments for
    age-restricted services.
    
    Args:
        birth_date: Date of birth
    
    Returns:
        Age in years or None if birth_date is None
    """
    if not birth_date:
        return None
    
    today = timezone.now().date()
    return today.year - birth_date.year - (
        (today.month, today.day) < (birth_date.month, birth_date.day)
    )


def cache_key(prefix: str, *args) -> str:
    """
    Generate a cache key.
    
    Args:
        prefix: Cache key prefix
        *args: Additional arguments to include in key
        
    Returns:
        Cache key string
    """
    key_parts = [prefix] + [str(arg) for arg in args]
    return ':'.join(key_parts)


def get_client_ip(request) -> str:
    """
    Get client IP address from request.
    
    Args:
        request: Django request object
        
    Returns:
        Client IP address
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def format_currency(amount, currency='KES') -> str:
    """
    Format currency amount.
    
    Args:
        amount: Amount to format
        currency: Currency code
        
    Returns:
        Formatted currency string
    """
    return f"{currency} {amount:,.2f}"


def mask_phone_number(phone: str) -> str:
    """
    Mask phone number for display.
    
    Args:
        phone: Phone number to mask
        
    Returns:
        Masked phone number
    """
    if not phone or len(phone) < 4:
        return phone
    
    return phone[:3] + '*' * (len(phone) - 6) + phone[-3:]


def calculate_subscription_end_date(start_date, duration_days: int):
    """
    Calculate subscription end date.
    
    Args:
        start_date: Subscription start date
        duration_days: Duration in days
        
    Returns:
        End date
    """
    return start_date + timezone.timedelta(days=duration_days)


def is_business_hours() -> bool:
    """
    Check if current time is within business hours (8 AM - 6 PM EAT).
    
    Returns:
        True if within business hours
    """
    now = timezone.now()
    # Convert to EAT (UTC+3)
    eat_time = now + timezone.timedelta(hours=3)
    hour = eat_time.hour
    return 8 <= hour <= 18


def sanitize_callback_data(data: dict) -> dict:
    """
    Sanitize callback data for logging.
    
    Args:
        data: Raw callback data
        
    Returns:
        Sanitized data
    """
    # Remove sensitive information
    sensitive_keys = ['password', 'pin', 'secret', 'key']
    sanitized = {}
    
    for key, value in data.items():
        if any(sensitive in key.lower() for sensitive in sensitive_keys):
            sanitized[key] = '***REDACTED***'
        elif isinstance(value, dict):
            sanitized[key] = sanitize_callback_data(value)
        else:
            sanitized[key] = value
    
    return sanitized


class CacheManager:
    """
    Utility class for cache management across all apps.
    
    Provides methods for common caching operations with consistent
    key generation and TTL management for authentication, payments, etc.
    """
    
    DEFAULT_TTL = 3600  # 1 hour
    SHORT_TTL = 300     # 5 minutes
    LONG_TTL = 86400    # 24 hours
    
    @staticmethod
    def get(key: str, default=None):
        """Get value from cache."""
        return cache.get(key, default)
    
    @staticmethod
    def set(key: str, value, ttl: int = DEFAULT_TTL):
        """Set value in cache."""
        return cache.set(key, value, ttl)
    
    @staticmethod
    def delete(key: str):
        """Delete value from cache."""
        return cache.delete(key)
    
    @staticmethod
    def get_or_set(key: str, callable_func, ttl: int = DEFAULT_TTL):
        """Get value from cache or set it using callable."""
        return cache.get_or_set(key, callable_func, ttl)
    
    @staticmethod
    def increment(key: str, delta: int = 1):
        """Increment cache value."""
        try:
            return cache.incr(key, delta)
        except ValueError:
            cache.set(key, delta, CacheManager.DEFAULT_TTL)
            return delta
    
    @classmethod
    def user_cache_key(cls, user_id: str, suffix: str = "") -> str:
        """Generate cache key for user-specific data."""
        return cache_key('user', user_id, suffix)
    
    @classmethod
    def payment_cache_key(cls, payment_id: str, suffix: str = "") -> str:
        """Generate cache key for payment-specific data."""
        return cache_key('payment', payment_id, suffix)
    
    @classmethod
    def course_cache_key(cls, course_id: str, suffix: str = "") -> str:
        """Generate cache key for course-specific data."""
        return cache_key('course', course_id, suffix)
    
    @classmethod
    def session_cache_key(cls, session_id: str, suffix: str = "") -> str:
        """Generate cache key for session-specific data."""
        return cache_key('session', session_id, suffix)


def validate_password_strength(password: str) -> Dict[str, Any]:
    """
    Validate password strength beyond Django's default validation.
    
    Used in authentication for additional password security checks.
    
    Args:
        password: Password to validate
    
    Returns:
        Dictionary with validation results
    """
    result = {
        'is_valid': True,
        'score': 0,
        'feedback': []
    }
    
    if len(password) < 8:
        result['is_valid'] = False
        result['feedback'].append("Password must be at least 8 characters long")
    else:
        result['score'] += 1
    
    if not re.search(r'[A-Z]', password):
        result['feedback'].append("Password should contain at least one uppercase letter")
    else:
        result['score'] += 1
    
    if not re.search(r'[a-z]', password):
        result['feedback'].append("Password should contain at least one lowercase letter")
    else:
        result['score'] += 1
    
    if not re.search(r'\d', password):
        result['feedback'].append("Password should contain at least one number")
    else:
        result['score'] += 1
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        result['feedback'].append("Password should contain at least one special character")
    else:
        result['score'] += 1
    
    # Check for common patterns
    common_patterns = ['123', 'abc', 'password', 'qwerty']
    if any(pattern in password.lower() for pattern in common_patterns):
        result['feedback'].append("Password contains common patterns")
        result['score'] = max(0, result['score'] - 1)
    
    if result['score'] < 3:
        result['is_valid'] = False
    
    return result


class SecurityUtils:
    """
    Security utilities for authentication and payments.
    
    Provides security-related functions for input validation,
    sanitization, and protection across all apps.
    """
    
    @staticmethod
    def sanitize_input(text: str, max_length: int = 1000) -> str:
        """
        Sanitize user input to prevent XSS and other attacks.
        
        Args:
            text: Text to sanitize
            max_length: Maximum allowed length
        
        Returns:
            Sanitized text
        """
        if not text:
            return ""
        
        # Remove HTML tags and limit length
        import html
        sanitized = html.escape(text.strip())
        return sanitized[:max_length]
    
    @staticmethod
    def validate_file_upload(file, allowed_types: list, max_size: int = 5242880) -> Dict[str, Any]:
        """
        Validate file uploads for security.
        
        Args:
            file: Uploaded file object
            allowed_types: List of allowed MIME types
            max_size: Maximum file size in bytes (default: 5MB)
        
        Returns:
            Validation result dictionary
        """
        result = {
            'is_valid': True,
            'errors': []
        }
        
        if not file:
            result['is_valid'] = False
            result['errors'].append("No file provided")
            return result
        
        # Check file size
        if file.size > max_size:
            result['is_valid'] = False
            result['errors'].append(f"File size exceeds {max_size} bytes")
        
        # Check file type
        if hasattr(file, 'content_type') and file.content_type not in allowed_types:
            result['is_valid'] = False
            result['errors'].append(f"File type {file.content_type} not allowed")
        
        return result
    
    @staticmethod
    def generate_secure_token(length: int = 32) -> str:
        """
        Generate a cryptographically secure token.
        
        Used for password reset tokens, API keys, etc.
        
        Args:
            length: Length of the token
        
        Returns:
            Secure token string
        """
        import secrets
        return secrets.token_urlsafe(length)
