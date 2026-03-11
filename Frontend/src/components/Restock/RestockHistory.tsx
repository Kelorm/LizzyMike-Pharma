import React, { useState, useEffect } from 'react';
import { Package, Calendar, DollarSign, TrendingUp, Filter, Search, X } from 'lucide-react';
import { Restock } from '../../types';

interface RestockHistoryProps {
  onClose: () => void;
  onRestockClick?: (restock: Restock) => void;
}

const RestockHistory = ({ onClose, onRestockClick }: RestockHistoryProps) => {
  const [restocks, setRestocks] = useState<Restock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterMedication, setFilterMedication] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'cost' | 'quantity'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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

  const filteredRestocks = restocks
    .filter(restock => {
      const matchesSearch = restock.medication_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           restock.supplier.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSupplier = !filterSupplier || restock.supplier === filterSupplier;
      const matchesMedication = !filterMedication || restock.medication_name === filterMedication;
      
      return matchesSearch && matchesSupplier && matchesMedication;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.date_restocked).getTime();
          bValue = new Date(b.date_restocked).getTime();
          break;
        case 'cost':
          aValue = parseFloat(a.total_cost);
          bValue = parseFloat(b.total_cost);
          break;
        case 'quantity':
          aValue = parseInt(a.quantity);
          bValue = parseInt(b.quantity);
          break;
        default:
          return 0;
      }
      
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

  const suppliers = Array.from(new Set(restocks.map(r => r.supplier)));
  const medications = Array.from(new Set(restocks.map(r => r.medication_name)));

  const totalRestockValue = restocks.reduce((sum, r) => sum + parseFloat(r.total_cost), 0);
  const totalRestockQuantity = restocks.reduce((sum, r) => sum + parseInt(r.quantity), 0);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-center">Loading restock history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Package className="mr-3" size={24} />
              <h2 className="text-2xl font-bold">Restock History</h2>
            </div>
            <button onClick={onClose} className="text-white hover:text-blue-200">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="p-6 bg-gray-50 border-b">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center">
                <Package className="text-blue-600 mr-2" size={20} />
                <div>
                  <p className="text-sm text-gray-600">Total Restocks</p>
                  <p className="text-xl font-bold">{restocks.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center">
                <TrendingUp className="text-green-600 mr-2" size={20} />
                <div>
                  <p className="text-sm text-gray-600">Total Quantity</p>
                  <p className="text-xl font-bold">{totalRestockQuantity}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center">
                <DollarSign className="text-purple-600 mr-2" size={20} />
                <div>
                  <p className="text-sm text-gray-600">Total Value</p>
                  <p className="text-xl font-bold">GHS {totalRestockValue.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 border-b">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search medications or suppliers..."
                  className="w-full p-2 border rounded-lg pl-8"
                />
                <Search className="absolute left-2 top-2.5 text-gray-400" size={16} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
              <select
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">All Suppliers</option>
                {suppliers.map(supplier => (
                  <option key={supplier} value={supplier}>{supplier}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Medication</label>
              <select
                value={filterMedication}
                onChange={(e) => setFilterMedication(e.target.value)}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">All Medications</option>
                {medications.map(medication => (
                  <option key={medication} value={medication}>{medication}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field as 'date' | 'cost' | 'quantity');
                  setSortOrder(order as 'asc' | 'desc');
                }}
                className="w-full p-2 border rounded-lg"
              >
                <option value="date-desc">Date (Newest)</option>
                <option value="date-asc">Date (Oldest)</option>
                <option value="cost-desc">Cost (High to Low)</option>
                <option value="cost-asc">Cost (Low to High)</option>
                <option value="quantity-desc">Quantity (High to Low)</option>
                <option value="quantity-asc">Quantity (Low to High)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Restock List */}
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Medication</th>
                  <th className="text-left p-3 font-medium">Supplier</th>
                  <th className="text-left p-3 font-medium">Quantity</th>
                  <th className="text-left p-3 font-medium">Unit Cost</th>
                  <th className="text-left p-3 font-medium">Total Cost</th>
                  <th className="text-left p-3 font-medium">Batch Number</th>
                  <th className="text-left p-3 font-medium">Expiry Date</th>
                  <th className="text-left p-3 font-medium">Date Restocked</th>
                </tr>
              </thead>
              <tbody>
                {filteredRestocks.map((restock) => (
                  <tr 
                    key={restock.id} 
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => onRestockClick?.(restock)}
                  >
                    <td className="p-3">
                      <div className="font-medium">{restock.medication_name}</div>
                    </td>
                    <td className="p-3">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                        {restock.supplier}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-medium">{restock.quantity}</span>
                    </td>
                    <td className="p-3">
                      GHS {parseFloat(restock.unit_cost).toFixed(2)}
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-green-600">
                        GHS {parseFloat(restock.total_cost).toFixed(2)}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-sm text-gray-600 font-mono">
                        {restock.batch_number}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-sm">
                        {new Date(restock.expiry_date).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center">
                        <Calendar className="text-gray-400 mr-1" size={14} />
                        <span className="text-sm">
                          {new Date(restock.date_restocked).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredRestocks.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Package className="mx-auto mb-4 text-gray-300" size={48} />
              <p>No restock history found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RestockHistory; 