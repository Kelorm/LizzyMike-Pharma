import React, { useState, useEffect } from 'react';
import { Plus, X, Search, AlertCircle, CheckCircle, Package } from 'lucide-react';
import { Medication, Restock } from '../../types';
import { useMedicationContext } from '../../contexts/MedicationContext';

interface RestockFormProps {
  onClose: () => void;
  onRestockSuccess?: (restock: Restock) => void;
  medication?: Medication; // Pre-select a medication
}

const RestockForm = ({ onClose, onRestockSuccess, medication }: RestockFormProps) => {
  const { medications, updateMedicationStock } = useMedicationContext();
  
  // Safe number formatting function
  const formatNumber = (value: any): string => {
    const num = typeof value === 'number' ? value : parseFloat(value);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(medication || null);
  const [quantity, setQuantity] = useState<number>(1);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [supplier, setSupplier] = useState<string>('');
  const [batchNumber, setBatchNumber] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [showMedicationSearch, setShowMedicationSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate total cost
  const totalCost = quantity * unitCost;

  // Generate batch number if empty
  useEffect(() => {
    if (!batchNumber) {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      setBatchNumber(`BATCH-${timestamp}-${random}`);
    }
  }, [batchNumber]);

  // Set default expiry date (1 year from now)
  useEffect(() => {
    if (!expiryDate) {
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      setExpiryDate(oneYearFromNow.toISOString().split('T')[0]);
    }
  }, [expiryDate]);

  // Set unit cost when medication is selected
  useEffect(() => {
    if (selectedMedication) {
      setUnitCost(selectedMedication.cost || 0);
    }
  }, [selectedMedication]);

  const handleSubmit = async () => {
    if (!selectedMedication) {
      alert('Please select a medication');
      return;
    }

    if (quantity <= 0) {
      alert('Quantity must be greater than 0');
      return;
    }

    if (unitCost < 0) {
      alert('Unit cost cannot be negative');
      return;
    }

    if (!supplier.trim()) {
      alert('Please enter a supplier');
      return;
    }

    if (!expiryDate) {
      alert('Please select an expiry date');
      return;
    }

    setIsSubmitting(true);

    try {
      const restockData = {
        medication: selectedMedication.id,
        medication_name: selectedMedication.name,
        quantity: quantity,
        unit_cost: unitCost,
        total_cost: totalCost,
        supplier: supplier,
        batch_number: batchNumber,
        expiry_date: expiryDate,
        notes: notes,
        date_restocked: new Date().toISOString()
      };

      console.log('Sending restock data:', restockData);

      // Call API to create restock
      const response = await fetch('http://127.0.0.1:8000/api/restocks/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(restockData)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error response:', errorData);
        throw new Error(`Failed to create restock: ${response.status} ${errorData}`);
      }

      const newRestock = await response.json();
      console.log('Created restock:', newRestock);

      // Update local medication stock
      updateMedicationStock(selectedMedication.id, quantity);

      if (onRestockSuccess) {
        onRestockSuccess(newRestock);
      }

      onClose();
    } catch (error) {
      console.error('Restock error:', error);
      alert('Failed to create restock. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMedications = medications.filter(med => 
    med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    med.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-green-600 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Package className="mr-3" size={24} />
              <h2 className="text-2xl font-bold">Restock Medication</h2>
            </div>
            <button onClick={onClose} className="text-white hover:text-green-200">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-6">
          {/* Medication Selection */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">Select Medication</h3>
            <div className="border rounded-lg p-4">
              {selectedMedication ? (
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-bold">{selectedMedication.name}</h4>
                    <p className="text-gray-600">
                      {selectedMedication.category} • Current Stock: {selectedMedication.stock}
                    </p>
                    <p className="text-sm text-gray-500">
                      Cost: GHS {formatNumber(selectedMedication.cost)}
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedMedication(null)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <button 
                    onClick={() => setShowMedicationSearch(true)}
                    className="w-full py-3 px-4 bg-green-50 text-green-600 rounded-lg flex items-center justify-center hover:bg-green-100"
                  >
                    <Search className="mr-2" size={18} />
                    Search medications to restock
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Restock Details */}
          {selectedMedication && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-800">Restock Details</h3>
              
              {/* Quantity and Cost */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter quantity"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit Cost (GHS) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitCost}
                    onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter unit cost"
                  />
                </div>
              </div>

              {/* Total Cost Display */}
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Cost:</span>
                  <span className="text-xl font-bold text-green-600">
                    GHS {formatNumber(totalCost)}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {quantity} units × GHS {formatNumber(unitCost)} per unit
                </div>
              </div>

              {/* Supplier and Batch */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supplier *
                  </label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter supplier name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Batch Number
                  </label>
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter batch number"
                  />
                </div>
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiry Date *
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  rows={3}
                  placeholder="Add any notes about this restock..."
                />
              </div>

              {/* Stock Preview */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <CheckCircle className="text-blue-600 mr-2" size={16} />
                  <span className="font-medium text-blue-800">Stock Preview</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Current Stock:</span>
                    <span className="ml-2 font-medium">{selectedMedication.stock}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">New Stock:</span>
                    <span className="ml-2 font-medium text-green-600">
                      {selectedMedication.stock + quantity}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          {selectedMedication && (
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <button
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-3 bg-green-600 text-white rounded-lg flex items-center hover:bg-green-700 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2" size={18} />
                    Complete Restock
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Medication Search Modal */}
        {showMedicationSearch && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Select Medication</h3>
                <button onClick={() => setShowMedicationSearch(false)}>
                  <X size={24} />
                </button>
              </div>
              
              <div className="relative mb-4">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search medications..."
                  className="w-full p-3 border rounded-lg pl-10"
                />
                <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
              </div>
              
              <div className="max-h-60 overflow-y-auto">
                {filteredMedications.length > 0 ? (
                  filteredMedications.map(med => (
                    <div 
                      key={med.id}
                      className="p-3 border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedMedication(med);
                        setShowMedicationSearch(false);
                      }}
                    >
                      <div className="font-medium">{med.name}</div>
                      <div className="text-sm text-gray-600">
                        {med.category} • Stock: {med.stock}
                      </div>
                      <div className="text-sm text-gray-500">
                        Cost: GHS {formatNumber(med.cost)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    {searchTerm ? "No medications found" : "Start typing to search medications"}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RestockForm; 