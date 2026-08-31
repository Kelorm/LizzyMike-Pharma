import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

interface MovementRow {
  id: string;
  created_at: string;
  medication_name?: string;
  movement_type: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  created_by_name?: string;
}

const StockMovementsPage: React.FC = () => {
  const [rows, setRows] = useState<MovementRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.stockMovement.list();
        const data = res.data?.results ?? res.data ?? [];
        setRows(Array.isArray(data) ? data : []);
      } catch {
        toast.error('Failed to load stock movements');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="p-6 text-gray-600">Loading stock movements…</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Stock Movements</h1>
      <p className="text-sm text-gray-600 mb-6">Inventory ledger for sales, restocks, and adjustments.</p>
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Medication</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Qty</th>
              <th className="px-4 py-3 font-medium">Before</th>
              <th className="px-4 py-3 font-medium">After</th>
              <th className="px-4 py-3 font-medium">By</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No movements recorded.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(row.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">{row.medication_name || '—'}</td>
                  <td className="px-4 py-3">{row.movement_type}</td>
                  <td className="px-4 py-3">{row.quantity}</td>
                  <td className="px-4 py-3">{row.previous_stock}</td>
                  <td className="px-4 py-3">{row.new_stock}</td>
                  <td className="px-4 py-3">{row.created_by_name || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StockMovementsPage;
