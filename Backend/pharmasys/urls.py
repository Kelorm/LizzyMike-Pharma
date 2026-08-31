from django.contrib import admin
from django.urls import path, include
from django.shortcuts import render
from rest_framework.routers import DefaultRouter
from core.views import (
    MedicationViewSet,
    SaleViewSet,
    InvoicePDFView,
    ReceiptPDFView,
    CustomerViewSet,
    PrescriptionViewSet,
    SaleItemViewSet,
    RestockViewSet,
    DiscountViewSet,
    PromotionViewSet,
    TaxRateViewSet,
    DiscountRateViewSet,
    AuditTrailViewSet,
    StockMovementViewSet,
    MedicationListForSale,
    profile_view,
    change_password,
    register_user,
    logout_view,
    csrf_cookie_view,
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    UserViewSet,
    BusinessDayViewSet,
    pharmacy_profile_view,
    BranchViewSet,
    SalesAnalyticsView,
    DashboardAnalyticsView,
    HealthCheckView,
    LivenessView,
)
from core.health import StatusDashboardView

router = DefaultRouter()
router.register(r'medications', MedicationViewSet)
router.register(r'sales', SaleViewSet)
router.register(r'customers', CustomerViewSet)
router.register(r'prescriptions', PrescriptionViewSet)
router.register(r'sale-items', SaleItemViewSet)
router.register(r'restocks', RestockViewSet)
router.register(r'users', UserViewSet)
router.register(r'business-days', BusinessDayViewSet, basename='business-days')
router.register(r'branches', BranchViewSet, basename='branches')
router.register(r'discounts', DiscountViewSet)
router.register(r'promotions', PromotionViewSet)
router.register(r'tax-rates', TaxRateViewSet, basename='tax-rates')
router.register(r'discount-rates', DiscountRateViewSet, basename='discount-rates')
router.register(r'audit-trail', AuditTrailViewSet)
router.register(r'stock-movements', StockMovementViewSet)


def root_view(request):
    return render(request, 'core/index.html')


api_v1_patterns = [
    path('', include(router.urls)),

    path('analytics/sales/', SalesAnalyticsView.as_view(), name='sales-analytics'),
    path('analytics/dashboard/', DashboardAnalyticsView.as_view(), name='dashboard-analytics'),

    path('medications/available/', MedicationListForSale.as_view(), name='medications-available'),

    path('profile/', profile_view, name='user-profile'),
    path('auth/register/', register_user, name='register-user'),
    path('auth/change-password/', change_password, name='change-password'),
    path('auth/logout/', logout_view, name='logout'),
    path('auth/csrf/', csrf_cookie_view, name='csrf-cookie'),
    path('pharmacy-profile/', pharmacy_profile_view, name='pharmacy-profile'),

    path('sales/<uuid:sale_id>/invoice/', InvoicePDFView.as_view(), name='sale-invoice'),
    path('receipt/<uuid:sale_id>/', ReceiptPDFView.as_view(), name='receipt-pdf-api'),

    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('health/live/', LivenessView.as_view(), name='health-liveness'),

    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
]

urlpatterns = [
    path('', root_view, name='root'),
    path('admin/', admin.site.urls),
    path('status/', StatusDashboardView.as_view(), name='status-dashboard'),
    path('api/v1/', include(api_v1_patterns)),
    path('receipt/<uuid:sale_id>/', ReceiptPDFView.as_view(), name='receipt-direct'),
]
