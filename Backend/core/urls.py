from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MedicationViewSet, SaleViewSet, PrescriptionViewSet, RestockViewSet,
    CustomerViewSet, DiscountViewSet, PromotionViewSet, AuditTrailViewSet,
    StockMovementViewSet, SalesAnalyticsView, DashboardAnalyticsView
)
from .health import health_check

router = DefaultRouter()
router.register(r'medications', MedicationViewSet)
router.register(r'sales', SaleViewSet)
router.register(r'prescriptions', PrescriptionViewSet)
router.register(r'restocks', RestockViewSet)
router.register(r'customers', CustomerViewSet)
router.register(r'discounts', DiscountViewSet)
router.register(r'promotions', PromotionViewSet)
router.register(r'audit-trail', AuditTrailViewSet)
router.register(r'stock-movements', StockMovementViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('analytics/sales/', SalesAnalyticsView.as_view(), name='sales-analytics'),
    path('analytics/dashboard/', DashboardAnalyticsView.as_view(), name='dashboard-analytics'),
    path('health/', health_check, name='health-check'),
]