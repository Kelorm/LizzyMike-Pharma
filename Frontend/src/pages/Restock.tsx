import React, { useCallback, useEffect, useState } from 'react';
import { Package, Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { Restock } from '../types';
import RestockForm from '../components/Restock/RestockForm';
import { usePermissions } from '../hooks/usePermissions';

interface RestockPageProps {
  onRefresh?: () => void | Promise<void>;
}

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown }).results)) {
    return (data as { results: T[] }).results;
  }
  return [];
}

const RestockPage: React.FC<RestockPageProps> = ({ onRefresh }) => {
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('create_restock');
  const canEdit = hasPermission('edit_restock');
  const canDelete = hasPermission('delete_restock');

  const [restocks, setRestocks] = useState<Restock[]>([]);
  const [loading, setLoading] = useState(true);
  const [supplierFilter, setSupplierFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Restock | null>(null);
  const [analytics, setAnalytics] = useState<{
    total_restocks?: number;
    total_quantity?: number;
    total_value?: number;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (supplierFilter) params.supplier = supplierFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const [listRes, analyticsRes] = await Promise.all([
        api.restock.list(params),
        api.restock.analytics(),
      ]);
      setRestocks(unwrapList<Restock>(listRes.data));
      setAnalytics(analyticsRes.data);
    } catch {
      toast.error('Failed to load restocks');
    } finally {
      setLoading(false);
    }
  }, [supplierFilter, startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (row: Restock) => {
    if (!window.confirm(`Delete restock for ${row.medication_name}? Stock will be reversed.`)) return;
    try {
      await api.restock.delete(row.id);
      toast.success('Restock deleted');
      await load();
      await onRefresh?.();
    } catch {
      toast.error('Failed to delete restock');
    }
  };

  const handleEditSave = async () => {
    if (!editing) return;
    try {
      await api.restock.update(editing.id, {
        quantity: editing.quantity,
        unit_cost: editing.unit_cost,
        supplier: editing.supplier,
        batch_number: editing.batch_number,
        expiry_date: editing.expiry_date,
        notes: editing.notes,
      });
      toast.success('Restock updated');
      setEditing(null);
      await load();
      await onRefresh?.();
    } catch {
      toast.error('Failed to update restock');
    }
  };

  const handleCreated = async () => {
    setShowForm(false);
    await load();
    await onRefresh?.();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="text-green-600" />
            Restock Management
          </h1>
          <p className="text-sm text-gray-600 mt-1">Track shipments, batches, and inventory replenishment</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => load()}
            className="inline-flex items-center px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
          >
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </button>
          {canCreate && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Plus size={16} className="mr-2" />
              New Restock
            </button>
          )}
        </div>
      </div>

      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border rounded-lg p-4">
            <p className="text-sm text-gray-600">Total restocks</p>
            <p className="text-2xl font-bold">{analytics.total_restocks ?? 0}</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-sm text-gray-600">Total quantity</p>
            <p className="text-2xl font-bold">{analytics.total_quantity ?? 0}</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-sm text-gray-600">Total value</p>
            <p className="text-2xl font-bold">GHS {Number(analytics.total_value || 0).toFixed(2)}</p>
          </div>
        </div>
      )}

      <div className="bg-white border rounded-lg p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          type="text"
          placeholder="Filter supplier"
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => load()}
          className="border rounded-lg px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100"
        >
          Apply filters
        </button>
      </div>

      <div className="bg-white border rounded-lg overflow-x-auto">
        {loading ? (
          <p className="p-6 text-gray-500">Loading…</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medication</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                {(canEdit || canDelete) && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {restocks.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-sm font-medium">{row.medication_name}</td>
                  <td className="px-4 py-3 text-sm">{row.supplier}</td>
                  <td className="px-4 py-3 text-sm">{row.quantity}</td>
                  <td className="px-4 py-3 text-sm font-mono">{row.batch_number}</td>
                  <td className="px-4 py-3 text-sm">{new Date(row.expiry_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm">GHS {Number(row.total_cost).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm">{new Date(row.date_restocked).toLocaleDateString()}</td>
                  {(canEdit || canDelete) && (
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => setEditing({ ...row })}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(row)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {restocks.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No restock records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <RestockForm onClose={() => setShowForm(false)} onRestockSuccess={handleCreated} />
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold">Edit Restock — {editing.medication_name}</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Quantity</label>
              <input
                type="number"
                min={1}
                value={editing.quantity}
                onChange={(e) => setEditing({ ...editing, quantity: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Unit cost</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={editing.unit_cost}
                onChange={(e) => setEditing({ ...editing, unit_cost: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Supplier</label>
              <input
                type="text"
                value={editing.supplier}
                onChange={(e) => setEditing({ ...editing, supplier: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 border rounded-lg">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestockPage;
