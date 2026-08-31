"""Business analytics views."""
import logging

from django.db.models import Sum, Count, Avg, F
from django.db.models.functions import TruncDay, TruncMonth
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from ..models import Sale, SaleItem
from ..permissions import IsAdminRole

logger = logging.getLogger(__name__)


class SalesAnalyticsView(APIView):
    """
    Detailed sales analytics over a configurable date range.

    Query param: ``days`` (default 30)
    """
    permission_classes = [IsAuthenticated, IsAdminRole]
    throttle_classes = [UserRateThrottle]

    def get(self, request):
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now().date() - timezone.timedelta(days=days)
        today = timezone.now().date()

        sales_qs = Sale.objects.filter(date__gte=start_date)

        daily = Sale.objects.filter(date=today).aggregate(
            total_revenue=Sum('total'),
            total_sales=Count('id'),
            total_profit=Sum('profit'),
            avg_sale_value=Avg('total'),
        )

        first_day = today.replace(day=1)
        monthly = Sale.objects.filter(date__gte=first_day).aggregate(
            total_revenue=Sum('total'),
            total_sales=Count('id'),
            total_profit=Sum('profit'),
            avg_sale_value=Avg('total'),
        )

        items_qs = SaleItem.objects.filter(sale__date__gte=start_date)

        top_meds_qty = items_qs.values('medication__name', 'medication__id').annotate(
            total_sold=Sum('qty'),
            total_revenue=Sum(F('qty') * F('price')),
            total_profit=Sum(F('qty') * (F('price') - F('cost'))),
        ).order_by('-total_sold')[:10]

        top_meds_rev = items_qs.values('medication__name', 'medication__id').annotate(
            total_sold=Sum('qty'),
            total_revenue=Sum(F('qty') * F('price')),
            total_profit=Sum(F('qty') * (F('price') - F('cost'))),
        ).order_by('-total_revenue')[:10]

        top_meds_profit = items_qs.values('medication__name', 'medication__id').annotate(
            total_sold=Sum('qty'),
            total_revenue=Sum(F('qty') * F('price')),
            total_profit=Sum(F('qty') * (F('price') - F('cost'))),
        ).order_by('-total_profit')[:10]

        daily_trend = sales_qs.annotate(day=TruncDay('date')).values('day').annotate(
            total_revenue=Sum('total'),
            total_sales=Count('id'),
            total_profit=Sum('profit'),
        ).order_by('day')

        payment_methods = sales_qs.values('payment_method').annotate(
            total_revenue=Sum('total'),
            total_sales=Count('id'),
        ).order_by('-total_revenue')

        category_perf = items_qs.values('medication__category').annotate(
            total_sold=Sum('qty'),
            total_revenue=Sum(F('qty') * F('price')),
            total_profit=Sum(F('qty') * (F('price') - F('cost'))),
        ).order_by('-total_revenue')

        return Response({
            'daily': daily,
            'monthly': monthly,
            'top_medications_by_quantity': list(top_meds_qty),
            'top_medications_by_revenue': list(top_meds_rev),
            'top_medications_by_profit': list(top_meds_profit),
            'daily_trend': list(daily_trend),
            'payment_methods': list(payment_methods),
            'category_performance': list(category_perf),
            'date_range': {'start_date': start_date, 'end_date': today, 'days': days},
        })


class DashboardAnalyticsView(APIView):
    """
    Summary dashboard data (today + this month + top products + trend).

    Query param: ``days`` (default 30)
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [UserRateThrottle]

    def get(self, request):
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now().date() - timezone.timedelta(days=days)
        today = timezone.now().date()

        sales_qs = Sale.objects.filter(date__gte=start_date)
        logger.info("Dashboard analytics: days=%d, start=%s, records=%d", days, start_date, sales_qs.count())

        today_stats = Sale.objects.filter(date=today).aggregate(
            total_revenue=Sum('total'),
            total_sales=Count('id'),
            total_profit=Sum('profit'),
            avg_sale_value=Avg('total'),
        )

        first_day = today.replace(day=1)
        month_stats = Sale.objects.filter(date__gte=first_day).aggregate(
            total_revenue=Sum('total'),
            total_sales=Count('id'),
            total_profit=Sum('profit'),
            avg_sale_value=Avg('total'),
        )

        items_qs = SaleItem.objects.filter(sale__date__gte=start_date)

        top_by_qty = items_qs.values(
            'medication__name', 'medication__id', 'medication__category'
        ).annotate(
            total_sold=Sum('qty'),
            total_revenue=Sum(F('qty') * F('price')),
            total_profit=Sum(F('qty') * (F('price') - F('cost'))),
            avg_price=Avg('price'),
        ).order_by('-total_sold')[:6]

        top_by_rev = items_qs.values(
            'medication__name', 'medication__id', 'medication__category'
        ).annotate(
            total_sold=Sum('qty'),
            total_revenue=Sum(F('qty') * F('price')),
            total_profit=Sum(F('qty') * (F('price') - F('cost'))),
            avg_price=Avg('price'),
        ).order_by('-total_revenue')[:6]

        last_7 = today - timezone.timedelta(days=7)
        daily_trend = Sale.objects.filter(date__gte=last_7).annotate(
            day=TruncDay('date')
        ).values('day').annotate(
            total_revenue=Sum('total'),
            total_sales=Count('id'),
            total_profit=Sum('profit'),
        ).order_by('day')

        category_perf = items_qs.values('medication__category').annotate(
            total_sold=Sum('qty'),
            total_revenue=Sum(F('qty') * F('price')),
            total_profit=Sum(F('qty') * (F('price') - F('cost'))),
        ).order_by('-total_revenue')[:5]

        return Response({
            'today_stats': today_stats,
            'month_stats': month_stats,
            'top_products_by_quantity': list(top_by_qty),
            'top_products_by_revenue': list(top_by_rev),
            'daily_trend': list(daily_trend),
            'category_performance': list(category_perf),
            'date_range': {'start_date': start_date, 'end_date': today, 'days': days},
        })
