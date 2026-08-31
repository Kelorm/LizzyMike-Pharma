"""
Custom middleware for LizzyMike Pharma.

Registered middleware (in settings_local.py MIDDLEWARE list):
    - ``RateLimitMiddleware``  — IP-based rate limiting with login protection
    - ``APIRequestLoggingMiddleware`` — Log all API requests with response times

Not registered (available but optional):
    - ``AuditMiddleware``          — logs every API call per user
    - ``SessionSecurityMiddleware`` — detects IP-based session hijacking
"""
import time
import logging
import json as json_module

from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from django.core.cache import cache
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

from .security import AuditLogger, SessionSecurity

User = get_user_model()
logger = logging.getLogger(__name__)
api_logger = logging.getLogger('core.middleware')


# ---------------------------------------------------------------------------
# Registered middleware
# ---------------------------------------------------------------------------

class RateLimitMiddleware(MiddlewareMixin):
    """
    Enhanced per-IP rate limiter with login-specific protection.
    
    Limits:
        /api/token/ (login)  →  5 requests per minute  (strict login protection)
        /api/token/refresh/  →  10 requests per minute
        /api/               →  1000 requests per day (authenticated)
        /admin/             →  60 requests per minute
        (all others)        →  120 requests per minute
    """

    # Strict limits for login endpoints
    LOGIN_RATE_LIMIT = 5  # 5 attempts per minute per IP
    LOGIN_BLOCK_DURATION = 300  # 5 minutes block
    
    # General API limits
    API_DAILY_LIMIT = 1000  # 1000 requests per day per user
    
    LIMITS = {
        '/api/token/': 5,           # Login - very strict
        '/api/token/refresh/': 10, # Token refresh
        '/api/': 120,               # General API
        '/admin/': 60,              # Admin panel
    }
    DEFAULT_LIMIT = 120

    def process_request(self, request):
        ip = self._get_ip(request)
        path = request.path
        
        # Check if IP is blocked for login
        if cache.get(f"login_blocked:{ip}"):
            return JsonResponse({
                'error': 'Too many login attempts. Try again in 5 minutes.',
                'code': 'LOGIN_RATE_LIMITED'
            }, status=429)
        
        # Check for login endpoint specifically
        if path == '/api/v1/token/' or path == '/api/token/':
            return self._check_login_rate_limit(ip, request)
        
        # General rate limit check
        return self._check_general_rate_limit(ip, path)
    
    def _check_login_rate_limit(self, ip, request):
        """Check rate limit specifically for login attempts."""
        cache_key = f"login_rl:{ip}"
        count = cache.get(cache_key, 0)
        
        if count >= self.LOGIN_RATE_LIMIT:
            # Block the IP
            cache.set(f"login_blocked:{ip}", True, timeout=self.LOGIN_BLOCK_DURATION)
            logger.warning(
                "Login rate limit exceeded — IP %s blocked for %d seconds",
                ip, self.LOGIN_BLOCK_DURATION
            )
            
            # Record security event
            self._record_security_event(
                event_type='rate_limit_exceeded',
                ip_address=ip,
                endpoint='/api/token/',
                details=f'Login rate limit exceeded: {count} attempts'
            )
            
            return JsonResponse({
                'error': 'Too many login attempts. Try again in 5 minutes.',
                'code': 'LOGIN_RATE_LIMITED'
            }, status=429)
        
        # Increment counter
        cache.set(cache_key, count + 1, timeout=60)
        return None
    
    def _check_general_rate_limit(self, ip, path):
        """Check general rate limit for all other endpoints."""
        # Check if IP is generally blocked
        if cache.get(f"blocked:{ip}"):
            return JsonResponse({
                'error': 'Too many requests. Try again later.',
                'code': 'RATE_LIMITED'
            }, status=429)

        # Get the appropriate limit
        limit = self._get_limit(path)
        cache_key = f"rl:{ip}"
        
        count = cache.get(cache_key, 0)

        if count >= limit:
            cache.set(f"blocked:{ip}", True, timeout=300)
            logger.warning("Rate limit exceeded — IP %s blocked (path=%s).", ip, path)
            return JsonResponse({'error': 'Rate limit exceeded.'}, status=429)

        cache.set(cache_key, count + 1, timeout=60)
        return None
    
    def _get_limit(self, path: str) -> int:
        for prefix, limit in self.LIMITS.items():
            if path.startswith(prefix):
                return limit
        return self.DEFAULT_LIMIT

    @staticmethod
    def _get_ip(request) -> str:
        xff = request.META.get('HTTP_X_FORWARDED_FOR')
        return xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR', 'unknown')
    
    def _record_security_event(self, event_type, ip_address, endpoint, details=''):
        """Record security event to database."""
        try:
            from core.security_models import SecurityEvent
            SecurityEvent.objects.create(
                event_type=event_type,
                ip_address=ip_address,
                endpoint=endpoint,
                details=details,
            )
        except Exception as e:
            logger.error(f"Failed to record security event: {e}")
            return JsonResponse({'error': 'Too many requests. Try again in 5 minutes.'}, status=429)

        count = cache.get(cache_key, 0)
        limit = self._get_limit(request.path)

        if count >= limit:
            cache.set(f"blocked:{ip}", True, timeout=300)  # block for 5 min
            logger.warning("Rate limit exceeded — IP %s blocked (path=%s).", ip, request.path)
            return JsonResponse({'error': 'Rate limit exceeded.'}, status=429)

        cache.set(cache_key, count + 1, timeout=60)
        return None

    def _get_limit(self, path: str) -> int:
        for prefix, limit in self.LIMITS.items():
            if path.startswith(prefix):
                return limit
        return self.DEFAULT_LIMIT

    @staticmethod
    def _get_ip(request) -> str:
        xff = request.META.get('HTTP_X_FORWARDED_FOR')
        return xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR', 'unknown')


