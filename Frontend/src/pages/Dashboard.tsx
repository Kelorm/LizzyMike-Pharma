// src/pages/Dashboard.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, Calendar, Activity, 
  TrendingUp, DollarSign, Package,
  Users, FileText
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { 
  AlertCard,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  StockBadge
} from '../components/ui';
import { SalesAnalytics } from '../components/Analytics';
import { Medication, Prescription, Sale, Customer, SaleItem, DashboardAnalytics } from '../types';
import { formatTransactionId } from '../utils/transactionUtils';
import api from '../services/api';

type StatCardProps = {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  gradient?: string;
  onClick?: () => void;
};

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, gradient, onClick }) => (
  <div 
    className={`p-6 rounded-xl shadow-xl text-white flex items-center justify-between bg-gradient-to-r ${gradient} hover:scale-105 transition-transform duration-200 cursor-pointer`}
    onClick={onClick}
  >
    <div>
      <div className="text-sm font-medium">{title}</div>
      <div className="text-3xl font-bold mt-2">{value}</div>
    </div>
    <div className="bg-white bg-opacity-25 p-4 rounded-full shadow-lg">
      {icon}
    </div>
  </div>
);

interface DashboardProps {
  loading: boolean;
  error: string | null;
  medications: Medication[];
  prescriptions: Prescription[];
  sales: Sale[];
  customers: Customer[];
  setActiveTab?: (tab: string) => void;
}

const COLORS = ['#34d399', '#60a5fa', '#fbbf24', '#a78bfa', '#f472b6', '#f87171'];

const Dashboard: React.FC<DashboardProps> = ({
  loading,
  error,
  medications = [],
  prescriptions = [],
  sales = [],
  customers = [],
  setActiveTab
}) => {
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'year'>('month');
  
  // Memoized calculations for performance
  const lowStockItems = useMemo(() => medications.filter(med => med.stock <= med.min_stock), [medications]);
  
  const expiringItems = useMemo(() => medications.filter(med => {
    if (!med.expiry) return false;
    const expiryDate = new Date(med.expiry);
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    return expiryDate <= threeMonthsFromNow;
  }), [medications]);
  
  const todaysSales = useMemo(() => sales.filter(sale => {
    const saleDate = new Date(sale.date);
    const today = new Date();
    
    // Reset time to compare only dates
    const saleDateOnly = new Date(saleDate.getFullYear(), saleDate.getMonth(), saleDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    return saleDateOnly.getTime() === todayOnly.getTime();
  }), [sales]);
  
  const todaysRevenue = useMemo(() => todaysSales.reduce((sum, sale) => {
    const total = Number(sale.total) || 0;
    return sum + total;
  }, 0), [todaysSales]);
  
  const pendingPrescriptions = useMemo(() => prescriptions.filter(
    p => p.status !== 'dispensed'
  ), [prescriptions]);

  const uniqueCustomers = useMemo(() => new Set(sales.map(sale => sale.customer)), [sales]);

  // Ensure we have fallback values for display
  const displayRevenue = todaysRevenue || 0;
  const displayMedications = medications.length || 0;
  const displayPendingPrescriptions = pendingPrescriptions.length || 0;
  const displayUniqueCustomers = uniqueCustomers.size || 0;

  // Sales chart data with time filter
  const salesData = useMemo(() => {
    const now = new Date();
    let days = 30;
    if (timeFilter === 'week') days = 7;
    if (timeFilter === 'year') days = 365;
    
    const dailyTotals: { [key: string]: number } = {};
    const dataPoints = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dailyTotals[dateKey] = 0;
      dataPoints.push({
        date: dateKey,
        day: date.getDate(),
        total: 0
      });
    }
    
    sales.forEach(sale => {
      const saleDate = new Date(sale.date).toISOString().split('T')[0];
      if (dailyTotals[saleDate] !== undefined) {
        const total = Number(sale.total) || 0;
        dailyTotals[saleDate] += total;
      }
    });
    
    return dataPoints.map(dp => ({
      ...dp,
      total: dailyTotals[dp.date]
    }));
  }, [sales, timeFilter]);

  // Skeleton loader for loading state
  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-lg h-32 animate-pulse"></div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-lg h-64 animate-pulse"></div>
        ))}
      </div>
    </div>
  );
  
  if (error) return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-red-400" />
        </div>
        <div className="ml-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Dashboard Overview</h2>
      

      
                           {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard 
            title="Today's Revenue" 
            value={`GHS ${displayRevenue.toFixed(2)}`}
            icon={<DollarSign className="h-6 w-6" />}
            gradient="from-blue-500 to-blue-700"
            onClick={() => setActiveTab?.('sales')}
          />
          <StatCard 
            title="Total Medications" 
            value={displayMedications}
            icon={<Package className="h-6 w-6" />}
            gradient="from-green-500 to-green-700"
            onClick={() => setActiveTab?.('inventory')}
          />
          <StatCard 
            title="Today's Sales" 
            value={todaysSales.length}
            icon={<Activity className="h-6 w-6" />}
            gradient="from-blue-500 to-blue-700"
            onClick={() => setActiveTab?.('sales')}
          />
          <StatCard 
            title="Active Customers" 
            value={displayUniqueCustomers}
            icon={<Users className="h-6 w-6" />}
            gradient="from-purple-500 to-purple-700"
            onClick={() => setActiveTab?.('customers')}
          />
        </div>
      
      {/* Alert Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AlertCard 
          title={`Low Stock Alerts (${lowStockItems.length})`}
          icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
        >
          {lowStockItems.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <div className="mb-2">No alerts found</div>
              <div className="text-sm">Everything looks good!</div>
            </div>
          ) : (
            lowStockItems.map(item => (
              <div key={item.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-gray-600">{item.category}</div>
                </div>
                <StockBadge stock={item.stock} minStock={item.min_stock} />
              </div>
            ))
          )}
        </AlertCard>

        <AlertCard 
          title={`Expiring Soon (${expiringItems.length})`}
          icon={<Calendar className="h-5 w-5 text-yellow-500" />}
        >
          {expiringItems.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <div className="mb-2">No alerts found</div>
              <div className="text-sm">Everything looks good!</div>
            </div>
          ) : (
            expiringItems.map(item => (
              <div key={item.id} className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-gray-600">Batch: {item.batch_no}</div>
                </div>
                <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                  {new Date(item.expiry).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </AlertCard>
      </div>

      {/* Enhanced Sales Analytics */}
      <SalesAnalytics 
        sales={sales}
        loading={loading}
        error={error}
      />

      {/* Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="mb-4 flex items-center space-x-2">
            <Activity className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold text-lg">Recent Transactions</h3>
          </div>
          
          <div className="overflow-hidden border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                      No recent sales
                    </td>
                  </tr>
                ) : (
                  sales.slice(0, 5).map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(sale.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sale.customer || 'Walk-in Customer'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {sale.items?.length || 0} items
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                        GHS {(Number(sale.total) || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products */}
        <TopProductsSection sales={sales} medications={medications} />
      </div>
    </div>
  );
};

