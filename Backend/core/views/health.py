"""System health check endpoints."""
import logging

from django.db import connection
from django.utils import timezone
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..monitoring import SystemMonitor, MetricsCollector, AlertManager
from ..permissions import IsAdminRole

logger = logging.getLogger(__name__)


class LivenessView(APIView):
    """Unauthenticated liveness probe for Docker/orchestrators."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        try:
            connection.ensure_connection()
            return Response({'status': 'ok', 'timestamp': timezone.now().isoformat()})
        except Exception as exc:
            return Response(
                {'status': 'down', 'error': str(exc)},
                status=503,
            )


class HealthCheckView(APIView):
    """
    System health, business metrics, and alert status.

    **Admin-only** — this endpoint exposes internal DB connectivity status,
    system resource usage, and business metrics that must not be public.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        try:
            connection.ensure_connection()
            health = SystemMonitor.get_system_health()
            metrics = MetricsCollector.get_business_metrics()
            alerts = AlertManager.check_alerts()
            return Response({
                "status": health['status'],
                "timestamp": timezone.now().isoformat(),
                "health": health,
                "metrics": metrics,
                "alerts": alerts,
            })
        except Exception as exc:
            logger.error("Health check error: %s", exc, exc_info=True)
            return Response({
                "status": "down",
                "error": str(exc),
                "timestamp": timezone.now().isoformat(),
            }, status=500)
