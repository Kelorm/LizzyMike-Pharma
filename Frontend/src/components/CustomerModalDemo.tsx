import React, { useState } from 'react';
import CustomerModal from './CustomerModal';
import { Customer } from '../types';
import { Plus, Edit, Eye, Trash2, Users } from 'lucide-react';

const CustomerModalDemo: React.FC = () => {
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view' | 'delete' | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>(undefined);

  // Sample customer data for demo
  const sampleCustomer: Customer = {
    id: '1',
    name: 'John Doe',
    phone: '+233 24 123 4567',
    email: 'john.doe@example.com',
    address: '123 Main Street, Accra, Ghana',
    dob: '1990-05-15',
    insurance: 'National Health Insurance',
    allergies: 'Penicillin, Sulfa drugs'
  };

  const handleOpenModal = (type: 'add' | 'edit' | 'view' | 'delete', customer?: Customer) => {
    setModalType(type);
    setSelectedCustomer(customer);
  };

  const handleCloseModal = () => {
    setModalType(null);
    setSelectedCustomer(undefined);
  };

  const handleSuccess = () => {
    // Refresh customer list or perform other actions
    console.log('Customer operation completed successfully');
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Customer Modal Demo</h1>
        <p className="text-gray-600">Click the buttons below to test different customer modal operations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <button
          onClick={() => handleOpenModal('add')}
          className="flex items-center justify-center p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Customer
        </button>

        <button
          onClick={() => handleOpenModal('edit', sampleCustomer)}
          className="flex items-center justify-center p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Edit className="h-5 w-5 mr-2" />
          Edit Customer
        </button>

        <button
          onClick={() => handleOpenModal('view', sampleCustomer)}
          className="flex items-center justify-center p-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Eye className="h-5 w-5 mr-2" />
          View Customer
        </button>

        <button
          onClick={() => handleOpenModal('delete', sampleCustomer)}
          className="flex items-center justify-center p-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Trash2 className="h-5 w-5 mr-2" />
          Delete Customer
        </button>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg">
        <div className="flex items-center mb-4">
          <Users className="h-5 w-5 text-gray-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Sample Customer Data</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Name:</strong> {sampleCustomer.name}
          </div>
          <div>
            <strong>Phone:</strong> {sampleCustomer.phone}
          </div>
          <div>
            <strong>Email:</strong> {sampleCustomer.email}
          </div>
          <div>
            <strong>Date of Birth:</strong> {new Date(sampleCustomer.dob).toLocaleDateString()}
          </div>
          <div className="md:col-span-2">
            <strong>Address:</strong> {sampleCustomer.address}
          </div>
          <div>
            <strong>Insurance:</strong> {sampleCustomer.insurance}
          </div>
          <div>
            <strong>Allergies:</strong> {sampleCustomer.allergies}
          </div>
        </div>
      </div>

      {/* Customer Modal */}
      {modalType && (
        <CustomerModal
          type={modalType}
          customer={selectedCustomer}
          onClose={handleCloseModal}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};

export default CustomerModalDemo; 