# ---------------------------------------------------------------------------
# Optional middleware (not registered by default)
# ---------------------------------------------------------------------------

class AuditMiddleware(MiddlewareMixin):
    """Log every authenticated API call and flag 4xx responses."""

    def process_request(self, request):
        if request.user.is_authenticated and request.path.startswith('/api/'):
            AuditLogger.log_data_access(request.user, request.path, request.method)

    def process_response(self, request, response):
        if request.user.is_authenticated and response.status_code >= 400:
            AuditLogger.log_permission_denied(request.user, request.path, request.method)
        return response


class SessionSecurityMiddleware(MiddlewareMixin):
    """Invalidate sessions where the client IP has changed mid-session."""

    def process_request(self, request):
        if not SessionSecurity.check_session_security(request):
            return JsonResponse({'error': 'Session security violation. Please log in again.'}, status=403)
        return None


class SecurityHeadersMiddleware(MiddlewareMixin):
    """Extra browser security headers (CSP / Permissions-Policy)."""

    def process_response(self, request, response):
        # SPA + API: allow self; tighten further behind a CDN if needed
        if 'Content-Security-Policy' not in response:
            response['Content-Security-Policy'] = (
                "default-src 'self'; "
                "img-src 'self' data: blob:; "
                "style-src 'self' 'unsafe-inline'; "
                "script-src 'self'; "
                "connect-src 'self'; "
                "frame-ancestors 'none'; "
                "base-uri 'self'; "
                "form-action 'self'"
            )
        if 'Permissions-Policy' not in response:
            response['Permissions-Policy'] = (
                'geolocation=(), microphone=(), camera=(), payment=()'
            )
        if 'X-Content-Type-Options' not in response:
            response['X-Content-Type-Options'] = 'nosniff'
        return response


class APIRequestLoggingMiddleware(MiddlewareMixin):
    """
    Log all API requests and responses with timing information.
    Logs to api_requests.log in JSON format.
    """
    
    # Skip logging for these paths
    SKIP_PATHS = ['/status/', '/health/']
    
    def process_request(self, request):
        """Store request start time"""
        request._request_start_time = time.time()
        request._request_start_timestamp = timezone.now()
        return None
    
    def process_response(self, request, response):
        """Log the API request and response"""
        # Skip non-API and health check requests
        if not request.path.startswith('/api/') and not request.path.startswith('/api/v1/'):
            return response
        
        # Skip certain paths
        if any(request.path.startswith(path) for path in self.SKIP_PATHS):
            return response
        
        # Calculate response time
        if hasattr(request, '_request_start_time'):
            response_time = (time.time() - request._request_start_time) * 1000  # Convert to ms
        else:
            response_time = None
        
        # Build log data
        log_data = {
            'timestamp': getattr(request, '_request_start_timestamp', timezone.now()).isoformat(),
            'method': request.method,
            'path': request.path,
            'endpoint': self._get_endpoint(request.path),
            'query_string': request.GET.urlencode() if request.GET else None,
            'status_code': response.status_code,
            'response_time_ms': round(response_time, 2) if response_time else None,
            'user': request.user.username if request.user.is_authenticated else 'anonymous',
            'user_id': str(request.user.id) if request.user.is_authenticated else None,
            'ip_address': self._get_client_ip(request),
            'user_agent': request.META.get('HTTP_USER_AGENT', '')[:200],  # Truncate for privacy
        }
        
        # Log based on status code
        if response.status_code >= 500:
            api_logger.error(json_module.dumps(log_data))
        elif response.status_code >= 400:
            api_logger.warning(json_module.dumps(log_data))
        else:
            api_logger.info(json_module.dumps(log_data))
        
        return response
    
    def _get_endpoint(self, path):
        """Extract endpoint name from path"""
        parts = path.split('/')
        for part in parts:
            if part and not part.isdigit() and part not in ('api', 'v1', ''):
                return part
        return 'unknown'
    
    @staticmethod
    def _get_client_ip(request):
        """Get client IP address, respecting X-Forwarded-For header"""
        xff = request.META.get('HTTP_X_FORWARDED_FOR')
        if xff:
            return xff.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', 'unknown')
