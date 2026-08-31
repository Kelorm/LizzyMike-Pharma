"""Business day open/close for POS trading."""
import logging
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import BusinessDay
from ..permissions import IsAdminRole, IsStaffOrAbove
from ..serializers import BusinessDaySerializer
from ..branching import BranchScopedMixin, resolve_branch

logger = logging.getLogger(__name__)


class BusinessDayViewSet(
    BranchScopedMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """
    Trading day control.

    - current: any authenticated
    - list / open: admin
    - close: staff or above
    """

    queryset = BusinessDay.objects.select_related('opened_by', 'closed_by').all()
    serializer_class = BusinessDaySerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_permissions(self):
        if self.action in ('list', 'open'):
            return [IsAuthenticated(), IsAdminRole()]
        if self.action == 'close':
            return [IsAuthenticated(), IsStaffOrAbove()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'])
    def current(self, request):
        branch = resolve_branch(request, required=True)
        day = BusinessDay.get_open_day(branch=branch)
        if day:
            return Response({
                'status': 'open',
                'day': BusinessDaySerializer(day).data,
            })
        # Surface today's closed day so admin UI can offer reopen.
        closed_today = (
            BusinessDay.objects.filter(
                branch=branch,
                business_date=timezone.localdate(),
                status=BusinessDay.STATUS_CLOSED,
            )
            .select_related('opened_by', 'closed_by')
            .first()
        )
        return Response({
            'status': 'closed',
            'day': BusinessDaySerializer(closed_today).data if closed_today else None,
        })

    @action(detail=False, methods=['post'])
    def open(self, request):
        """Open a new trading day, or reopen today's closed day. Admin only."""
        branch = resolve_branch(request, required=True)
        if BusinessDay.get_open_day(branch=branch):
            return Response(
                {
                    'detail': (
                        f'A trading day is already open for branch {branch.code}. '
                        'Close it before opening another.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        today = timezone.localdate()
        raw_date = request.data.get('business_date')
        if raw_date:
            try:
                from datetime import date as date_cls
                if isinstance(raw_date, str):
                    business_date = date_cls.fromisoformat(raw_date)
                else:
                    business_date = raw_date
            except (TypeError, ValueError):
                return Response(
                    {'business_date': ['Invalid date. Use YYYY-MM-DD.']},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            business_date = today

        try:
            opening_float = Decimal(str(request.data.get('opening_float', '0') or '0'))
        except (InvalidOperation, TypeError):
            return Response(
                {'opening_float': ['Invalid amount.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        open_notes = (request.data.get('open_notes') or '').strip()
        existing = BusinessDay.objects.filter(branch=branch, business_date=business_date).first()

        if existing and existing.status == BusinessDay.STATUS_OPEN:
            return Response(
                {
                    'detail': (
                        f'A trading day is already open for branch {branch.code}. '
                        'Close it before opening another.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                if existing:
                    # Admin-only reopen of a previously closed day (same calendar date).
                    existing.status = BusinessDay.STATUS_OPEN
                    existing.opened_at = timezone.now()
                    existing.opened_by = request.user
                    existing.opening_float = opening_float
                    if open_notes:
                        existing.open_notes = open_notes
                    existing.closed_at = None
                    existing.closed_by = None
                    existing.closing_cash = None
                    existing.close_notes = ''
                    existing.save(
                        update_fields=[
                            'status', 'opened_at', 'opened_by', 'opening_float', 'open_notes',
                            'closed_at', 'closed_by', 'closing_cash', 'close_notes', 'updated_at',
                        ]
                    )
                    day = existing
                    created = False
                else:
                    day = BusinessDay.objects.create(
                        branch=branch,
                        business_date=business_date,
                        status=BusinessDay.STATUS_OPEN,
                        opened_at=timezone.now(),
                        opened_by=request.user,
                        opening_float=opening_float,
                        open_notes=open_notes,
                    )
                    created = True
        except Exception as exc:
            from django.db import IntegrityError
            if isinstance(exc, IntegrityError):
                return Response(
                    {
                        'detail': (
                            f'A trading day for {business_date} already exists at branch '
                            f'{branch.code}. Refresh and try again.'
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            raise

        logger.info(
            "Business day %s %s by %s (branch=%s)",
            day.business_date,
            'reopened' if not created else 'opened',
            request.user.username,
            branch.code,
        )
        return Response(
            BusinessDaySerializer(day).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=False, methods=['post'])
    def close(self, request):
        branch = resolve_branch(request, required=True)
        day = BusinessDay.get_open_day(branch=branch)
        if not day:
            return Response(
                {'detail': 'No open trading day to close.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        closing_cash = request.data.get('closing_cash', None)
        if closing_cash is not None and closing_cash != '':
            try:
                closing_cash = Decimal(str(closing_cash))
            except (InvalidOperation, TypeError):
                return Response(
                    {'closing_cash': ['Invalid amount.']},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            closing_cash = None

        close_notes = (request.data.get('close_notes') or '').strip()

        with transaction.atomic():
            day.status = BusinessDay.STATUS_CLOSED
            day.closed_at = timezone.now()
            day.closed_by = request.user
            day.closing_cash = closing_cash
            day.close_notes = close_notes
            day.save(
                update_fields=[
                    'status', 'closed_at', 'closed_by',
                    'closing_cash', 'close_notes', 'updated_at',
                ]
            )
        logger.info(
            "Business day %s closed by %s",
            day.business_date,
            request.user.username,
        )
        return Response(BusinessDaySerializer(day).data, status=status.HTTP_200_OK)
