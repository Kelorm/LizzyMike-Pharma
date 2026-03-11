import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Calendar,
  Filter,
  Download,
  Eye,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Users
} from 'lucide-react';
import { Sale, SaleItem } from '../../types';

interface SalesAnalyticsProps {
  sales: Sale[];
  loading?: boolean;
  error?: string | null;
}

interface ChartDataPoint {
  date: string;
  revenue: number;
  sales: number;
  formattedDate: string;
}

interface ProductSalesData {
  name: string;
  value: number;
  revenue: number;
  percentage: number;
}

const CHART_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
];

const GRADIENT_COLORS = [
  { from: '#3B82F6', to: '#1D4ED8' },
  { from: '#10B981', to: '#059669' },
  { from: '#F59E0B', to: '#D97706' },
  { from: '#EF4444', to: '#DC2626' }
];

const SalesAnalytics: React.FC<SalesAnalyticsProps> = ({ sales, loading, error }) => {
  const [timeFilter, setTimeFilter] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('area');
  const [viewMode, setViewMode] = useState<'revenue' | 'quantity'>('revenue');

  // Calculate time range
  const getTimeRange = (filter: string) => {
    const now = new Date();
    const days = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    }[filter] || 30;
    
    const startDate = new Date();
    startDate.setDate(now.getDate() - days);
    return { startDate, endDate: now, days };
  };

  // Filter sales by time range
  const filteredSales = useMemo(() => {
    const { startDate } = getTimeRange(timeFilter);
    return sales.filter(sale => new Date(sale.date) >= startDate);
  }, [sales, timeFilter]);

  // Generate chart data
  const chartData = useMemo(() => {
    const { days } = getTimeRange(timeFilter);
    const dataMap = new Map<string, { revenue: number; sales: number }>();
    
    // Initialize all days with zero values
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const dateKey = date.toISOString().split('T')[0];
      dataMap.set(dateKey, { revenue: 0, sales: 0 });
    }
    
    // Populate with actual sales data
    filteredSales.forEach(sale => {
      const dateKey = sale.date.split('T')[0];
      const existing = dataMap.get(dateKey) || { revenue: 0, sales: 0 };
      dataMap.set(dateKey, {
        revenue: existing.revenue + (Number(sale.total) || 0),
        sales: existing.sales + 1
      });
    });
    
    // Convert to array format for charts
    return Array.from(dataMap.entries()).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      sales: data.sales,
      formattedDate: new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    }));
  }, [filteredSales, timeFilter]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
    const totalSales = filteredSales.length;
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
    
    // Calculate growth compared to previous period
    const { days } = getTimeRange(timeFilter);
    const previousPeriodStart = new Date();
    previousPeriodStart.setDate(previousPeriodStart.getDate() - (days * 2));
    const previousPeriodEnd = new Date();
    previousPeriodEnd.setDate(previousPeriodEnd.getDate() - days);
    
    const previousSales = sales.filter(sale => {
      const saleDate = new Date(sale.date);
      return saleDate >= previousPeriodStart && saleDate < previousPeriodEnd;
    });
    
    const previousRevenue = previousSales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
    const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    const salesGrowth = previousSales.length > 0 ? ((totalSales - previousSales.length) / previousSales.length) * 100 : 0;
    
    return {
      totalRevenue,
      totalSales,
      averageOrderValue,
      revenueGrowth,
      salesGrowth
    };
  }, [filteredSales, sales, timeFilter]);

  // Top products data for pie chart
  const topProductsData = useMemo(() => {
    const productSales = new Map<string, { quantity: number; revenue: number }>();
    
    filteredSales.forEach(sale => {
      if (sale.items) {
        sale.items.forEach(item => {
          const productName = item.medication_name || 'Unknown Product';
          const existing = productSales.get(productName) || { quantity: 0, revenue: 0 };
          productSales.set(productName, {
            quantity: existing.quantity + (item.qty || 0),
            revenue: existing.revenue + ((item.qty || 0) * (item.price || 0))
          });
        });
      }
    });
    
    const totalRevenue = Array.from(productSales.values()).reduce((sum, p) => sum + p.revenue, 0);
    
    return Array.from(productSales.entries())
      .map(([name, data]) => ({
        name,
        value: viewMode === 'revenue' ? data.revenue : data.quantity,
        revenue: data.revenue,
        percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 products
  }, [filteredSales, viewMode]);

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name === 'revenue' ? `GHS ${entry.value.toFixed(2)}` : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Stat card component
  const StatCard = ({ title, value, change, icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change !== undefined && (
            <div className={`flex items-center mt-2 text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
              {Math.abs(change).toFixed(1)}% vs last period
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-80 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <div className="text-center">
          <div className="text-red-500 mb-2">
            <Activity className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Analytics</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3 mb-4 sm:mb-0">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Sales Analytics</h2>
              <p className="text-gray-600">Track your sales performance and trends</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Time Filter */}
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            
            {/* Chart Type */}
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              {[
                { type: 'area', icon: Activity },
                { type: 'bar', icon: BarChart3 },
                { type: 'line', icon: TrendingUp }
              ].map(({ type, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => setChartType(type as any)}
                  className={`p-2 rounded-md transition-colors ${
                    chartType === type
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
            
            {/* Export Button */}
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={`GHS ${summaryStats.totalRevenue.toFixed(2)}`}
          change={summaryStats.revenueGrowth}
          icon={<DollarSign className="h-6 w-6 text-white" />}
          color="bg-gradient-to-r from-green-500 to-green-600"
        />
        <StatCard
          title="Total Sales"
          value={summaryStats.totalSales.toLocaleString()}
          change={summaryStats.salesGrowth}
          icon={<ShoppingCart className="h-6 w-6 text-white" />}
          color="bg-gradient-to-r from-blue-500 to-blue-600"
        />
        <StatCard
          title="Average Order Value"
          value={`GHS ${summaryStats.averageOrderValue.toFixed(2)}`}
          icon={<TrendingUp className="h-6 w-6 text-white" />}
          color="bg-gradient-to-r from-purple-500 to-purple-600"
        />
        <StatCard
          title="Active Period"
          value={(() => {
            switch(timeFilter) {
              case '7d': return '7 days';
              case '30d': return '30 days';
              case '90d': return '90 days';
              case '1y': return '1 year';
              default: return timeFilter;
            }
          })()}
          icon={<Calendar className="h-6 w-6 text-white" />}
          color="bg-gradient-to-r from-orange-500 to-orange-600"
        />
      </div>

      {/* Main Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Sales Trend</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('revenue')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'revenue'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Revenue
            </button>
            <button
              onClick={() => setViewMode('quantity')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'quantity'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Quantity
            </button>
          </div>
        </div>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="formattedDate" 
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => viewMode === 'revenue' ? `GHS ${value}` : value}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey={viewMode}
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            ) : chartType === 'line' ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="formattedDate" 
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => viewMode === 'revenue' ? `GHS ${value}` : value}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey={viewMode}
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                />
              </LineChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="formattedDate" 
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => viewMode === 'revenue' ? `GHS ${value}` : value}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey={viewMode} 
                  fill="#3B82F6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Top Products Distribution</h3>
            <PieChartIcon className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={topProductsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {topProductsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, name: any, props: any) => [
                    viewMode === 'revenue' ? `GHS ${value.toFixed(2)}` : value,
                    props.payload.name
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products List */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Top Products</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Eye className="h-4 w-4" />
              <span>By {viewMode}</span>
            </div>
          </div>
          
          <div className="space-y-3">
            {topProductsData.slice(0, 6).map((product, index) => (
              <div key={product.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  ></div>
                  <div>
                    <p className="font-medium text-gray-900 truncate max-w-[150px]">{product.name}</p>
                    <p className="text-sm text-gray-600">{product.percentage.toFixed(1)}% of total</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {viewMode === 'revenue' ? `GHS ${product.revenue.toFixed(2)}` : product.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesAnalytics;
