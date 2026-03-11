// src/pages/Sales.tsx
import React, { useMemo, useState } from 'react';
import { Plus, FileText, DollarSign, Printer, Percent, ArrowUpRight, RefreshCw } from 'lucide-react';
import { useSalesContext } from '../contexts/SalesContext';
import NewSaleForm from '../components/Sales/NewSaleForm';
import { Sale } from '../types';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import TextField from '@mui/material/TextField';
import { format, parseISO, subDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { useMedicationContext } from '../contexts/MedicationContext';
import ReceiptGenerator from '../components/ReceiptGenerator';
import { useCustomerContext } from '../contexts/CustomerContext';

const COLORS = ['#34d399', '#60a5fa', '#fbbf24', '#a78bfa', '#f472b6', '#f87171'];

const PaymentMethodBadge: React.FC<{ method: string }> = ({ method }) => {
  let color = "bg-gray-200 text-gray-800";
  if (method.toLowerCase() === "cash") color = "bg-green-100 text-green-800";
  else if (method.toLowerCase() === "card") color = "bg-blue-100 text-blue-800";
  else if (method.toLowerCase() === "mobile_money" || method.toLowerCase() === "mobile money") 
    color = "bg-yellow-100 text-yellow-800";
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${color}`}>
      {method}
    </span>
  );
};

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; description?: string; trend?: { value: number; percentage: number } }> = ({ 
  title, 
  value, 
  icon, 
  description, 
  trend 
}) => (
  <div className="bg-white p-4 rounded-lg shadow flex items-start justify-between">
    <div className="flex items-start space-x-4">
      <div className="bg-blue-100 p-2 rounded-full text-blue-600">{icon}</div>
      <div>
        <div className="text-sm text-gray-500">{title}</div>
        <div className="text-xl font-bold">{value}</div>
        {description && <div className="text-xs text-gray-400">{description}</div>}
      </div>
    </div>
    {trend && (
      <div className={`flex items-center text-xs font-medium ${trend.value > 0 ? 'text-green-600' : 'text-red-600'}`}>
        {trend.value > 0 ? <ArrowUpRight size={14} /> : '↓'} {trend.percentage}%
      </div>
    )}
  </div>
);

const Sales: React.FC = () => {
  const { sales, loading, error, addSale } = useSalesContext();
  const { medications } = useMedicationContext();
  const [timeRange, setTimeRange] = useState('today');
  const [showNewSaleForm, setShowNewSaleForm] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [comparisonPeriod, setComparisonPeriod] = useState<'previous_period' | 'previous_year'>('previous_period');
  const [wsSales, setWsSales] = useState<Sale[]>([]);

  // Create customer map for ID to name lookup
  const customerMap = useMemo(() => {
    const map: Record<number, string> = {
      0: 'Walk-in Customer'
    };
    
    // Add mock customers - in a real app, this would come from API
    [
      { id: 1, name: "John Doe" },
      { id: 2, name: "Jane Smith" },
      { id: 3, name: "Kwame Asante" },
      { id: 4, name: "Ama Boateng" },
      { id: 5, name: "Yaw Mensah" },
    ].forEach(customer => {
      map[customer.id] = customer.name;
    });
    
    return map;
  }, []);

  // Combine static sales with real-time updates
  const allSales = useMemo(() => [...wsSales, ...sales], [wsSales, sales]);

  const filteredSales = useMemo(() => {
    return allSales.filter(sale => {
      const saleDate = parseISO(sale.date);
      const today = new Date();
      
      if (timeRange === 'today') {
        return format(saleDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
      } else if (timeRange === 'week') {
        const oneWeekAgo = subDays(today, 7);
        return saleDate >= oneWeekAgo;
      } else if (timeRange === 'month') {
        return saleDate.getMonth() === today.getMonth() && saleDate.getFullYear() === today.getFullYear();
      } else if (timeRange === 'custom' && startDate && endDate) {
        return isWithinInterval(saleDate, { start: startDate, end: endDate });
      }
      return true;
    });
  }, [allSales, timeRange, startDate, endDate]);

  const calculateStats = () => {
    const totals = filteredSales.reduce((acc, sale) => {
      acc.totalRevenue += sale.total;
      acc.totalCost += sale.total_cost || 0;
      acc.totalProfit += sale.profit || 0;
      acc.totalTransactions += 1;
      return acc;
    }, { 
      totalRevenue: 0, 
      totalCost: 0,
      totalProfit: 0,
      totalTransactions: 0 
    });

    return {
      ...totals,
      averageSale: totals.totalTransactions > 0 
        ? totals.totalRevenue / totals.totalTransactions 
        : 0,
      profitMargin: totals.totalRevenue > 0
        ? (totals.totalProfit / totals.totalRevenue) * 100
        : 0
    };
  };

  const stats = calculateStats();

  // Sales change comparison
  const salesChangePercentage = useMemo(() => {
    return 8.2; // Placeholder value
  }, [filteredSales]);

  // Top performing products
  const topProducts = useMemo(() => {
    const productMap: { [key: string]: number } = {};
    
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        // item.medication_name might be a ReactNode, so ensure it's a string
        let productName = 'Unknown';
        if (typeof item.medication_name === 'string') {
          productName = item.medication_name;
        }
        productMap[productName] = (productMap[productName] || 0) + item.qty;
      });
    });
    
    return Object.entries(productMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredSales]);

  if (loading) return <div className="text-center py-10">Loading sales...</div>;
  if (error) return <div className="text-center py-10 text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Sales & Reports</h2>
        <button 
          onClick={() => setShowNewSaleForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          <Plus className="h-4 w-4" />
          New Sale
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <StatCard 
          title="Total Revenue" 
          value={`GHS ${stats.totalRevenue.toFixed(2)}`}
          icon={<DollarSign className="h-8 w-8" />}
          description={`${stats.totalTransactions} transactions`}
          trend={{ value: 8.2, percentage: 8.2 }}
        />
        <StatCard 
          title="Total Cost" 
          value={`GHS ${stats.totalCost.toFixed(2)}`}
          icon={<DollarSign className="h-8 w-8" />}
          description="Inventory cost"
          trend={{ value: -2.1, percentage: 2.1 }}
        />
        <StatCard 
          title="Total Profit" 
          value={`GHS ${stats.totalProfit.toFixed(2)}`}
          icon={<DollarSign className="h-8 w-8" />}
          description="Net earnings"
          trend={{ value: 15.7, percentage: 15.7 }}
        />
        <StatCard 
          title="Profit Margin" 
          value={`${stats.profitMargin.toFixed(2)}%`}
          icon={<Percent className="h-8 w-8" />}
          description="Percentage"
        />
        <StatCard 
          title="Sales Change" 
          value={`${salesChangePercentage}%`} 
          icon={<ArrowUpRight className="h-8 w-8" />}
          description={`vs ${comparisonPeriod === 'previous_period' ? 'last period' : 'last year'}`}
          trend={{
            value: salesChangePercentage,
            percentage: Math.abs(salesChangePercentage)
          }}
        />
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <select
            className="border rounded px-3 py-2 text-sm"
            value={timeRange}
            onChange={e => {
              setTimeRange(e.target.value);
              setStartDate(null);
              setEndDate(null);
            }}
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>
          
          {timeRange === 'custom' && (
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <div className="flex items-center gap-2">
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={setStartDate}
                  slotProps={{ textField: { size: "small" } }}
                />
                <span className="text-gray-500">to</span>
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={setEndDate}
                  minDate={startDate ?? undefined}
                  slotProps={{ textField: { size: "small" } }}
                />
              </div>
            </LocalizationProvider>
          )}
        </div>
        
        <button
          onClick={() => {
            setTimeRange('today');
            setStartDate(null);
            setEndDate(null);
            window.location.reload();
          }}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md overflow-x-auto">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Margin</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSales.map(sale => {
                  const profitMargin = sale.total > 0 
                    ? ((sale.profit || 0) / sale.total) * 100 
                    : 0;
                  
                  return (
                    <tr key={sale.id}>
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(sale.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {/* Fixed customer display */}
                        {customerMap[Number(sale.customer)] || `Customer ${sale.customer}`}
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          {(sale.items || []).map((item, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="font-medium">{item.medication_name}</span>
                              <div className="text-right">
                                <div>{item.qty} × GHS {item.price?.toFixed(2)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-green-600 font-medium">
                        GHS {sale.total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-red-500">
                        GHS {(sale.total_cost || 0).toFixed(2)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap ${(sale.profit || 0) >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}`}>
                        GHS {(sale.profit || 0).toFixed(2)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {profitMargin.toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <PaymentMethodBadge method={sale.payment_method} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button 
                          className="p-1 hover:bg-gray-100 rounded"
                          aria-label="View receipt"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        <a
                          href={`http://127.0.0.1:8000/receipt/${sale.id}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 hover:bg-gray-100 rounded ml-2"
                          aria-label="Print receipt"
                        >
                          <Printer className="h-4 w-4" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products Chart */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Top Performing Products</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={topProducts}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value} units`, 'Quantity']} />
              <Bar dataKey="count" name="Units Sold">
                {topProducts.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {showNewSaleForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <NewSaleForm 
            onClose={() => setShowNewSaleForm(false)}
            onSaveSuccess={() => {
              // Sales context will automatically update
              setShowNewSaleForm(false);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Sales;