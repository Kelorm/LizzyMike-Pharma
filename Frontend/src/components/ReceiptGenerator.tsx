import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Printer, Download, X } from 'lucide-react';
import { Sale, Customer } from '../types';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../utils/axios';
import ReceiptQR from './ReceiptQR';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const API_URL = API_BASE_URL || process.env.REACT_APP_API_URL || '';
/** LizzyMike brand logo; override with REACT_APP_RECEIPT_LOGO if needed. */
const CUSTOM_LOGO_URL = (process.env.REACT_APP_RECEIPT_LOGO || '').trim() || '/images/logo.png';

const DEFAULT_PHARMACY_NAME =
  process.env.REACT_APP_NAME || 'LizzyMike Pharmacy';
const DEFAULT_PHARMACY_ADDRESS =
  process.env.REACT_APP_PHARMACY_ADDRESS || '123 Healthcare Street, Accra';
const DEFAULT_PHARMACY_PHONE =
  process.env.REACT_APP_PHARMACY_PHONE || '(000) 000-0000';
const DEFAULT_PHARMACY_LICENSE =
  process.env.REACT_APP_PHARMACY_LICENSE || 'Licensed pharmacy';

interface ReceiptGeneratorProps {
  sale: Sale;
  customer?: Customer;
  onClose: () => void;
  autoPrint?: boolean;
  /** Cash tendered by customer (for change line). */
  cashTendered?: number;
}

const money = (amount: number) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 'GHS 0.00';
  return `GHS ${n.toFixed(2)}`;
};

