import React, { useState, useEffect } from 'react';
import { TrendingUp, Package, DollarSign, Calendar, BarChart3, X } from 'lucide-react';
import { Restock } from '../../types';

interface RestockAnalyticsProps {
  onClose: () => void;
}

const RestockAnalytics = ({ onClose }: RestockAnalyticsProps) => {
  const [restocks, setRestocks] = useState<Restock[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    fetchRestocks();
  }, []);

  const fetchRestocks = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/restocks/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRestocks(data.results || data);
      }
    } catch (error) {
      console.error('Failed to fetch restocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    return { startDate, endDate: now };
  };

  const filteredRestocks = restocks.filter(restock => {
    const restockDate = new Date(restock.date_restocked);
    const { startDate, endDate } = getDateRange();
    return restockDate >= startDate && restockDate <= endDate;
  });

  const analytics = {
    totalRestocks: filteredRestocks.length,
    totalQuantity: filteredRestocks.reduce((sum, r) => sum + parseInt(r.quantity), 0),
    totalValue: filteredRestocks.reduce((sum, r) => sum + parseFloat(r.total_cost), 0),
    averageCost: filteredRestocks.length > 0 
      ? filteredRestocks.reduce((sum, r) => sum + parseFloat(r.total_cost), 0) / filteredRestocks.length 
      : 0,
    topSuppliers: Object.entries(
      filteredRestocks.reduce((acc, r) => {
        acc[r.supplier] = (acc[r.supplier] || 0) + parseInt(r.quantity);
        return acc;
      }, {} as Record<string, number>)
    ).sort(([,a], [,b]) => b - a).slice(0, 5),
    topMedications: Object.entries(
      filteredRestocks.reduce((acc, r) => {
        acc[r.medication_name] = (acc[r.medication_name] || 0) + parseInt(r.quantity);
        return acc;
      }, {} as Record<string, number>)
    ).sort(([,a], [,b]) => b - a).slice(0, 5)
  };

  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthKey = date.toISOString().slice(0, 7);
    
    const monthRestocks = restocks.filter(r => 
      r.date_restocked.startsWith(monthKey)
    );
    
    return {
      month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      value: monthRestocks.reduce((sum, r) => sum + parseFloat(r.total_cost), 0)
    };
  }).reverse();

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-center">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-purple-600 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <BarChart3 className="mr-3" size={24} />
              <h2 className="text-2xl font-bold">Restock Analytics</h2>
            </div>
            <button onClick={onClose} className="text-white hover:text-purple-200">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Time Range Filter */}
        <div className="p-6 border-b">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Time Range:</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="p-2 border rounded-lg"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="quarter">Last Quarter</option>
              <option value="year">Last Year</option>
            </select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg border">
              <div className="flex items-center">
                <Package className="text-blue-600 mr-2" size={20} />
                <div>
                  <p className="text-sm text-gray-600">Total Restocks</p>
                  <p className="text-2xl font-bold">{analytics.totalRestocks}</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border">
              <div className="flex items-center">
                <TrendingUp className="text-green-600 mr-2" size={20} />
                <div>
                  <p className="text-sm text-gray-600">Total Quantity</p>
                  <p className="text-2xl font-bold">{analytics.totalQuantity}</p>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border">
              <div className="flex items-center">
                <DollarSign className="text-purple-600 mr-2" size={20} />
                <div>
                  <p className="text-sm text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold">GHS {analytics.totalValue.toFixed(2)}</p>
                </div>
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border">
              <div className="flex items-center">
                <Calendar className="text-orange-600 mr-2" size={20} />
                <div>
                  <p className="text-sm text-gray-600">Avg. Cost</p>
                  <p className="text-2xl font-bold">GHS {analytics.averageCost.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts and Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Suppliers */}
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Top Suppliers</h3>
              <div className="space-y-3">
                {analytics.topSuppliers.map(([supplier, quantity], index) => (
                  <div key={supplier} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                        {index + 1}
                      </span>
                      <span className="font-medium">{supplier}</span>
                    </div>
                    <span className="text-gray-600">{quantity} units</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Medications */}
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Most Restocked Medications</h3>
              <div className="space-y-3">
                {analytics.topMedications.map(([medication, quantity], index) => (
                  <div key={medication} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                        {index + 1}
                      </span>
                      <span className="font-medium">{medication}</span>
                    </div>
                    <span className="text-gray-600">{quantity} units</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Monthly Trend */}
          <div className="mt-6 bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Monthly Restock Value Trend</h3>
            <div className="flex items-end space-x-2 h-32">
              {monthlyData.map((data, index) => {
                const maxValue = Math.max(...monthlyData.map(d => d.value));
                const height = maxValue > 0 ? (data.value / maxValue) * 100 : 0;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-purple-500 rounded-t"
                      style={{ height: `${height}%` }}
                    ></div>
                    <span className="text-xs text-gray-500 mt-2 rotate-45 origin-left">
                      {data.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Restocks */}
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
                  {filteredRestocks.slice(0, 5).map((restock) => (
                    <tr key={restock.id} className="border-b">
                      <td className="p-2">{restock.medication_name}</td>
                      <td className="p-2">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                          {restock.supplier}
                        </span>
                      </td>
                      <td className="p-2">{restock.quantity}</td>
                      <td className="p-2 font-medium">
                        GHS {parseFloat(restock.total_cost).toFixed(2)}
                      </td>
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