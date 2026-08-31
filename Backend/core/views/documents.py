"""PDF document generation views — receipts and invoices."""
import logging
from pathlib import Path

from django.conf import settings
from django.contrib.auth.mixins import LoginRequiredMixin
from django.core.exceptions import PermissionDenied
from django.http import HttpResponse, Http404
from django.shortcuts import get_object_or_404
from django.template.loader import render_to_string
from django.templatetags.static import static
from django.views import View

try:
    from weasyprint import HTML, CSS
    WEASYPRINT_AVAILABLE = True
except ImportError:
    logger_temp = logging.getLogger(__name__)
    logger_temp.warning("WeasyPrint not installed — PDF views will fall back to HTML.")
    WEASYPRINT_AVAILABLE = False

from ..models import Sale, SaleItem, PharmacyProfile
from ..barcode_svg import build_qr_svg, PHARMACY_CROSS_LOGO_SVG
from ..branching import resolve_branch

logger = logging.getLogger(__name__)


def _receipt_logo_html(request=None) -> str:
    """Use the LizzyMike brand logo on receipts; fall back to SVG cross."""
    logo_candidates = (
        'images/LizzyMikeLogo.png',
        'images/logo.png',
    )
    for rel in logo_candidates:
        path = Path(settings.BASE_DIR) / 'static' / rel
        if not path.is_file():
            path = Path(settings.BASE_DIR) / 'staticfiles' / rel
        if not path.is_file():
            continue
        try:
            url = static(rel)
            if request is not None:
                url = request.build_absolute_uri(url)
            return (
                f'<img src="{url}" alt="LizzyMike Pharmacy" '
                f'style="width:64px;height:64px;object-fit:contain;display:block;margin:0 auto;" />'
            )
        except Exception as exc:
            logger.warning("Could not resolve receipt logo %s: %s", rel, exc)
    return PHARMACY_CROSS_LOGO_SVG


# ---------------------------------------------------------------------------
# Base view
# ---------------------------------------------------------------------------

