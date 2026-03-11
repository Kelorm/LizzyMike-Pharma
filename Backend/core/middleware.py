"""
Custom middleware for the pharmacy system
"""
import logging
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from django.core.cache import cache
from django.contrib.auth import get_user_model
from .security import SecurityMiddleware, AuditLogger, SessionSecurity

User = get_user_model()
logger = logging.getLogger(__name__)

class SecurityMiddlewareWrapper(SecurityMiddleware, MiddlewareMixin):
    """Wrapper for security middleware"""
    pass

class AuditMiddleware(MiddlewareMixin):
    """Audit middleware for logging user actions"""
    
    def process_request(self, request):
        """Process request for audit logging"""
        if request.user.is_authenticated:
            # Log API access
            if request.path.startswith('/api/'):
                AuditLogger.log_data_access(
                    request.user,
                    request.path,
                    request.method
                )
    
    def process_response(self, request, response):
        """Process response for audit logging"""
        if request.user.is_authenticated and response.status_code >= 400:
            AuditLogger.log_permission_denied(
                request.user,
                request.path,
                request.method
            )
        
        return response

class SessionSecurityMiddleware(MiddlewareMixin):
    """Session security middleware"""
    
    def process_request(self, request):
        """Check session security"""
        if not SessionSecurity.check_session_security(request):
            return JsonResponse({'error': 'Session security violation'}, status=403)
        
        return None

class RateLimitMiddleware(MiddlewareMixin):
    """Rate limiting middleware"""
    
    def process_request(self, request):
        """Apply rate limiting"""
        ip = self.get_client_ip(request)
        cache_key = f"rate_limit_{ip}"
        
        # Get current request count
        requests = cache.get(cache_key, 0)
        
        # Define rate limits
        limits = {
            '/api/auth/': 5,  # 5 login attempts per minute
            '/api/': 100,     # 100 API calls per minute
            '/admin/': 50,    # 50 admin requests per minute
        }
        
        # Find applicable limit
        limit = 100  # Default limit
        for path, path_limit in limits.items():
            if request.path.startswith(path):
                limit = path_limit
                break
        
        if requests >= limit:
            logger.warning(f"Rate limit exceeded for IP {ip} on {request.path}")
            return JsonResponse({'error': 'Rate limit exceeded'}, status=429)
        
        # Increment counter
        cache.set(cache_key, requests + 1, timeout=60)
        
        return None
    
    def get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

class HealthCheckMiddleware(MiddlewareMixin):
    """Health check middleware"""
    
    def process_request(self, request):
        """Handle health check requests"""
        if request.path == '/health/':
            return JsonResponse({
                'status': 'healthy',
                'timestamp': timezone.now().isoformat(),
                'version': '1.0.0'
            })
        
        return None