type TopProductsSectionProps = {
  sales: Sale[];
  medications: Medication[];
};

const TopProductsSection: React.FC<TopProductsSectionProps> = ({ sales, medications }) => {
  const [filter, setFilter] = useState<'month' | 'week'>('month');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate top products from local sales data
  const topProducts = useMemo(() => {
    if (!sales || sales.length === 0) return [];

    const days = filter === 'month' ? 30 : 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Filter sales by date range
    const recentSales = sales.filter(sale => {
      const saleDate = new Date(sale.date);
      return saleDate >= cutoffDate;
    });

    // Aggregate product sales
    const productSales: { [key: string]: { name: string; totalSold: number; totalRevenue: number } } = {};

    recentSales.forEach(sale => {
      if (sale.items) {
        sale.items.forEach(item => {
          const productKey = item.medication || item.medication_name || 'Unknown';
          const productName = item.medication_name || 'Unknown Product';
          
          if (!productSales[productKey]) {
            productSales[productKey] = {
              name: productName,
              totalSold: 0,
              totalRevenue: 0
            };
          }
          
          productSales[productKey].totalSold += item.qty || 0;
          productSales[productKey].totalRevenue += (item.qty || 0) * (item.price || 0);
        });
      }
    });

    // Convert to array and sort by total sold
    return Object.values(productSales)
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 5); // Top 5 products
  }, [sales, filter]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Package className="h-5 w-5 text-indigo-500" />
          <h3 className="font-semibold text-lg">Top Products</h3>
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value as 'month' | 'week')}
          className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          <option value="month">This Month</option>
          <option value="week">Last 7 Days</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="text-sm text-red-600">Error: {error}</div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-6 text-gray-500">
          <div>Loading analytics...</div>
        </div>
      ) : topProducts.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          <div>No product sales data available</div>
          <div className="text-sm mt-1">
            {sales.length === 0 ? 'No sales recorded yet' : 'Try changing the time filter'}
          </div>
          {sales.length > 0 && (
            <div className="text-xs mt-2 text-gray-400">
              {sales.length} sales found, but none in the selected time range
            </div>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {topProducts.map((product, idx) => (
            <li key={idx} className="flex justify-between py-3 items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-gray-100 border rounded-md w-10 h-10 flex items-center justify-center">
                  <span className="font-medium text-gray-700">{idx + 1}</span>
                </div>
                <div>
                  <div className="font-medium text-gray-800 truncate max-w-[160px]">
                    {product.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {product.totalSold} sold
                  </div>
                </div>
              </div>
              <div className="text-sm font-semibold text-green-600">
                GHS {product.totalRevenue.toFixed(2)}
              </div>
            </li>
          ))}
        </ul>
      )}


    </div>
  );
};

export default Dashboard;