class BasePDFView(LoginRequiredMixin, View):
    """
    Base class for PDF document generation.

    Inherits ``LoginRequiredMixin`` so unauthenticated requests are redirected
    to the login page automatically.  Subclasses must set ``template_name`` and
    may override ``permission_required``.
    """
    template_name = None
    filename_prefix = "document"
    content_disposition = "attachment"
    permission_required = 'core.view_sale'
    login_url = '/admin/login/'

    def get_object(self, sale_id):
        return get_object_or_404(
            Sale.objects.select_related('customer', 'created_by')
                        .prefetch_related('items__medication'),
            id=sale_id,
        )

    def get_context_data(self, sale):
        from decimal import Decimal

        if sale.created_by_id and sale.created_by:
            cashier = sale.created_by.full_name or sale.created_by.get_full_name() or sale.created_by.username
        elif self.request.user.is_authenticated:
            cashier = (
                self.request.user.get_full_name()
                or getattr(self.request.user, 'full_name', '')
                or self.request.user.username
            )
        else:
            cashier = 'System'

        try:
            branch = None
            if getattr(sale, 'branch_id', None):
                branch = sale.branch
            if branch is None:
                try:
                    branch = resolve_branch(self.request, required=False)
                except Exception:
                    branch = None
            if branch is None:
                from ..models import Branch
                branch = Branch.get_default()
            pharmacy = {
                'name': branch.name or 'LizzyMike Pharmacy',
                'address': branch.address or 'Accra, Ghana',
                'phone': branch.phone or '(000) 000-0000',
                'license': branch.license_no or 'pharmacy authority',
            }
        except Exception:
            settings_info = getattr(settings, 'PHARMACY_INFO', {}) or {}
            pharmacy = {
                'name': settings_info.get('name', 'LizzyMike Pharmacy'),
                'address': settings_info.get('address', '') or 'Accra, Ghana',
                'phone': settings_info.get('phone', '') or '(000) 000-0000',
                'license': settings_info.get('license', '') or 'pharmacy authority',
            }

        tax_enabled = bool(getattr(sale, 'tax_enabled', False))
        tax_rate = Decimal(str(getattr(sale, 'tax_rate', 0) or 0))
        tax_amount = Decimal(str(getattr(sale, 'tax_amount', 0) or 0))
        if not tax_enabled:
            tax_rate = Decimal('0')
            tax_amount = Decimal('0.00')
        # Tax-inclusive: sale.subtotal is gross (prices include tax); total = subtotal − discount
        discount = Decimal(str(sale.discount_total or 0))
        subtotal = Decimal(str(sale.subtotal or 0)).quantize(Decimal('0.01'))
        if subtotal < 0:
            subtotal = Decimal('0.00')
        items = list(sale.items.all())
        items_display = [
            {
                'name': item.medication_name,
                'qty': item.qty,
                'line_total': (item.final_price or item.price) * item.qty,
            }
            for item in items
        ]
        receipt_code = str(sale.custom_id or sale.id)
        tax_percent = (
            int(tax_rate * 100) if tax_rate * 100 == int(tax_rate * 100) else float(tax_rate * 100)
        )
        return {
            'sale': sale,
            'items': items,
            'items_display': items_display,
            'date': sale.date.strftime("%B %d, %Y"),
            'pharmacy': pharmacy,
            'company': pharmacy,
            'cashier': cashier,
            'tax_enabled': tax_enabled,
            'tax_rate': tax_rate,
            'tax_percent': tax_percent,
            'tax_amount': tax_amount,
            'tax_name': getattr(sale, 'tax_name', '') or '',
            'discount_name': getattr(sale, 'discount_name', '') or '',
            'subtotal': subtotal,
            'barcode_svg': build_qr_svg(receipt_code),
            'qr_svg': build_qr_svg(receipt_code),
            'logo_svg': _receipt_logo_html(getattr(self, 'request', None)),
        }

    def get_pdf_styles(self):
        try:
            return [CSS(settings.BASE_DIR / 'static' / 'css' / 'pdf_base.css')]
        except Exception as exc:
            logger.warning("Could not load PDF CSS: %s", exc)
            return []

    def generate_pdf(self, context):
        html_string = render_to_string(self.template_name, context)
        if WEASYPRINT_AVAILABLE:
            try:
                html = HTML(string=html_string, base_url=self.request.build_absolute_uri())
                pdf_bytes = html.write_pdf(stylesheets=self.get_pdf_styles())
                if pdf_bytes and pdf_bytes.startswith(b'%PDF'):
                    return pdf_bytes, 'application/pdf'
            except Exception as exc:
                logger.error("WeasyPrint rendering error: %s", exc)
        # Fallback to HTML
        return html_string.encode('utf-8'), 'text/html'

    def _check_permission(self):
        """
        Raise PermissionDenied if the authenticated user lacks the required
        permission.  LoginRequiredMixin already handles the unauthenticated case.
        """
        if not self.request.user.has_perm(self.permission_required):
            raise PermissionDenied("You don't have permission to access this document.")

    def get(self, request, sale_id):
        self._check_permission()
        try:
            sale = self.get_object(sale_id)
            context = self.get_context_data(sale)
            content, content_type = self.generate_pdf(context)

            response = HttpResponse(content, content_type=content_type)
            filename = f"{self.filename_prefix}_{sale_id}.pdf"
            response['Content-Disposition'] = f'{self.content_disposition}; filename="{filename}"'
            return response

        except Http404:
            logger.warning("Sale %s not found when generating PDF.", sale_id)
            return HttpResponse("Sale not found.", status=404)
        except PermissionDenied as exc:
            logger.warning("Permission denied for PDF %s: %s", sale_id, exc)
            return HttpResponse(str(exc), status=403)
        except Exception as exc:
            logger.error("PDF generation error for sale %s: %s", sale_id, exc, exc_info=True)
            return HttpResponse("Error generating document.", status=500)


# ---------------------------------------------------------------------------
# Concrete document views
# ---------------------------------------------------------------------------

class InvoicePDFView(BasePDFView):
    template_name = 'core/invoices/invoice_advanced.html'
    filename_prefix = "invoice"
    content_disposition = "attachment"
    permission_required = 'core.view_sale'

    def get_pdf_styles(self):
        return super().get_pdf_styles() + [
            CSS(string='.invoice-header { border-bottom: 2px solid #333; margin-bottom: 20px; }')
        ]


class ReceiptPDFView(BasePDFView):
    template_name = 'core/invoices/receipt_simple.html'
    filename_prefix = "receipt"
    content_disposition = "inline"
    permission_required = 'core.view_sale'

    def get_pdf_styles(self):
        return super().get_pdf_styles() + [
            CSS(string='.receipt { font-size: 12pt; width: 80mm; } .receipt-header { text-align: center; }')
        ]
