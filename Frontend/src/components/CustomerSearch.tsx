import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, User, Phone, Mail, MapPin, Calendar, Shield, AlertTriangle } from 'lucide-react';
import { Customer } from '../types';
import { useCustomerContext } from '../contexts/CustomerContext';

interface CustomerSearchProps {
  onSelect: (customer: Customer) => void;
  onClose: () => void;
  showCreateOption?: boolean;
}

const CustomerSearch: React.FC<CustomerSearchProps> = ({ 
  onSelect, 
  onClose, 
  showCreateOption = true 
}) => {
  const { searchCustomers, createCustomer } = useCustomerContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({
    name: '',
    phone: '',
    email: '',
    address: '',
    dob: '',
    insurance: '',
    allergies: '',
  });

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        performSearch();
      } else {
        setCustomers([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const performSearch = useCallback(async () => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    try {
      const results = await searchCustomers(searchTerm);
      setCustomers(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, searchCustomers]);

  const handleCreateCustomer = async () => {
    try {
      if (!newCustomer.name || !newCustomer.phone) {
        alert('Name and phone are required');
        return;
      }

      const createdCustomer = await createCustomer(newCustomer);
      onSelect(createdCustomer);
      onClose();
    } catch (error) {
      console.error('Failed to create customer:', error);
      alert('Failed to create customer. Please try again.');
    }
  };

  const formatPhone = (phone: string) => {
    // Format phone number for display
    if (phone.length === 10) {
      return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
    }
    return phone;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Search Customers</h2>
          <button onClick={onClose} className="text-white hover:text-blue-200">
            ✕
          </button>
        </div>

        <div className="p-4">
          {/* Search Input */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, phone, or email..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Create New Customer Button */}
          {showCreateOption && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full mb-4 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center"
            >
              <Plus className="mr-2" size={18} />
              Create New Customer
            </button>
          )}

          {/* Create Customer Form */}
          {showCreateForm && (
            <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h3 className="font-semibold mb-3">Create New Customer</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={newCustomer.name || ''}
                    onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    value={newCustomer.phone || ''}
                    onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newCustomer.email || ''}
                    onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    placeholder="Email address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Insurance
                  </label>
                  <input
                    type="text"
                    value={newCustomer.insurance || ''}
                    onChange={(e) => setNewCustomer({...newCustomer, insurance: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    placeholder="Insurance provider"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={newCustomer.address || ''}
                    onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    placeholder="Full address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={newCustomer.dob || ''}
                    onChange={(e) => setNewCustomer({...newCustomer, dob: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Allergies
                  </label>
                  <input
                    type="text"
                    value={newCustomer.allergies || ''}
                    onChange={(e) => setNewCustomer({...newCustomer, allergies: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    placeholder="Known allergies"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleCreateCustomer}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Create Customer
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Search Results */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Searching...</p>
              </div>
            ) : customers.length > 0 ? (
              <div className="space-y-2">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    onClick={() => onSelect(customer)}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <User className="text-blue-600" size={16} />
                          <span className="font-medium text-gray-900">{customer.name}</span>
                        </div>
                        <div className="mt-1 space-y-1">
                          {customer.phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone size={14} />
                              <span>{formatPhone(customer.phone)}</span>
                            </div>
                          )}
                          {customer.email && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail size={14} />
                              <span>{customer.email}</span>
                            </div>
                          )}
                          {customer.address && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin size={14} />
                              <span className="truncate">{customer.address}</span>
                            </div>
                          )}
                          {customer.dob && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar size={14} />
                              <span>{formatDate(customer.dob)}</span>
                            </div>
                          )}
                          {customer.insurance && (
                            <div className="flex items-center gap-2 text-sm text-blue-600">
                              <Shield size={14} />
                              <span>{customer.insurance}</span>
                            </div>
                          )}
                          {customer.allergies && (
                            <div className="flex items-center gap-2 text-sm text-red-600">
                              <AlertTriangle size={14} />
                              <span>Allergies: {customer.allergies}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Click to select
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchTerm ? (
              <div className="text-center py-8 text-gray-500">
                <User className="mx-auto mb-2 text-gray-400" size={32} />
                <p>No customers found</p>
                <p className="text-sm">Try a different search term</p>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Search className="mx-auto mb-2 text-gray-400" size={32} />
                <p>Start typing to search customers</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerSearch; 