import React, { useState, useEffect } from 'react';
import { Customer, CustomerFormData } from '../types';
import { useCustomerContext } from '../contexts/CustomerContext';
import { toast } from 'react-hot-toast';
import { User, Phone, Mail, MapPin, Calendar, Shield, AlertTriangle, Trash2, Edit, Eye, Plus } from 'lucide-react';

interface CustomerModalProps {
  type: 'add' | 'edit' | 'view' | 'delete';
  customer?: Customer;
  onClose: () => void;
  onSuccess?: () => void;
}

const CustomerModal: React.FC<CustomerModalProps> = ({ 
  type, 
  customer, 
  onClose, 
  onSuccess 
}) => {
  const { createCustomer, updateCustomer, deleteCustomer } = useCustomerContext();
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    phone: '',
    email: '',
    address: '',
    dob: '',
    insurance: '',
    allergies: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when customer is provided
  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        dob: customer.dob || '',
        insurance: customer.insurance || '',
        allergies: customer.allergies || ''
      });
    }
  }, [customer]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field changes
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[\+]?[0-9\s\-\(\)]{10,}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (formData.dob) {
      const dobDate = new Date(formData.dob);
      const today = new Date();
      if (dobDate > today) {
        newErrors.dob = 'Date of birth cannot be in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsLoading(true);
    try {
      if (type === 'add') {
        await createCustomer(formData);
        toast.success('Customer added successfully');
      } else if (type === 'edit' && customer) {
        await updateCustomer(customer.id, formData);
        toast.success('Customer updated successfully');
      }
      onSuccess?.();
      onClose();
    } catch (error: any) {
      const errorMessage = error.message || 'Operation failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!customer) return;
    
    setIsLoading(true);
    try {
      await deleteCustomer(customer.id);
      toast.success('Customer deleted successfully');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to delete customer. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not provided';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name *
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`pl-10 w-full border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm p-2`}
              placeholder="Enter full name"
              required
            />
          </div>
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number *
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className={`pl-10 w-full border ${errors.phone ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm p-2`}
              placeholder="Enter phone number"
              required
            />
          </div>
          {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`pl-10 w-full border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm p-2`}
              placeholder="Enter email address"
            />
          </div>
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date of Birth
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleInputChange}
              className={`pl-10 w-full border ${errors.dob ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm p-2`}
            />
          </div>
          {errors.dob && <p className="mt-1 text-xs text-red-600">{errors.dob}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Address *
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <textarea
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            rows={3}
            className={`pl-10 w-full border ${errors.address ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm p-2`}
            placeholder="Enter full address"
            required
          />
        </div>
        {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Insurance Information
          </label>
          <div className="relative">
            <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              name="insurance"
              value={formData.insurance}
              onChange={handleInputChange}
              className="pl-10 w-full border border-gray-300 rounded-md shadow-sm p-2"
              placeholder="Enter insurance details"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Allergies
          </label>
          <div className="relative">
            <AlertTriangle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              name="allergies"
              value={formData.allergies}
              onChange={handleInputChange}
              className="pl-10 w-full border border-gray-300 rounded-md shadow-sm p-2"
              placeholder="Enter allergies (if any)"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-6">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={`px-4 py-2 text-white rounded-md transition-colors ${
            type === 'add' 
              ? 'bg-green-600 hover:bg-green-700' 
              : 'bg-blue-600 hover:bg-blue-700'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {type === 'add' ? 'Adding...' : 'Updating...'}
            </span>
          ) : (
            <span className="flex items-center">
              {type === 'add' ? (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Customer
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Update Customer
                </>
              )}
            </span>
          )}
        </button>
      </div>
    </form>
  );

  const renderView = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 p-3 rounded-md">
          <div className="flex items-center mb-2">
            <User className="h-4 w-4 text-gray-500 mr-2" />
            <span className="text-sm font-medium text-gray-700">Name</span>
          </div>
          <p className="text-gray-900">{customer?.name || 'Not provided'}</p>
        </div>

        <div className="bg-gray-50 p-3 rounded-md">
          <div className="flex items-center mb-2">
            <Phone className="h-4 w-4 text-gray-500 mr-2" />
            <span className="text-sm font-medium text-gray-700">Phone</span>
          </div>
          <p className="text-gray-900">{customer?.phone || 'Not provided'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 p-3 rounded-md">
          <div className="flex items-center mb-2">
            <Mail className="h-4 w-4 text-gray-500 mr-2" />
            <span className="text-sm font-medium text-gray-700">Email</span>
          </div>
          <p className="text-gray-900">{customer?.email || 'Not provided'}</p>
        </div>

        <div className="bg-gray-50 p-3 rounded-md">
          <div className="flex items-center mb-2">
            <Calendar className="h-4 w-4 text-gray-500 mr-2" />
            <span className="text-sm font-medium text-gray-700">Date of Birth</span>
          </div>
          <p className="text-gray-900">{formatDate(customer?.dob || '')}</p>
        </div>
      </div>

      <div className="bg-gray-50 p-3 rounded-md">
        <div className="flex items-center mb-2">
          <MapPin className="h-4 w-4 text-gray-500 mr-2" />
          <span className="text-sm font-medium text-gray-700">Address</span>
        </div>
        <p className="text-gray-900">{customer?.address || 'Not provided'}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 p-3 rounded-md">
          <div className="flex items-center mb-2">
            <Shield className="h-4 w-4 text-gray-500 mr-2" />
            <span className="text-sm font-medium text-gray-700">Insurance</span>
          </div>
          <p className="text-gray-900">{customer?.insurance || 'Not provided'}</p>
        </div>

        <div className="bg-gray-50 p-3 rounded-md">
          <div className="flex items-center mb-2">
            <AlertTriangle className="h-4 w-4 text-gray-500 mr-2" />
            <span className="text-sm font-medium text-gray-700">Allergies</span>
          </div>
          <p className="text-gray-900">{customer?.allergies || 'None'}</p>
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );

  const renderDelete = () => (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex items-center mb-2">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-sm font-medium text-red-800">Confirm Deletion</span>
        </div>
        <p className="text-red-700 text-sm">
          Are you sure you want to delete <strong>{customer?.name}</strong>? 
          This action cannot be undone and will permanently remove all customer data.
        </p>
      </div>

      <div className="bg-gray-50 p-3 rounded-md">
        <h4 className="font-medium text-gray-700 mb-2">Customer Details</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p><strong>Name:</strong> {customer?.name}</p>
          <p><strong>Phone:</strong> {customer?.phone}</p>
          <p><strong>Email:</strong> {customer?.email || 'Not provided'}</p>
          <p><strong>Address:</strong> {customer?.address}</p>
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Customer
            </>
          )}
        </button>
      </div>
    </div>
  );

  const getModalTitle = () => {
    switch (type) {
      case 'add': return 'Add New Customer';
      case 'edit': return 'Edit Customer';
      case 'view': return 'Customer Details';
      case 'delete': return 'Delete Customer';
      default: return 'Customer';
    }
  };

  const getModalIcon = () => {
    switch (type) {
      case 'add': return <Plus className="h-5 w-5 text-green-600" />;
      case 'edit': return <Edit className="h-5 w-5 text-blue-600" />;
      case 'view': return <Eye className="h-5 w-5 text-gray-600" />;
      case 'delete': return <Trash2 className="h-5 w-5 text-red-600" />;
      default: return <User className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            {getModalIcon()}
            <h2 className="text-xl font-semibold text-gray-900 ml-3">
              {getModalTitle()}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {type === 'add' || type === 'edit' ? renderForm() :
           type === 'view' ? renderView() :
           type === 'delete' ? renderDelete() : null}
        </div>
      </div>
    </div>
  );
};

export default CustomerModal; 