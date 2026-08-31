"""
core.views package
==================
Re-exports all public view symbols so that existing imports such as::

    from core.views import MedicationViewSet, SaleViewSet, ...

continue to work unchanged after the views module was split into sub-modules.
"""

from .auth import (          # noqa: F401
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    register_user,
    profile_view,
    change_password,
    logout_view,
    csrf_cookie_view,
)
from .users import (         # noqa: F401
    UserViewSet,
)
from .pharmacy import (      # noqa: F401
    pharmacy_profile_view,
    BranchViewSet,
)
from .medications import (   # noqa: F401
    MedicationViewSet,
    MedicationListForSale,
)
from .customers import (     # noqa: F401
    CustomerViewSet,
)
from .prescriptions import ( # noqa: F401
    PrescriptionViewSet,
)
from .sales import (         # noqa: F401
    SaleViewSet,
    SaleItemViewSet,
)
from .restock import (       # noqa: F401
    RestockViewSet,
)
from .business_days import (  # noqa: F401
    BusinessDayViewSet,
)
from .discounts import (     # noqa: F401
    DiscountViewSet,
    PromotionViewSet,
)
from .rates import (         # noqa: F401
    TaxRateViewSet,
    DiscountRateViewSet,
)
from .audit import (         # noqa: F401
    AuditTrailViewSet,
    StockMovementViewSet,
)
from .analytics import (     # noqa: F401
    SalesAnalyticsView,
    DashboardAnalyticsView,
)
from .documents import (     # noqa: F401
    BasePDFView,
    InvoicePDFView,
    ReceiptPDFView,
)
from .health import (         # noqa: F401
    HealthCheckView,
    LivenessView,
)

__all__ = [
    # auth
    'CustomTokenObtainPairView', 'CustomTokenRefreshView',
    'register_user', 'profile_view', 'change_password', 'logout_view', 'csrf_cookie_view',
    'UserViewSet',
    'pharmacy_profile_view',
    'BranchViewSet',
    # medications
    'MedicationViewSet', 'MedicationListForSale',
    # customers
    'CustomerViewSet',
    # prescriptions
    'PrescriptionViewSet',
    # sales
    'SaleViewSet', 'SaleItemViewSet',
    # restock
    'RestockViewSet',
    'BusinessDayViewSet',
    # discounts
    'DiscountViewSet', 'PromotionViewSet',
    'TaxRateViewSet', 'DiscountRateViewSet',
    # audit
    'AuditTrailViewSet', 'StockMovementViewSet',
    # analytics
    'SalesAnalyticsView', 'DashboardAnalyticsView',
    # documents
    'BasePDFView', 'InvoicePDFView', 'ReceiptPDFView',
    # health
    'HealthCheckView', 'LivenessView',
]
