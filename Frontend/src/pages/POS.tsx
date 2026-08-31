import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  Shield,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Medication, Customer, Sale, SaleItem } from '../types';
import { useMedicationContext } from '../contexts/MedicationContext';
import { useCustomerContext } from '../contexts/CustomerContext';
import { useSalesContext } from '../contexts/SalesContext';
import { useAuth } from '../contexts/AuthContext';
import { hasPermission } from '../utils/permissions';
import ReceiptGenerator from '../components/ReceiptGenerator';
import BusinessDayPanel from '../components/BusinessDayPanel';

type PaymentMethod = 'cash' | 'card' | 'mobile_money' | 'insurance' | 'insurance-copay';

interface CartLine {
  medicationId: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  qty: number;
}

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { id: 'cash', label: 'Cash', icon: <Banknote className="h-4 w-4" /> },
  { id: 'card', label: 'Card', icon: <CreditCard className="h-4 w-4" /> },
  { id: 'mobile_money', label: 'Mobile Money', icon: <Smartphone className="h-4 w-4" /> },
  { id: 'insurance', label: 'Insurance', icon: <Shield className="h-4 w-4" /> },
  { id: 'insurance-copay', label: 'Copay', icon: <Shield className="h-4 w-4" /> },
];

const formatMoney = (value: number) =>
  `GHS ${Number.isFinite(value) ? value.toFixed(2) : '0.00'}`;