const ReceiptGenerator: React.FC<ReceiptGeneratorProps> = ({
  sale,
  customer,
  onClose,
  autoPrint = false,
  cashTendered,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [autoPrinting, setAutoPrinting] = useState(autoPrint);
  const [logoFailed, setLogoFailed] = useState(false);
  const [pharmacyName, setPharmacyName] = useState(DEFAULT_PHARMACY_NAME);
  const [pharmacyAddress, setPharmacyAddress] = useState(DEFAULT_PHARMACY_ADDRESS);
  const [pharmacyPhone, setPharmacyPhone] = useState(DEFAULT_PHARMACY_PHONE);
  const [pharmacyLicense, setPharmacyLicense] = useState(DEFAULT_PHARMACY_LICENSE);
  const receiptRef = useRef<HTMLDivElement>(null);
  const didAutoPrint = useRef(false);

  const servedBy =
    sale.created_by_name ||
    user?.full_name ||
    user?.username ||
    '';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.pharmacy.get();
        const d = res.data as {
          name?: string;
          address?: string;
          phone?: string;
          license_no?: string;
        };
        if (cancelled) return;
        if (d.name) setPharmacyName(d.name);
        if (d.address) setPharmacyAddress(d.address);
        if (d.phone) setPharmacyPhone(d.phone);
        if (d.license_no) setPharmacyLicense(d.license_no);
      } catch {
        // keep env defaults
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const getTransactionId = useCallback(() => {
    if (sale.custom_id) return sale.custom_id;
    const d = new Date(sale.date || Date.now());
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const tail = String(sale.id || '').replace(/-/g, '').slice(-4).toUpperCase() || '0000';
    return `RX-${y}${m}${day}-${tail}`;
  }, [sale.custom_id, sale.date, sale.id]);

  const saleDate = new Date(sale.date || Date.now());
  const dateStr = saleDate.toLocaleDateString('en-GB');
  const timeStr = saleDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const discount = Number(sale.discount_total || 0);
  const discountLabel = sale.discount_name?.trim() || 'Discount';
  const displayTotal = Number(sale.total) || 0;
  const taxEnabled = Boolean(sale.tax_enabled) && Number(sale.tax_amount || 0) > 0;
  const taxAmount = taxEnabled ? Number(sale.tax_amount || 0) : 0;
  const taxPercent = taxEnabled
    ? Math.round(Number(sale.tax_rate || 0) * 10000) / 100
    : 0;
  const taxLabel = sale.tax_name?.trim() || 'Tax';
  // Tax-inclusive: show pre-discount gross; tax line is the embedded portion of the total
  const subtotalDisplay = Math.round(Number(sale.subtotal || displayTotal) * 100) / 100;
  const paymentLabel = String(sale.payment_method || 'cash')
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const isCash = String(sale.payment_method || '').toLowerCase().includes('cash');
  const tendered =
    cashTendered != null && Number.isFinite(cashTendered)
      ? Number(cashTendered)
      : isCash
        ? displayTotal
        : undefined;
  const change =
    tendered != null ? Math.max(0, Math.round((tendered - displayTotal) * 100) / 100) : undefined;

  const handlePrint = useCallback(() => {
    if (!receiptRef.current) {
      toast.error('Receipt not ready for printing.');
      return;
    }
    const transactionId = getTransactionId();
    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWindow) {
      toast.error('Print popup blocked. Allow popups or use Print manually.');
      return;
    }

    const sanitized = receiptRef.current.innerHTML
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/g, '');

    printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <base href="${window.location.origin}/" />
  <title>Receipt - ${transactionId}</title>
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #111;
      font-family: "Courier New", Courier, monospace;
      font-size: 12px;
      line-height: 1.35;
    }
    .ticket {
      width: 72mm;
      max-width: 100%;
      margin: 0 auto;
      padding: 4px 2px;
    }
    .left { text-align: left; }
                .receipt-qr svg { max-width: 120px; height: auto; display: inline-block; }
                .logo-wrap { text-align: center; margin-bottom: 8px; }
                .logo-wrap img, .logo-wrap svg { display: inline-block; max-width: 64px; height: auto; }
                .store-name { font-size: 15px; font-weight: 700; letter-spacing: 0.02em; text-align: center; }
    .muted { color: #222; }
    .title { font-weight: 700; margin-top: 10px; }
    .meta { margin-top: 2px; }
    .dash {
      border: none;
      border-top: 1px dashed #000;
      margin: 10px 0;
    }
    table.items { width: 100%; border-collapse: collapse; }
    table.items th, table.items td {
      padding: 2px 0;
      vertical-align: top;
      font-weight: 400;
    }
    table.items th { font-weight: 700; }
    .col-product { text-align: left; width: 55%; }
    .col-qty { text-align: center; width: 15%; }
    .col-total { text-align: right; width: 30%; }
    .totals { margin-top: 8px; }
    .totals .row { display: flex; justify-content: space-between; gap: 8px; }
    .totals .grand { font-weight: 700; margin-top: 4px; }
    .pay { margin-top: 10px; }
    .pay .row { display: flex; justify-content: space-between; gap: 8px; }
    .footer { margin-top: 12px; }
    .footer p { margin: 2px 0; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .logo-wrap img, .logo-wrap svg, .receipt-qr svg { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="ticket">${sanitized}</div>
  <script>
    window.onload = function () {
      setTimeout(function () {
        try {
          window.print();
          if (window.opener) {
            window.opener.postMessage({ type: 'print-success', transactionId: '${transactionId}' }, '*');
          }
          setTimeout(function () { window.close(); }, 800);
        } catch (e) {
          if (window.opener) {
            window.opener.postMessage({ type: 'print-error', error: String(e) }, '*');
          }
          alert('Print failed. Please try again.');
        }
      }, 300);
    };
  </script>
</body>
</html>`);
    printWindow.document.close();

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'print-success') {
        toast.success('Receipt sent to printer');
      } else if (event.data?.type === 'print-error') {
        toast.error('Print failed. Try Print again.');
      }
    };
    window.addEventListener('message', onMessage);
    setTimeout(() => window.removeEventListener('message', onMessage), 10000);
  }, [getTransactionId]);

  useEffect(() => {
    if (!autoPrint || didAutoPrint.current) return;
    const timer = setTimeout(() => {
      didAutoPrint.current = true;
      setAutoPrinting(true);
      handlePrint();
      setAutoPrinting(false);
    }, 900);
    return () => clearTimeout(timer);
  }, [autoPrint, handlePrint]);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const base = (API_URL || '').replace(/\/$/, '');
      const endpoint = base.includes('/api/v1')
        ? `${base}/receipt/${sale.id}/`
        : `${base}/api/v1/receipt/${sale.id}/`;
      const response = await fetch(endpoint, { credentials: 'include' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const isPdf = (response.headers.get('content-type') || '').includes('pdf');
      a.download = `receipt-${getTransactionId()}.${isPdf ? 'pdf' : 'html'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('Receipt downloaded');
    } catch {
      toast.error('Download failed — use Print instead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md max-h-[95vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Sales Receipt</h2>
            <p className="text-xs text-gray-500">#{getTransactionId()}</p>
            {autoPrinting && (
              <p className="text-xs text-amber-600 mt-0.5">Opening print dialog…</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 bg-[#f3f3f3] p-4">
          {/* Thermal ticket preview — this block is what gets printed */}
          <div
            ref={receiptRef}
            className="left"
            style={{
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: '12px',
              lineHeight: 1.35,
              color: '#111',
              background: '#fff',
              padding: '16px 14px',
              maxWidth: '320px',
              margin: '0 auto',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            <div className="logo-wrap" style={{ textAlign: 'center', marginBottom: '8px' }}>
              {!logoFailed ? (
                <img
                  src={CUSTOM_LOGO_URL}
                  alt={pharmacyName}
                  onError={() => setLogoFailed(true)}
                  style={{
                    width: 64,
                    height: 64,
                    objectFit: 'contain',
                    display: 'block',
                    margin: '0 auto',
                  }}
                />
              ) : null}
            </div>
            <div className="store-name" style={{ fontWeight: 700, fontSize: '15px', textAlign: 'center' }}>
              {pharmacyName.toUpperCase()}
            </div>
            <div className="muted" style={{ textAlign: 'center' }}>{pharmacyAddress}</div>
            <div className="muted" style={{ textAlign: 'center' }}>Phone: {pharmacyPhone}</div>

            <div className="title" style={{ fontWeight: 700, marginTop: '10px' }}>
              SALES RECEIPT
            </div>
            <div className="meta">#{getTransactionId()}</div>
            <div className="meta">
              DATE: {dateStr} | TIME: {timeStr}
            </div>
            {(customer?.name || sale.customer_name) && (
              <div className="meta">
                Customer: {customer?.name || sale.customer_name}
              </div>
            )}
            {servedBy && (
              <div className="meta">
                Served by: {servedBy}
              </div>
            )}

            <hr
              className="dash"
              style={{ border: 'none', borderTop: '1px dashed #000', margin: '10px 0' }}
            />

            <table className="items" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th className="col-product" style={{ textAlign: 'left', fontWeight: 700 }}>
                    Product
                  </th>
                  <th className="col-qty" style={{ textAlign: 'center', fontWeight: 700 }}>
                    Qty
                  </th>
                  <th className="col-total" style={{ textAlign: 'right', fontWeight: 700 }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {(sale.items || []).map((item, index) => (
                  <tr key={index}>
                    <td className="col-product" style={{ textAlign: 'left', padding: '2px 0' }}>
                      {item.medication_name || 'Item'}
                    </td>
                    <td className="col-qty" style={{ textAlign: 'center', padding: '2px 0' }}>
                      {item.qty}
                    </td>
                    <td className="col-total" style={{ textAlign: 'right', padding: '2px 0' }}>
                      {money(Number(item.price) * Number(item.qty))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <hr
              className="dash"
              style={{ border: 'none', borderTop: '1px dashed #000', margin: '10px 0' }}
            />

            <div className="totals">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span>{money(subtotalDisplay)}</span>
              </div>
              {discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{discountLabel}:</span>
                  <span>-{money(discount)}</span>
                </div>
              )}
              {taxEnabled && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>
                    {taxLabel} ({taxPercent}% incl.):
                  </span>
                  <span>{money(taxAmount)}</span>
                </div>
              )}
              <div
                className="grand"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 700,
                  marginTop: '4px',
                }}
              >
                <span>TOTAL AMOUNT:</span>
                <span>{money(displayTotal)}</span>
              </div>
            </div>

            <div className="pay" style={{ marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Payment Method:</span>
                <span>{paymentLabel}</span>
              </div>
              {isCash && tendered != null && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Cash Given:</span>
                    <span>{money(tendered)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Change:</span>
                    <span>{money(change || 0)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="footer" style={{ marginTop: '12px' }}>
              <p style={{ margin: '2px 0' }}>* Store licensed by {pharmacyLicense}</p>
              <p style={{ margin: '2px 0' }}>* All medicines are final sale.</p>
            </div>

            <ReceiptQR value={getTransactionId()} size={112} />
            <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '4px' }}>
              {getTransactionId()}
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-gray-200 bg-white flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
          >
            <Printer className="h-4 w-4" />
            {autoPrinting ? 'Printing…' : 'Print Receipt'}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-medium"
          >
            <Download className="h-4 w-4" />
            {loading ? 'Downloading…' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptGenerator;
