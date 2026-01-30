# backend/EDUHUB/apps/core/mixins.py

from django.core.cache import cache
from apps.core.utils import standardize_response
from rest_framework import status

class APIResponseMixin:
    def success_response(self, message, data=None, status_code=status.HTTP_200_OK):
        return standardize_response(
            success=True,
            message=message,
            data=data if data is not None else [],
            status_code=status_code
        )

    def error_response(self, message, status_code=status.HTTP_400_BAD_REQUEST, errors=None):
        return standardize_response(
            success=False,
            message=message,
            errors=errors,
            status_code=status_code
        )
class RateLimitMixin:
    """
    Mixin for applying view-specific rate limiting in DRF views.
    """
    def get_client_ip(self, request):
        """Get the IP address from request headers."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR')

    def check_rate_limit(self, request, key_prefix, limit=10, window=60):
        """
        Check if a request exceeds rate limit.

        Args:
            request: Django request object
            key_prefix (str): e.g., 'registration'
            limit (int): max allowed requests
            window (int): time window in seconds

        Returns:
            bool: True if under limit, False if limit exceeded
        """
        ip = self.get_client_ip(request)
        key = f"{key_prefix}:{ip}"
        attempts = cache.get(key, 0)

        if attempts >= limit:
            return False

        cache.set(key, attempts + 1, timeout=window)
        return True