const POS: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreateSale = hasPermission(user?.role, 'create_sale');
  const { medications, loading: medsLoading, error: medsError, fetchMedications } = useMedicationContext();
  const { customers } = useCustomerContext();
  const { addSale } = useSalesContext();

  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerQuery, setCustomerQuery] = useState('');
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [cashTendered, setCashTendered] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [receiptCustomer, setReceiptCustomer] = useState<Customer | null>(null);
  const [receiptCashTendered, setReceiptCashTendered] = useState<number | undefined>(undefined);
  const [includeOutOfStock, setIncludeOutOfStock] = useState(false);
  const [dayIsOpen, setDayIsOpen] = useState(false);
  const canSellNow = canCreateSale && dayIsOpen;

  // Always refresh when opening POS (inventory may have changed)
  useEffect(() => {
    fetchMedications();
  }, [fetchMedications]);

  const catalog = useMemo(() => {
    const list = Array.isArray(medications) ? medications : [];
    if (includeOutOfStock) return list;
    return list.filter((m) => Number(m.stock) > 0);
  }, [medications, includeOutOfStock]);

  const filteredMeds = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = !q
      ? catalog
      : catalog.filter(
          (m) =>
            (m.name || '').toLowerCase().includes(q) ||
            (m.category || '').toLowerCase().includes(q) ||
            (m.classification || '').toLowerCase().includes(q) ||
            (m.batch_no || '').toLowerCase().includes(q)
        );
    return matched.slice(0, 60);
  }, [query, catalog]);

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return customers.slice(0, 8);
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone || '').includes(q) ||
          (c.insurance || '').toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [customerQuery, customers]);

  const subtotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.price * line.qty, 0),
    [cart]
  );

  const addToCart = (med: Medication) => {
    const price = parseFloat(String(med.price)) || 0;
    const cost = parseFloat(String(med.cost)) || 0;
    const stock = Number(med.stock) || 0;
    if (stock < 1) {
      toast.error(`${med.name} is out of stock`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((l) => l.medicationId === med.id);
      if (existing) {
        if (existing.qty >= stock) {
          toast.error(`Only ${stock} in stock`);
          return prev;
        }
        return prev.map((l) =>
          l.medicationId === med.id ? { ...l, qty: l.qty + 1 } : l
        );
      }
      return [
        ...prev,
        {
          medicationId: med.id,
          name: med.name,
          price,
          cost,
          stock,
          qty: 1,
        },
      ];
    });
    setQuery('');
    searchRef.current?.focus();
  };

  const updateQty = (medicationId: string, qty: number) => {
    setCart((prev) =>
      prev
        .map((line) => {
          if (line.medicationId !== medicationId) return line;
          const next = Math.max(1, Math.min(line.stock, Math.floor(qty) || 1));
          return { ...line, qty: next };
        })
        .filter(Boolean)
    );
  };

  const removeLine = (medicationId: string) => {
    setCart((prev) => prev.filter((l) => l.medicationId !== medicationId));
  };

  const clearCart = () => {
    setCart([]);
    setNotes('');
    setCashTendered('');
    setCustomer(null);
    setCustomerQuery('');
    setPaymentMethod('cash');
  };

  const handleCompleteSale = async () => {
    if (!canCreateSale) {
      toast.error('You do not have permission to complete sales');
      return;
    }
    if (!dayIsOpen) {
      toast.error('Trading day is closed. Ask an admin to open the day.');
      return;
    }
    if (cart.length === 0) {
      toast.error('Add at least one medication');
      return;
    }

    setSubmitting(true);
    try {
      const items: SaleItem[] = cart.map((line) => ({
        id: '',
        sale: '',
        medication: line.medicationId,
        medication_name: line.name,
        qty: line.qty,
        price: line.price,
        cost: line.cost,
      }));

      const saleData = {
        customer: customer?.id || null,
        customer_name: customer?.name || 'Walk-in Customer',
        date: new Date().toISOString(),
        total: subtotal,
        subtotal,
        discount_total: 0,
        payment_method: paymentMethod,
        notes,
        items,
      };

      const saleCustomer = customer;
      const tenderedValue =
        paymentMethod === 'cash' && cashTendered.trim() !== ''
          ? parseFloat(cashTendered)
          : paymentMethod === 'cash'
            ? subtotal
            : undefined;
      if (
        paymentMethod === 'cash' &&
        tenderedValue != null &&
        Number.isFinite(tenderedValue) &&
        tenderedValue < subtotal
      ) {
        toast.error('Cash given is less than the total');
        setSubmitting(false);
        return;
      }

      const newSale = await addSale(saleData as Omit<Sale, 'id' | 'total_cost' | 'profit'>);
      toast.success('Sale completed');
      setReceiptCustomer(saleCustomer);
      setReceiptCashTendered(
        tenderedValue != null && Number.isFinite(tenderedValue) ? tenderedValue : undefined
      );
      setCompletedSale(newSale);
      clearCart();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to complete sale');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceiptClose = () => {
    setCompletedSale(null);
    setReceiptCustomer(null);
    setReceiptCashTendered(undefined);
    searchRef.current?.focus();
  };

  return (
    <div className="h-full min-h-[calc(100vh-6rem)] flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Point of Sale</h1>
          <p className="text-sm text-gray-500">Search medicines, build the cart, complete &amp; print.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/sales')}
          className="text-sm text-blue-700 hover:text-blue-900 self-start"
        >
          View sales reports →
        </button>
      </div>

      {!dayIsOpen && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Day is closed — wait for an admin to open the trading day before completing sales.
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <BusinessDayPanel compact onStatusChange={setDayIsOpen} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 flex-1 min-h-0">
        {/* Catalog */}
        <section className="xl:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col min-h-[28rem]">
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={searchRef}
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredMeds[0] && Number(filteredMeds[0].stock) > 0) {
                    e.preventDefault();
                    addToCart(filteredMeds[0]);
                  }
                }}
                placeholder="Search by name, category, or batch…"
                className="w-full pl-10 pr-12 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
              />
              <button
                type="button"
                title="Refresh inventory"
                onClick={() => fetchMedications()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50"
              >
                <RefreshCw className={`h-4 w-4 ${medsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
              <span>
                {medications.length} in inventory
                {!includeOutOfStock ? ` · ${catalog.length} in stock` : ''}
              </span>
              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeOutOfStock}
                  onChange={(e) => setIncludeOutOfStock(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Show out of stock
              </label>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 content-start">
            {medsLoading && medications.length === 0 ? (
              <div className="col-span-full flex items-center justify-center gap-2 text-gray-500 py-12 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading medicines…
              </div>
            ) : medsError && medications.length === 0 ? (
              <div className="col-span-full text-center py-12 text-sm space-y-2">
                <p className="text-red-600">{medsError}</p>
                <button
                  type="button"
                  onClick={() => fetchMedications()}
                  className="text-blue-700 hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : filteredMeds.length === 0 ? (
              <div className="col-span-full text-center text-gray-500 py-12 text-sm space-y-1">
                <p>
                  {medications.length === 0
                    ? 'No medicines in inventory yet.'
                    : query.trim()
                      ? 'No medicines match your search.'
                      : 'No in-stock medicines. Enable “Show out of stock” or restock inventory.'}
                </p>
                {medications.length === 0 && (
                  <button
                    type="button"
                    onClick={() => navigate('/inventory')}
                    className="text-blue-700 hover:underline"
                  >
                    Go to Inventory
                  </button>
                )}
              </div>
            ) : (
              filteredMeds.map((med) => {
                const stock = Number(med.stock) || 0;
                const out = stock <= 0;
                return (
                  <button
                    key={med.id}
                    type="button"
                    disabled={out}
                    onClick={() => addToCart(med)}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      out
                        ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                        : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                    }`}
                  >
                    <div className="font-medium text-gray-900 text-sm">{med.name}</div>
                    <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                      <span>{med.category || 'Uncategorized'}</span>
                      <span className="font-semibold text-green-700">
                        {formatMoney(parseFloat(String(med.price)) || 0)}
                      </span>
                    </div>
                    <div className={`mt-1 text-xs ${out ? 'text-red-500' : 'text-gray-400'}`}>
                      Stock: {stock}{out ? ' (out of stock)' : ''}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* Cart / checkout */}
        <section className="xl:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col min-h-[28rem]">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-gray-900">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              Cart
              <span className="text-xs font-normal text-gray-500">({cart.length} items)</span>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Clear
              </button>
            )}
          </div>

          <div className="p-4 border-b border-gray-100 space-y-2">
            <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> Customer
            </label>
            {customer ? (
              <div className="flex items-center justify-between gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{customer.name}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {[customer.phone, customer.insurance].filter(Boolean).join(' · ') || 'Registered customer'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCustomer(null);
                    setCustomerQuery('');
                  }}
                  className="text-xs text-blue-700 hover:underline shrink-0"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  value={customerQuery}
                  onChange={(e) => {
                    setCustomerQuery(e.target.value);
                    setShowCustomerResults(true);
                  }}
                  onFocus={() => setShowCustomerResults(true)}
                  placeholder="Search customer or leave as walk-in"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
                {showCustomerResults && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100"
                      onClick={() => {
                        setCustomer(null);
                        setCustomerQuery('');
                        setShowCustomerResults(false);
                      }}
                    >
                      <span className="font-medium">Walk-in Customer</span>
                      <span className="block text-xs text-gray-500">No account required</span>
                    </button>
                    {filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                        onClick={() => {
                          setCustomer(c);
                          setCustomerQuery('');
                          setShowCustomerResults(false);
                        }}
                      >
                        <span className="font-medium">{c.name}</span>
                        <span className="block text-xs text-gray-500">
                          {[c.phone, c.insurance].filter(Boolean).join(' · ')}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="h-full min-h-[8rem] flex items-center justify-center text-sm text-gray-400 text-center px-6">
                Tap a medication on the left to add it to the cart.
              </div>
            ) : (
              cart.map((line) => (
                <div
                  key={line.medicationId}
                  className="rounded-lg border border-gray-200 p-3 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{line.name}</div>
                      <div className="text-xs text-gray-500">{formatMoney(line.price)} each</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(line.medicationId)}
                      className="text-gray-400 hover:text-red-600 p-1"
                      aria-label={`Remove ${line.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center rounded-md border border-gray-200">
                      <button
                        type="button"
                        className="p-1.5 hover:bg-gray-50"
                        onClick={() => updateQty(line.medicationId, line.qty - 1)}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={line.stock}
                        value={line.qty}
                        onChange={(e) => updateQty(line.medicationId, Number(e.target.value))}
                        className="w-12 text-center text-sm border-x border-gray-200 py-1 outline-none"
                      />
                      <button
                        type="button"
                        className="p-1.5 hover:bg-gray-50"
                        onClick={() => updateQty(line.medicationId, line.qty + 1)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {formatMoney(line.price * line.qty)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-gray-100 space-y-3 bg-gray-50 rounded-b-xl">
            <div>
              <div className="text-xs font-medium text-gray-600 mb-2">Payment</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PAYMENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPaymentMethod(opt.id)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium border transition-colors ${
                      paymentMethod === opt.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            {paymentMethod === 'cash' && (
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Cash given
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  placeholder={subtotal > 0 ? subtotal.toFixed(2) : '0.00'}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                {cashTendered.trim() !== '' && Number.isFinite(parseFloat(cashTendered)) && (
                  <p className="text-xs text-gray-500 mt-1">
                    Change: {formatMoney(Math.max(0, parseFloat(cashTendered) - subtotal))}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Total</span>
              <span className="text-xl font-bold text-gray-900">{formatMoney(subtotal)}</span>
            </div>

            <button
              type="button"
              disabled={submitting || cart.length === 0 || !canSellNow}
              onClick={handleCompleteSale}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Completing…
                </>
              ) : !canCreateSale ? (
                'No permission to sell'
              ) : !dayIsOpen ? (
                'Trading day closed'
              ) : (
                'Complete Sale & Print Receipt'
              )}
            </button>
          </div>
        </section>
      </div>

      {completedSale && (
        <ReceiptGenerator
          sale={completedSale}
          customer={receiptCustomer || undefined}
          cashTendered={receiptCashTendered}
          autoPrint
          onClose={handleReceiptClose}
        />
      )}
    </div>
  );
};

export default POS;
