"""
Utility functions for the EduPathway backend.
"""

import re
import logging
from typing import Dict, Any, Optional
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from rest_framework import status
from rest_framework.pagination import PageNumberPagination

logger = logging.getLogger(__name__)

def validate_kenyan_phone_number(phone_number: str) -> bool:
    """
    Validate Kenyan phone number format.
    Accepts formats: +254XXXXXXXXX, 254XXXXXXXXX, 07XXXXXXXX, 01XXXXXXXX
    """
    # Remove any spaces or dashes
    phone = re.sub(r'[\s\-]', '', phone_number)
    
    # Kenyan phone number patterns
    patterns = [
        r'^\+254[17]\d{8}$',  # +254XXXXXXXXX
        r'^254[17]\d{8}$',    # 254XXXXXXXXX
        r'^0[17]\d{8}$',      # 0XXXXXXXXX
    ]
    
    return any(re.match(pattern, phone) for pattern in patterns)

def normalize_kenyan_phone_number(phone_number: str) -> str:
    """
    Normalize Kenyan phone number to international format (+254XXXXXXXXX).
    """
    if not validate_kenyan_phone_number(phone_number):
        raise ValidationError("Invalid Kenyan phone number format")
    
    # Remove any spaces or dashes
    phone = re.sub(r'[\s\-]', '', phone_number)
    
    # Convert to international format
    if phone.startswith('+254'):
        return phone
    elif phone.startswith('254'):
        return f'+{phone}'
    elif phone.startswith('0'):
        return f'+254{phone[1:]}'
    
    raise ValidationError("Unable to normalize phone number")

def create_error_response(message: str, code: str = None, status_code: int = 400) -> JsonResponse:
    """
    Create a standardized error response.
    """
    error_data = {
        'error': message,
        'success': False
    }
    
    if code:
        error_data['code'] = code
    
    return JsonResponse(error_data, status=status_code)

def create_success_response(data: Any = None, message: str = None) -> Dict[str, Any]:
    """
    Create a standardized success response.
    """
    response_data = {
        'success': True
    }
    
    if data is not None:
        response_data['data'] = data
    
    if message:
        response_data['message'] = message
    
    return response_data

def log_user_action(user, action: str, details: Dict[str, Any] = None):
    """
    Log user actions for audit purposes.
    """
    log_message = f"User {user.email} performed action: {action}"
    
    if details:
        log_message += f" - Details: {details}"
    
    logger.info(log_message)

class APIResponseMixin:
    """
    Mixin to provide standardized API responses.
    """
    
    def success_response(self, data=None, message=None, status_code=status.HTTP_200_OK):
        """Return a success response."""
        response_data = create_success_response(data, message)
        return JsonResponse(response_data, status=status_code)
    
    def error_response(self, message, code=None, status_code=status.HTTP_400_BAD_REQUEST):
        """Return an error response."""
        return create_error_response(message, code, status_code)

def calculate_course_match_score(user_subjects: list, course_requirements: list) -> float:
    """
    Calculate how well a user's subjects match course requirements.
    Returns a score between 0 and 1.
    """
    if not course_requirements:
        return 1.0  # No requirements means perfect match
    
    if not user_subjects:
        return 0.0  # No subjects means no match
    
    # Convert to sets for easier comparison
    user_subject_names = {subject.get('name', '').lower() for subject in user_subjects}
    required_subjects = {req.get('subject', '').lower() for req in course_requirements}
    
    # Calculate intersection
    matching_subjects = user_subject_names.intersection(required_subjects)
    
    # Basic score based on percentage of requirements met
    basic_score = len(matching_subjects) / len(required_subjects)
    
    # Bonus for having more subjects than required
    bonus = min(0.2, (len(user_subject_names) - len(required_subjects)) * 0.05)
    
    return min(1.0, basic_score + bonus)

def format_currency(amount: float, currency: str = 'KES') -> str:
    """
    Format currency amount for display.
    """
    if currency == 'KES':
        return f"KES {amount:,.2f}"
    else:
        return f"{currency} {amount:,.2f}"

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

def get_user_agent_info(request):
    return request.META.get('HTTP_USER_AGENT', '')

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100