from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.authtoken.views import obtain_auth_token
from django.http import JsonResponse
from rest_framework.routers import DefaultRouter
from core.views import (
    MedicationViewSet, 
    SaleViewSet, 
    InvoicePDFView,
    ReceiptPDFView, # Make sure this is imported
    CustomerViewSet,
    PrescriptionViewSet,
    SaleItemViewSet,
    RestockViewSet,
    MedicationListForSale,
    profile_view,
    SalesAnalyticsView,
    DashboardAnalyticsView
)

# Create router and register viewsets
router = DefaultRouter()
router.register(r'medications', MedicationViewSet)
router.register(r'sales', SaleViewSet)
router.register(r'customers', CustomerViewSet)
router.register(r'prescriptions', PrescriptionViewSet)
router.register(r'sale-items', SaleItemViewSet)
router.register(r'restocks', RestockViewSet)

def root_view(request):
    return JsonResponse({
        "message": "Welcome to the Pharmacy System API",
        "endpoints": {
            "medications": "/api/medications/",
            "medications_available": "/api/medications/available/",
            "sales": "/api/sales/",
            "customers": "/api/customers/",
            "prescriptions": "/api/prescriptions/",
            "sale_items": "/api/sale-items/",
            "restocks": "/api/restocks/",
            "analytics_sales": "/api/analytics/sales/",
            "analytics_dashboard": "/api/analytics/dashboard/",
            "token_obtain": "/api/token/",
            "token_refresh": "/api/token/refresh/",
            "user_profile": "/api/profile/",
            "invoice": "/api/sales/<sale_id>/invoice/",
            "receipt_api": "/api/receipt/<sale_id>/",
            "receipt_direct": "/receipt/<sale_id>/"
        }
    })

urlpatterns = [
    path('', root_view, name='root'),
    path('admin/', admin.site.urls),
    
    # API endpoints
    path('api/', include(router.urls)),
    
    # Analytics endpoints
    path('api/analytics/sales/', SalesAnalyticsView.as_view(), name='sales-analytics'),
    path('api/analytics/dashboard/', DashboardAnalyticsView.as_view(), name='dashboard-analytics'),
    
    # Additional custom endpoints
    path('api/medications/available/', MedicationListForSale.as_view(), name='medications-available'),
    path('api/profile/', profile_view, name='user-profile'),
    path('api/sales/<uuid:sale_id>/invoice/', InvoicePDFView.as_view(), name='sale-invoice'),
    path('api/receipt/<uuid:sale_id>/', ReceiptPDFView.as_view(), name='receipt-pdf-api'),
    
    # Direct receipt path for frontend
    path('receipt/<uuid:sale_id>/', ReceiptPDFView.as_view(), name='receipt-direct'),
    
    # Authentication endpoints
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api-token-auth/', obtain_auth_token, name='api_token_auth'),
]