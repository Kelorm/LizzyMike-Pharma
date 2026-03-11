"""
Security utilities for the pharmacy system
"""
import logging
from django.core.cache import cache
from django.http import HttpRequest
from django.utils import timezone
from django.core.exceptions import PermissionDenied
from django.contrib.auth import get_user_model
from django.db import models
import hashlib
import ipaddress

User = get_user_model()
logger = logging.getLogger(__name__)

class SecurityMiddleware:
    """Custom security middleware for additional protection"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Rate limiting by IP
        self.check_rate_limit(request)
        
        # Log suspicious activity
        self.log_suspicious_activity(request)
        
        response = self.get_response(request)
        
        # Add security headers
        self.add_security_headers(response)
        
        return response
    
    def check_rate_limit(self, request):
        """Implement rate limiting"""
        ip = self.get_client_ip(request)
        cache_key = f"rate_limit_{ip}"
        
        # Check if IP is blocked
        if cache.get(f"blocked_{ip}"):
            raise PermissionDenied("IP address is temporarily blocked")
        
        # Count requests
        requests = cache.get(cache_key, 0)
        if requests > 100:  # 100 requests per minute
            cache.set(f"blocked_{ip}", True, timeout=300)  # Block for 5 minutes
            logger.warning(f"IP {ip} blocked due to rate limiting")
            raise PermissionDenied("Too many requests")
        
        cache.set(cache_key, requests + 1, timeout=60)
    
    def log_suspicious_activity(self, request):
        """Log suspicious activity"""
        ip = self.get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        # Check for suspicious patterns
        suspicious_patterns = [
            'sqlmap', 'nikto', 'nmap', 'masscan',
            'admin', 'phpmyadmin', 'wp-admin',
            'script', 'javascript', 'eval('
        ]
        
        for pattern in suspicious_patterns:
            if pattern.lower() in request.path.lower() or pattern.lower() in user_agent.lower():
                logger.warning(f"Suspicious activity detected from IP {ip}: {request.path}")
                break
    
    def add_security_headers(self, response):
        """Add security headers"""
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
    
    def get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

class AuditLogger:
    """Audit logging for security events"""
    
    @staticmethod
    def log_login_attempt(user, ip, success=True):
        """Log login attempts"""
        status = "SUCCESS" if success else "FAILED"
        logger.info(f"Login attempt: {user} from {ip} - {status}")
    
    @staticmethod
    def log_permission_denied(user, resource, action):
        """Log permission denied events"""
        logger.warning(f"Permission denied: {user} attempted {action} on {resource}")
    
    @staticmethod
    def log_data_access(user, resource, action):
        """Log data access events"""
        logger.info(f"Data access: {user} performed {action} on {resource}")

class DataEncryption:
    """Data encryption utilities"""
    
    @staticmethod
    def encrypt_sensitive_data(data):
        """Encrypt sensitive data"""
        # In production, use proper encryption like Fernet
        return hashlib.sha256(data.encode()).hexdigest()
    
    @staticmethod
    def hash_password(password):
        """Hash password with salt"""
        salt = timezone.now().isoformat()
        return hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)

class IPWhitelist:
    """IP whitelist management"""
    
    @staticmethod
    def is_ip_allowed(ip):
        """Check if IP is in whitelist"""
        # In production, maintain a database of allowed IPs
        allowed_ips = [
            '127.0.0.1',
            '::1',
            # Add your trusted IPs here
        ]
        
        try:
            ip_obj = ipaddress.ip_address(ip)
            for allowed_ip in allowed_ips:
                if ip_obj == ipaddress.ip_address(allowed_ip):
                    return True
        except ValueError:
            pass
        
        return False

class SessionSecurity:
    """Session security utilities"""
    
    @staticmethod
    def invalidate_user_sessions(user_id):
        """Invalidate all sessions for a user"""
        # In production, use Redis or database to track sessions
        cache.delete_pattern(f"session_{user_id}_*")
    
    @staticmethod
    def check_session_security(request):
        """Check session security"""
        if not request.user.is_authenticated:
            return True
        
        # Check for session hijacking
        current_ip = SecurityMiddleware().get_client_ip(request)
        stored_ip = request.session.get('ip_address')
        
        if stored_ip and stored_ip != current_ip:
            logger.warning(f"Session hijacking attempt detected for user {request.user.id}")
            request.session.flush()
            return False
        
        request.session['ip_address'] = current_ip
        return True





