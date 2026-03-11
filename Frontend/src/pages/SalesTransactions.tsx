import React, { useState, useMemo, useRef } from 'react';
import { 
  Printer, 
  Download, 
  Search, 
  Filter, 
  Eye, 
  FileText, 
  Calendar,
  DollarSign,
  User,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { Sale, ApiResponse, PaginationParams } from '../types';
import { formatTransactionId, getTransactionSearchableText } from '../utils/transactionUtils';
import { format, parseISO, subDays } from 'date-fns';
import { useSalesContext } from '../contexts/SalesContext';
import { useCustomerContext } from '../contexts/CustomerContext';
import ReceiptGenerator from '../components/ReceiptGenerator';

interface SalesTransactionsProps {
  sales?: Sale[];
  loading?: boolean;
  error?: string | null;
}

const PaymentMethodBadge: React.FC<{ method: string }> = ({ method }) => {
  let color = "bg-gray-200 text-gray-800";
  if (method.toLowerCase() === "cash") color = "bg-green-100 text-green-800";
  else if (method.toLowerCase() === "card") color = "bg-blue-100 text-blue-800";
  else if (method.toLowerCase() === "mobile_money" || method.toLowerCase() === "mobile money") 
    color = "bg-yellow-100 text-yellow-800";
  else if (method.toLowerCase() === "insurance" || method.toLowerCase() === "insurance-copay")
    color = "bg-purple-100 text-purple-800";
  
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${color}`}>
      {method.replace('_', ' ').replace('-', ' ')}
    </span>
  );
};

const SalesTransactions: React.FC<SalesTransactionsProps> = ({
  sales = [],
  loading = false,
  error = null
}) => {
  const { customers } = useCustomerContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [timeRange, setTimeRange] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Create customer map for ID to name lookup
  const customerMap = useMemo(() => {
    const map: Record<string, string> = {};
    customers.forEach(customer => {
      map[customer.id] = customer.name;
    });
    return map;
  }, [customers]);

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      // Search filter
      const searchMatch = searchTerm === '' || 
        customerMap[sale.customer]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getTransactionSearchableText(sale).toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.items.some(item => 
          (item.medication_name as string)?.toLowerCase().includes(searchTerm.toLowerCase())
        );

      // Time range filter
      let timeMatch = true;
      const saleDate = parseISO(sale.date);
      const today = new Date();
      
      if (timeRange === 'today') {
        timeMatch = format(saleDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
      } else if (timeRange === 'week') {
        const oneWeekAgo = subDays(today, 7);
        timeMatch = saleDate >= oneWeekAgo;
      } else if (timeRange === 'month') {
        timeMatch = saleDate.getMonth() === today.getMonth() && saleDate.getFullYear() === today.getFullYear();
      }

      // Payment method filter
      const paymentMatch = paymentFilter === 'all' || 
        sale.payment_method.toLowerCase() === paymentFilter.toLowerCase();

      return searchMatch && timeMatch && paymentMatch;
    });
  }, [sales, searchTerm, timeRange, paymentFilter, customerMap]);

  const stats = useMemo(() => {
    return filteredSales.reduce((acc, sale) => {
      acc.totalRevenue += Number(sale.total) || 0;
      acc.totalCost += Number(sale.total_cost) || 0;
      acc.totalProfit += Number(sale.profit) || 0;
      acc.totalTransactions += 1;
      return acc;
    }, {
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      totalTransactions: 0
    });
  }, [filteredSales]);

  const handlePrintTransaction = (sale: Sale) => {
    setSelectedSale(sale);
    setShowTransactionDetails(true);
    
    setTimeout(() => {
      if (printRef.current) {
        window.print();
      }
    }, 100);
  };

  const handlePrintAll = () => {
    window.print();
  };

  const handleShowReceipt = (sale: Sale) => {
    setReceiptSale(sale);
    setShowReceiptModal(true);
  };

  const handleCloseReceipt = () => {
    setShowReceiptModal(false);
    setReceiptSale(null);
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Transaction ID', 'Customer', 'Items', 'Total', 'Cost', 'Profit', 'Payment Method'];
    const csvContent = [
      headers.join(','),
      ...filteredSales.map(sale => [
        format(parseISO(sale.date), 'yyyy-MM-dd'),
        sale.id,
        customerMap[sale.customer] || `Customer ${sale.customer}`,
        sale.items.map(item => `${item.medication_name} (${item.qty})`).join('; '),
        (Number(sale.total) || 0).toFixed(2),
        (Number(sale.total_cost) || 0).toFixed(2),
        (Number(sale.profit) || 0).toFixed(2),
        sale.payment_method
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Sales Transactions</h2>
          <p className="text-gray-600">View and manage all sales transactions</p>
        </div>
        <div className="flex items-center gap-2 mt-4 md:mt-0">
          <button
            onClick={handlePrintAll}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print All
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">
                GHS {stats.totalRevenue.toFixed(2)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-blue-600">
                {stats.totalTransactions}
              </p>
            </div>
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Profit</p>
              <p className="text-2xl font-bold text-purple-600">
                GHS {stats.totalProfit.toFixed(2)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Profit Margin</p>
              <p className="text-2xl font-bold text-orange-600">
                {stats.totalRevenue > 0 ? ((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by customer, transaction ID, or items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Time Range */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          {/* Payment Method Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Payment Methods</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="insurance">Insurance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No transactions found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {format(parseISO(sale.date), 'MMM dd, yyyy')}
                        </div>
                        <div className="text-sm text-gray-500">
                          {format(parseISO(sale.date), 'HH:mm')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-900">{formatTransactionId(sale)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {customerMap[sale.customer] || `Customer ${sale.customer}`}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        {sale.items.map((item, index) => (
                          <div key={index} className="flex justify-between text-sm mb-1">
                            <span className="font-medium truncate">
                              {item.medication_name as string}
                            </span>
                                                         <div className="text-right ml-2">
                               <div className="text-gray-600">{item.qty} × GHS {(Number(item.price) || 0).toFixed(2)}</div>
                             </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-right">
                                                 <div className="text-lg font-bold text-green-600">
                           GHS {(Number(sale.total) || 0).toFixed(2)}
                         </div>
                                                 <div className="text-xs text-gray-500">
                           Profit: GHS {(Number(sale.profit) || 0).toFixed(2)}
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <PaymentMethodBadge method={sale.payment_method} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedSale(sale);
                            setShowTransactionDetails(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handlePrintTransaction(sale)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Print Receipt"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleShowReceipt(sale)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="View Receipt"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {showTransactionDetails && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Transaction Details</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePrintTransaction(selectedSale)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </button>
                <button
                  onClick={() => setShowTransactionDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6" ref={printRef}>
              {/* Receipt Header */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Pharmacy Receipt</h2>
                <p className="text-gray-600">Transaction #{selectedSale.custom_id || `TXN${selectedSale.id.slice(-8).toUpperCase()}`}</p>
                <p className="text-gray-600">{format(parseISO(selectedSale.date), 'MMMM dd, yyyy HH:mm')}</p>
              </div>

              {/* Customer Information */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Customer Information</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-900">
                    <span className="font-medium">Name:</span> {customerMap[selectedSale.customer] || `Customer ${selectedSale.customer}`}
                  </p>
                </div>
              </div>

              {/* Items */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Items Purchased</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedSale.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.medication_name as string}</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900">{item.qty}</td>
                                                     <td className="px-4 py-3 text-sm text-right text-gray-900">GHS {(Number(item.price) || 0).toFixed(2)}</td>
                           <td className="px-4 py-3 text-sm text-right text-gray-900">GHS {(item.qty * (Number(item.price) || 0)).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary */}
              <div className="mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Subtotal:</span>
                                         <span className="text-gray-900">GHS {(Number(selectedSale.total) || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Cost:</span>
                                         <span className="text-red-600">GHS {(Number(selectedSale.total_cost) || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Profit:</span>
                                         <span className="text-green-600 font-medium">GHS {(Number(selectedSale.profit) || 0).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-900">Total:</span>
                                             <span className="text-lg font-bold text-green-600">GHS {(Number(selectedSale.total) || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Payment Information</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Payment Method:</span>
                    <PaymentMethodBadge method={selectedSale.payment_method} />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-gray-500 text-sm">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-yellow-800 font-medium">⚠️ IMPORTANT: Items sold are not returnable</p>
                </div>
                <p>Thank you for your purchase!</p>
                <p>For any questions, please contact us.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Receipt Modal */}
      {showReceiptModal && receiptSale && (
        <ReceiptGenerator
          sale={receiptSale}
          customer={customers.find(c => c.id === receiptSale.customer)}
          onClose={handleCloseReceipt}
        />
      )}
    </div>
  );
};

export default SalesTransactions; 