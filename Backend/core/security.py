"""
Security utilities for LizzyMike Pharma.

Only safe, correct utilities are included here.  The removed items were:

* ``DataEncryption.encrypt_sensitive_data`` — SHA-256 is a *hash*, not
  encryption; the original data cannot be recovered.
* ``DataEncryption.hash_password`` — used the current timestamp as a salt,
  which is predictable and not stored, making verification impossible.
  Django's own auth system (``AbstractUser``) handles password hashing
  correctly using PBKDF2 + a random salt.

Do NOT add any custom password hashing.  Always use Django's built-in system.
"""
import logging
import ipaddress

from django.core.cache import cache
from django.http import HttpRequest
from django.utils import timezone
from django.core.exceptions import PermissionDenied

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# IP helpers
# ---------------------------------------------------------------------------

def get_client_ip(request: HttpRequest) -> str | None:
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


# ---------------------------------------------------------------------------
# Audit logging helpers
# ---------------------------------------------------------------------------

class AuditLogger:
    """Structured audit-logging helpers for security events."""

    @staticmethod
    def log_login_attempt(username: str, ip: str, success: bool = True) -> None:
        level = logging.INFO if success else logging.WARNING
        logger.log(
            level,
            "Login attempt: user=%r ip=%s success=%s",
            username, ip, success,
        )

    @staticmethod
    def log_permission_denied(user, resource: str, action: str) -> None:
        logger.warning(
            "Permission denied: user=%r action=%r resource=%r",
            getattr(user, 'username', str(user)), action, resource,
        )

    @staticmethod
    def log_data_access(user, resource: str, action: str) -> None:
        logger.info(
            "Data access: user=%r action=%r resource=%r",
            getattr(user, 'username', str(user)), action, resource,
        )


# ---------------------------------------------------------------------------
# IP whitelist helper
# ---------------------------------------------------------------------------

class IPWhitelist:
    """Simple IP allowlist checker (extend via settings/DB for production)."""

    ALLOWED = {'127.0.0.1', '::1'}

    @classmethod
    def is_ip_allowed(cls, ip: str) -> bool:
        try:
            return ipaddress.ip_address(ip) in {
                ipaddress.ip_address(a) for a in cls.ALLOWED
            }
        except ValueError:
            return False


# ---------------------------------------------------------------------------
# Session security helper
# ---------------------------------------------------------------------------

class SessionSecurity:
    """Detect session hijacking by IP address comparison."""

    @staticmethod
    def check_session_security(request: HttpRequest) -> bool:
        if not request.user.is_authenticated:
            return True

        current_ip = get_client_ip(request)
        stored_ip  = request.session.get('ip_address')

        if stored_ip and stored_ip != current_ip:
            logger.warning(
                "Possible session hijacking: user=%r session ip=%r current ip=%r",
                request.user.id, stored_ip, current_ip,
            )
            request.session.flush()
            return False

        request.session['ip_address'] = current_ip
        return True
