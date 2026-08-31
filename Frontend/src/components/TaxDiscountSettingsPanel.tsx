import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Percent, Tag } from 'lucide-react';
import api from '../services/api';
import { useBranch } from '../contexts/BranchContext';

type RateRow = {
  id: string;
  name: string;
  rate: string | number;
  is_active: boolean;
};

function unwrapList(data: unknown): RateRow[] {
  if (Array.isArray(data)) return data as RateRow[];
  if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown }).results)) {
    return (data as { results: RateRow[] }).results;
  }
  return [];
}

function toFraction(percent: string): string {
  const pct = Number(percent);
  return (pct / 100).toFixed(4);
}

function toPercentLabel(rate: string | number): string {
  return String(Math.round(Number(rate || 0) * 10000) / 100);
}

const RateCatalogSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  rows: RateRow[];
  onCreate: (name: string, percent: string) => Promise<void>;
  onToggle: (row: RateRow) => Promise<void>;
}> = ({ title, icon, rows, onCreate, onToggle }) => {
  const [name, setName] = useState('');
  const [percent, setPercent] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    const pct = Number(percent);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      toast.error('Rate must be between 0 and 100');
      return;
    }
    setSaving(true);
    try {
      await onCreate(name.trim(), percent);
      setName('');
      setPercent('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2">
        {icon}
        <h4 className="font-semibold text-gray-900">{title}</h4>
      </div>
      <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="number"
          min={0}
          max={100}
          step={0.01}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          placeholder="%"
          value={percent}
          onChange={(e) => setPercent(e.target.value)}
        />
        <button
          type="submit"
          disabled={saving}
          className="px-3 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-md disabled:opacity-60"
        >
          {saving ? 'Adding…' : 'Add'}
        </button>
      </form>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-2 py-1.5">Name</th>
              <th className="px-2 py-1.5">Rate</th>
              <th className="px-2 py-1.5">Status</th>
              <th className="px-2 py-1.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-gray-100">
                <td className="px-2 py-1.5">{row.name}</td>
                <td className="px-2 py-1.5">{toPercentLabel(row.rate)}%</td>
                <td className="px-2 py-1.5">{row.is_active ? 'Active' : 'Inactive'}</td>
                <td className="px-2 py-1.5">
                  <button
                    type="button"
                    className="text-gray-700 hover:underline"
                    onClick={() => onToggle(row)}
                  >
                    {row.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-2 py-3 text-gray-500 text-center">
                  None yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const TaxDiscountSettingsPanel: React.FC = () => {
  const { activeBranch, refreshBranches } = useBranch();
  const [loading, setLoading] = useState(true);
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [taxes, setTaxes] = useState<RateRow[]>([]);
  const [discounts, setDiscounts] = useState<RateRow[]>([]);
  const [defaultTaxId, setDefaultTaxId] = useState('');
  const [defaultDiscountId, setDefaultDiscountId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [taxRes, discRes, profileRes] = await Promise.all([
        api.taxRate.list(),
        api.discountRate.list(),
        api.pharmacy.get(),
      ]);
      setTaxes(unwrapList(taxRes.data));
      setDiscounts(unwrapList(discRes.data));
      const p = profileRes.data as {
        default_tax?: { id?: string } | null;
        default_discount?: { id?: string } | null;
      };
      setDefaultTaxId(p.default_tax?.id ? String(p.default_tax.id) : '');
      setDefaultDiscountId(p.default_discount?.id ? String(p.default_discount.id) : '');
    } catch {
      toast.error('Failed to load tax & discount settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onBranch = () => load();
    window.addEventListener('branch-changed', onBranch);
    return () => window.removeEventListener('branch-changed', onBranch);
  }, [load]);

  const createTax = async (name: string, percent: string) => {
    try {
      await api.taxRate.create({
        name,
        rate: toFraction(percent),
        is_active: true,
      });
      toast.success('Tax rate added');
      await load();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      toast.error(
        typeof data?.detail === 'string'
          ? data.detail
          : data
            ? Object.values(data).flat().join(' ')
            : 'Could not add tax'
      );
      throw err;
    }
  };

  const createDiscount = async (name: string, percent: string) => {
    try {
      await api.discountRate.create({
        name,
        rate: toFraction(percent),
        is_active: true,
      });
      toast.success('Discount added');
      await load();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      toast.error(
        typeof data?.detail === 'string'
          ? data.detail
          : data
            ? Object.values(data).flat().join(' ')
            : 'Could not add discount'
      );
      throw err;
    }
  };

  const toggleTax = async (row: RateRow) => {
    try {
      await api.taxRate.update(row.id, { is_active: !row.is_active });
      toast.success(row.is_active ? 'Tax deactivated' : 'Tax activated');
      await load();
    } catch {
      toast.error('Update failed');
    }
  };

  const toggleDiscount = async (row: RateRow) => {
    try {
      await api.discountRate.update(row.id, { is_active: !row.is_active });
      toast.success(row.is_active ? 'Discount deactivated' : 'Discount activated');
      await load();
    } catch {
      toast.error('Update failed');
    }
  };

  const saveDefaults = async () => {
    setSavingDefaults(true);
    try {
      await api.pharmacy.patch({
        default_tax_id: defaultTaxId || null,
        default_discount_id: defaultDiscountId || null,
      });
      toast.success(
        activeBranch
          ? `Defaults saved for ${activeBranch.code}`
          : 'Defaults saved'
      );
      await refreshBranches();
      await load();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      toast.error(
        typeof data?.detail === 'string'
          ? data.detail
          : data
            ? Object.values(data).flat().join(' ')
            : 'Failed to save defaults'
      );
    } finally {
      setSavingDefaults(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Loading tax & discount settings…</p>;
  }

  const activeTaxes = taxes.filter((t) => t.is_active);
  const activeDiscounts = discounts.filter((d) => d.is_active);

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Create named tax and discount rates, then choose which ones apply by default for the
        active branch. New sales use those defaults automatically.
      </p>
      {activeBranch && (
        <p className="text-sm font-medium text-gray-800">
          Active branch: {activeBranch.code} — {activeBranch.name}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RateCatalogSection
          title="Tax rates"
          icon={<Percent className="h-4 w-4 text-emerald-700" />}
          rows={taxes}
          onCreate={createTax}
          onToggle={toggleTax}
        />
        <RateCatalogSection
          title="Discounts"
          icon={<Tag className="h-4 w-4 text-amber-700" />}
          rows={discounts}
          onCreate={createDiscount}
          onToggle={toggleDiscount}
        />
      </div>

      <div className="border border-gray-200 rounded-lg p-4 space-y-3">
        <h4 className="font-semibold text-gray-900">Active branch defaults</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Default tax</label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={defaultTaxId}
              onChange={(e) => setDefaultTaxId(e.target.value)}
            >
              <option value="">None (no tax)</option>
              {activeTaxes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({toPercentLabel(t.rate)}%)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Default discount
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={defaultDiscountId}
              onChange={(e) => setDefaultDiscountId(e.target.value)}
            >
              <option value="">None (no auto discount)</option>
              {activeDiscounts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({toPercentLabel(d.rate)}%)
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="button"
          disabled={savingDefaults}
          onClick={saveDefaults}
          className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-md disabled:opacity-60"
        >
          {savingDefaults ? 'Saving…' : 'Save branch defaults'}
        </button>
      </div>
    </div>
  );
};

export default TaxDiscountSettingsPanel;
