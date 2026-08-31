import React, { useEffect, useState } from 'react';
import { TrendingUp, Package, DollarSign, Calendar, BarChart3, X } from 'lucide-react';
import { Restock } from '../../types';
import api from '../../services/api';

interface RestockAnalyticsProps {
  onClose: () => void;
}

type AnalyticsPayload = {
  total_restocks: number;
  total_quantity: number;
  total_value: number;
  average_cost: number;
  top_suppliers: Array<{ supplier: string; total_quantity: number; total_value: string }>;
  top_medications: Array<{ medication_name: string; total_quantity: number; total_value: string }>;
  monthly_trend: Array<{ month: string; total_value: string; total_quantity: number }>;
};

const RestockAnalytics = ({ onClose }: RestockAnalyticsProps) => {
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [recent, setRecent] = useState<Restock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [analyticsRes, listRes] = await Promise.all([
          api.restock.analytics(),
          api.restock.list(),
        ]);
        setAnalytics(analyticsRes.data);
        const rows = Array.isArray(listRes.data) ? listRes.data : listRes.data.results || [];
        setRecent(rows.slice(0, 5));
      } catch {
        setAnalytics(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-center">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <p className="text-gray-600">Unable to load analytics.</p>
          <button type="button" onClick={onClose} className="mt-4 px-4 py-2 bg-gray-200 rounded-lg">
            Close
          </button>
        </div>
      </div>
    );
  }

  const monthlyData = (analytics.monthly_trend || []).map((row) => ({
    month: row.month ? new Date(row.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—',
    value: Number(row.total_value || 0),
  }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-purple-600 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <BarChart3 className="mr-3" size={24} />
              <h2 className="text-2xl font-bold">Restock Analytics</h2>
            </div>
            <button type="button" onClick={onClose} className="text-white hover:text-purple-200">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg border">
              <div className="flex items-center">
                <Package className="text-blue-600 mr-2" size={20} />
                <div>
                  <p className="text-sm text-gray-600">Total Restocks</p>
                  <p className="text-2xl font-bold">{analytics.total_restocks}</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border">
              <div className="flex items-center">
                <TrendingUp className="text-green-600 mr-2" size={20} />
                <div>
                  <p className="text-sm text-gray-600">Total Quantity</p>
                  <p className="text-2xl font-bold">{analytics.total_quantity}</p>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border">
              <div className="flex items-center">
                <DollarSign className="text-purple-600 mr-2" size={20} />
                <div>
                  <p className="text-sm text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold">GHS {analytics.total_value.toFixed(2)}</p>
                </div>
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border">
              <div className="flex items-center">
                <Calendar className="text-orange-600 mr-2" size={20} />
                <div>
                  <p className="text-sm text-gray-600">Avg. Cost</p>
                  <p className="text-2xl font-bold">GHS {analytics.average_cost.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Top Suppliers</h3>
              <div className="space-y-3">
                {analytics.top_suppliers.map((row, index) => (
                  <div key={row.supplier} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                        {index + 1}
                      </span>
                      <span className="font-medium">{row.supplier}</span>
                    </div>
                    <span className="text-gray-600">{row.total_quantity} units</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Most Restocked Medications</h3>
              <div className="space-y-3">
                {analytics.top_medications.map((row, index) => (
                  <div key={row.medication_name} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                        {index + 1}
                      </span>
                      <span className="font-medium">{row.medication_name}</span>
                    </div>
                    <span className="text-gray-600">{row.total_quantity} units</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {monthlyData.length > 0 && (
            <div className="mt-6 bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Monthly Restock Value Trend</h3>
              <div className="flex items-end space-x-2 h-32">
                {monthlyData.map((data, index) => {
                  const maxValue = Math.max(...monthlyData.map((d) => d.value), 1);
                  const height = (data.value / maxValue) * 100;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div className="w-full bg-purple-500 rounded-t" style={{ height: `${height}%` }} />
                      <span className="text-xs text-gray-500 mt-2">{data.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-6 bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Recent Restocks</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Medication</th>
                    <th className="text-left p-2 font-medium">Supplier</th>
                    <th className="text-left p-2 font-medium">Quantity</th>
                    <th className="text-left p-2 font-medium">Cost</th>
                    <th className="text-left p-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((restock) => (
                    <tr key={restock.id} className="border-b">
                      <td className="p-2">{restock.medication_name}</td>
                      <td className="p-2">{restock.supplier}</td>
                      <td className="p-2">{restock.quantity}</td>
                      <td className="p-2">GHS {Number(restock.total_cost).toFixed(2)}</td>
                      <td className="p-2 text-sm text-gray-600">
                        {new Date(restock.date_restocked).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestockAnalytics;
