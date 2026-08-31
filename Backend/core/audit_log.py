"""Central helper for writing AuditTrail rows."""
from __future__ import annotations

import logging
from typing import Any

from .models import AuditTrail

logger = logging.getLogger(__name__)


def _client_ip(request) -> str | None:
    if request is None:
        return None
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def log_audit(
    *,
    user=None,
    action: str,
    entity: str,
    entity_id: str = '',
    details: dict[str, Any] | None = None,
    request=None,
) -> AuditTrail | None:
    """
    Persist an audit event. Failures are logged but never raise to callers
    so business operations are not blocked by audit I/O errors.
    """
    try:
        return AuditTrail.objects.create(
            user=user if getattr(user, 'is_authenticated', False) else None,
            action=action,
            entity=entity,
            entity_id=str(entity_id or ''),
            details=details or {},
            ip_address=_client_ip(request),
            user_agent=(request.META.get('HTTP_USER_AGENT', '')[:500] if request else ''),
        )
    except Exception as exc:
        logger.warning(
            "Failed to write audit log action=%s entity=%s: %s",
            action,
            entity,
            exc,
        )
        return None
