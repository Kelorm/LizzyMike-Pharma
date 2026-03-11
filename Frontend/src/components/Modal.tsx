import React, { useState, useEffect } from 'react';
import { Medication } from '../types';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import MedicationComboBox from './MedicationComboBox';
import getMedicationsForSale from '../services/api';

interface ModalProps {
  type: string;
  item?: any;
  onClose: () => void;
  onSaveMedication?: (medication: any, isEdit: boolean) => void;
  onDeleteMedication?: (id: number) => void;
  onSaveSale?: (saleData: any) => Promise<void>;
  onSaveRestock?: (restockData: any) => Promise<void>;
  medications?: Medication[];
  customers?: any[];
}

const Modal: React.FC<ModalProps> = ({ 
  type, 
  item, 
  onClose, 
  onSaveMedication, 
  onDeleteMedication,
  onSaveSale,
  onSaveRestock,
  medications = [],
  customers = []
}) => {
  const [formData, setFormData] = useState<any>(
    type === 'newSale'
      ? { customer: '', paymentMethod: 'cash' }
      : (item || {})
  );

  const [saleItems, setSaleItems] = useState<any[]>(
    type === 'newSale'
      ? [{ medication: null, quantity: 1, price: 0 }]
      : (item?.items || [{ medication: null, quantity: 1, price: 0 }])
  );
  
  const [availableMeds, setAvailableMeds] = useState<Medication[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // FAST FIX: Always filter locally for newSale
  useEffect(() => {
    const convertMedications = (meds: Medication[]): Medication[] => {
      return meds.map(med => ({
        ...med,
        id: med.id.toString()
      }));
    };

    if (type === 'newSale') {
      // Always filter locally for newSale
      const inStock = medications.filter(m => m.stock > 0);
      setAvailableMeds(convertMedications(inStock));
    } else if (type === 'restock') {
      // For restock, use all medications
      setAvailableMeds(convertMedications(medications));
    } else {
      setAvailableMeds(convertMedications(medications));
    }
  }, [type, medications]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear error when field changes
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSaleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...saleItems];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'medication') {
      const med = availableMeds.find(m => String(m.id) === String(value));
      if (med) {
        newItems[index].price = med.price;
        newItems[index].maxQuantity = med.stock;
        
        // Reset quantity if it exceeds new stock
        if (newItems[index].quantity > med.stock) {
          newItems[index].quantity = med.stock;
          toast.error(`Cannot exceed available stock of ${med.stock}`);
        }
      }
    }
    
    if (field === 'quantity' && newItems[index].medication) {
      const med = availableMeds.find(m => m.id === newItems[index].medication);
      if (med && value > med.stock) {
        newItems[index].quantity = med.stock;
        toast.error(`Cannot exceed available stock of ${med.stock}`);
      }
    }
    
    setSaleItems(newItems);
    
    // Clear error when field changes
    const errorKey = `${field}-${index}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const handleAddItem = () => {
    setSaleItems([...saleItems, { medication: null, quantity: 1, price: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (saleItems.length === 1) return;
    const newItems = [...saleItems];
    newItems.splice(index, 1);
    setSaleItems(newItems);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (type === 'newSale') {
      if (!formData.customer) newErrors.customer = 'Customer is required';
      
      saleItems.forEach((item, index) => {
        if (!item.medication) newErrors[`medication-${index}`] = 'Medication is required';
        if (!item.quantity || item.quantity <= 0) newErrors[`quantity-${index}`] = 'Quantity must be greater than 0';
      });
    }
    
    if (type === 'restock') {
      if (!formData.medication) newErrors.medication = 'Medication is required';
      if (!formData.supplier) newErrors.supplier = 'Supplier is required';
      if (!formData.quantity || formData.quantity <= 0) newErrors.quantity = 'Quantity must be greater than 0';
      if (!formData.unit_cost || formData.unit_cost <= 0) newErrors.unit_cost = 'Unit cost must be greater than 0';
      if (!formData.expiry) newErrors.expiry = 'Expiry date is required';
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
    
    try {
      if (type.includes('Medication')) {
        const isEdit = type.startsWith('edit');
        onSaveMedication?.(formData, isEdit);
      } 
      else if (type === 'newSale') {
        const total = saleItems.reduce((sum, item) => {
          const price = typeof item.price === 'string' ? 
            parseFloat(item.price) : item.price;
          return sum + (price * item.quantity);
        }, 0);
        const saleData = {
          customer: parseInt(formData.customer, 10),
          paymentMethod: formData.paymentMethod,
          total,
          items: saleItems.map((item) => ({
            medication: item.medication,
            quantity: item.quantity,
            price: item.price
          }))
        };
        await onSaveSale?.(saleData);
      }
      else if (type === 'restock') {
        const restockData = {
          medication: formData.medication,
          supplier: formData.supplier,
          quantity: parseInt(formData.quantity),
          batch_number: formData.batch_number,
          expiry: formData.expiry,
          unit_cost: parseFloat(formData.unit_cost),
        };
        await onSaveRestock?.(restockData);
      }
      onClose();
    } catch (err) {
      console.error('Operation failed:', err);
      toast.error('Operation failed. Please try again.');
    }
  };

  const CustomerSelector = ({ customers, value, onChange }: { customers: any[], value: any, onChange: (val: any) => void }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Customer *
      </label>
      <select
        value={value || ''}
        onChange={e => {
          onChange(e.target.value);
          if (errors.customer) {
            setErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors.customer;
              return newErrors;
            });
          }
        }}
        className={`w-full border ${errors.customer ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2`}
        required
      >
        <option value="">Select Customer</option>
        {customers.map(customer => (
          <option key={customer.id} value={customer.id}>
            {customer.name} ({customer.phone || customer.insurance || 'No phone'})
          </option>
        ))}
      </select>
      {errors.customer && <p className="mt-1 text-xs text-red-600">{errors.customer}</p>}
    </div>
  );

  const renderForm = () => {
    switch (type) {
      case 'addMedication':
      case 'editMedication':
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Category *</label>
                <input
                  type="text"
                  name="category"
                  value={formData.category || ''}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Supplier *</label>
                <input
                  type="text"
                  name="supplier"
                  value={formData.supplier || ''}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Stock *</label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock || ''}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  required
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Min Stock *</label>
                <input
                  type="number"
                  name="min_stock"
                  value={formData.min_stock || ''}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  required
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Cost Price (GHS)</label>
                <input
                  type="number"
                  name="cost"
                  value={formData.cost || ''}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  required
                  min="0.01"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Sale Price (GHS)</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price || ''}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  required
                  min="0.01"
                  step="0.01"
                />
              </div>
            </div>

            {formData.cost && formData.price && (
              <div className="bg-gray-50 p-3 rounded-md mt-2">
                <div className="text-sm font-medium text-gray-700">Profit Information</div>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div>
                    <span className="text-xs text-gray-500">Profit:</span>
                    <span className="ml-2 font-medium text-green-600">
                      GHS {(parseFloat(formData.price) - parseFloat(formData.cost)).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Margin:</span>
                    <span className="ml-2 font-medium text-green-600">
                      {((parseFloat(formData.price) - parseFloat(formData.cost)) / parseFloat(formData.cost) * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Expiry Date *</label>
                <input
                  type="date"
                  name="expiry"
                  value={formData.expiry || ''}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Batch Number *</label>
                <input
                  type="text"
                  name="batch_no"
                  value={formData.batch_no || ''}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {type === 'addMedication' ? 'Add Medication' : 'Update Medication'}
              </button>
            </div>
          </form>
        );

      case 'deleteMedication':
        return (
          <div>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete <strong>{item?.name}</strong>? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteMedication?.(item.id);
                  onClose();
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete Medication
              </button>
            </div>
          </div>
        );

      case 'newSale':
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <CustomerSelector
              customers={customers}
              value={formData.customer}
              onChange={val => setFormData({ ...formData, customer: val })}
            />
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Items *</label>
              {saleItems.map((item, index) => {
                const selectedMed = availableMeds.find(m => m.id === item.medication);
                const stock = selectedMed?.stock || 0;
                
                return (
                  <div key={index} className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Medication *</label>
                      <MedicationComboBox
                        medications={availableMeds}
                        value={item.medication}
                        onChange={(value) => handleSaleItemChange(index, 'medication', value)}
                        className="w-full"
                      />
                      {errors[`medication-${index}`] && (
                        <p className="mt-1 text-xs text-red-600">{errors[`medication-${index}`]}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3">
                      <div className="md:col-span-3">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Quantity</label>
                        <input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => handleSaleItemChange(index, 'quantity', parseInt(e.target.value || '0'))}
                          className={`w-full border ${errors[`quantity-${index}`] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm p-2 text-sm`}
                          min="1"
                          max={stock}
                          required
                        />
                        {errors[`quantity-${index}`] && (
                          <p className="mt-1 text-xs text-red-600">{errors[`quantity-${index}`]}</p>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          Max: {stock}
                        </div>
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Price (GHS)</label>
                        <input
                          type="number"
                          placeholder="Price"
                          value={item.price}
                          onChange={(e) => handleSaleItemChange(index, 'price', parseFloat(e.target.value || '0'))}
                          className={`w-full border ${errors[`price-${index}`] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm p-2 text-sm`}
                          min="0.01"
                          step="0.01"
                          required
                        />
                        {selectedMed && (
                          <div className="text-xs text-gray-500 mt-1">
                            Current: {selectedMed.price}
                          </div>
                        )}
                      </div>
                    </div>
                    {selectedMed && (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs bg-white p-2 rounded border">
                        <div>
                          <span className="font-medium">Cost:</span> GHS {selectedMed.cost?.toFixed(2) ?? '0.00'}
                        </div>
                        <div>
                          <span className="font-medium">Profit:</span> GHS {(item.price - (selectedMed.cost ?? 0)).toFixed(2)}
                        </div>
                        <div>
                          <span className="font-medium">Margin:</span> {selectedMed.cost ? (((item.price - selectedMed.cost) / selectedMed.cost) * 100).toFixed(2) : '0.00'}%
                        </div>
                        <div>
                          <span className="font-medium">After Sale:</span> {stock - item.quantity} left
                        </div>
                      </div>
                    )}
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-600 hover:text-red-800 text-sm flex items-center"
                        disabled={saleItems.length === 1}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove Item
                      </button>
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Another Item
              </button>
            </div>
            
            <div>
              <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700">
                Payment Method *
              </label>
              <select
                name="paymentMethod"
                value={formData.paymentMethod || 'cash'}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                required
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="mobile_money">Mobile Money</option>
              </select>
            </div>
            
            <div className="mt-4 p-3 bg-gray-50 rounded">
              <div className="flex justify-between font-semibold">
                <span>Total:</span>
                <span>
                  GHS {saleItems.reduce((sum, item) => {
                    const price = typeof item.price === 'string' ? 
                      parseFloat(item.price) : item.price;
                    return sum + (price * item.quantity);
                  }, 0).toFixed(2)}
                </span>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Complete Sale
              </button>
            </div>
          </form>
        );

      case 'restock':
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Medication *</label>
              <MedicationComboBox
                medications={availableMeds}
                value={formData.medication}
                onChange={(value) => {
                  setFormData({ ...formData, medication: value });
                  if (errors.medication) {
                    setErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.medication;
                      return newErrors;
                    });
                  }
                  
                  const med = availableMeds.find(m => String(m.id) === String(value));
                  if (med) {
                    setFormData((prev: any) => ({
                      ...prev,
                      supplier: med.supplier || ''
                    }));
                  }
                }}
                className="mt-1"
              />
              {errors.medication && <p className="mt-1 text-xs text-red-600">{errors.medication}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Supplier *</label>
              <input
                type="text"
                name="supplier"
                value={formData.supplier || ''}
                onChange={handleInputChange}
                className={`mt-1 block w-full border ${errors.supplier ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm p-2`}
                required
              />
              {errors.supplier && <p className="mt-1 text-xs text-red-600">{errors.supplier}</p>}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Quantity *</label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity || ''}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full border ${errors.quantity ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm p-2`}
                  required
                  min="1"
                />
                {errors.quantity && <p className="mt-1 text-xs text-red-600">{errors.quantity}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Unit Cost (GHS) *</label>
                <input
                  type="number"
                  name="unit_cost"
                  value={formData.unit_cost || ''}
                  onChange={(e) => {
                    handleInputChange(e);
                    // Recalculate total cost
                    if (formData.quantity) {
                      setFormData({
                        ...formData,
                        unit_cost: e.target.value,
                        total_cost: parseFloat(e.target.value || '0') * parseFloat(formData.quantity || '0')
                      });
                    }
                  }}
                  className={`mt-1 block w-full border ${errors.unit_cost ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm p-2`}
                  required
                  min="0.01"
                  step="0.01"
                />
                {errors.unit_cost && <p className="mt-1 text-xs text-red-600">{errors.unit_cost}</p>}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Batch Number *</label>
                <input
                  type="text"
                  name="batch_number"
                  value={formData.batch_number || ''}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Expiry Date *</label>
                <input
                  type="date"
                  name="expiry"
                  value={formData.expiry || ''}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full border ${errors.expiry ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm p-2`}
                  required
                />
                {errors.expiry && <p className="mt-1 text-xs text-red-600">{errors.expiry}</p>}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Total Cost (GHS)</label>
              <input
                type="text"
                name="total_cost"
                value={(parseFloat(formData.quantity || '0') * parseFloat(formData.unit_cost || '0')).toFixed(2)}
                disabled
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100"
              />
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Record Restock
              </button>
            </div>
          </form>
        );

      default:
        return (
          <>
            <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded max-h-64 overflow-y-auto">
              {item ? JSON.stringify(item, null, 2) : 'No item selected.'}
            </div>
            <div className="mt-4 text-right">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </>
        );
    }
  };

  const getModalTitle = () => {
    switch (type) {
      case 'addMedication':
        return 'Add Medication';
      case 'editMedication':
        return 'Edit Medication';
      case 'deleteMedication':
        return 'Delete Medication';
      case 'newSale':
        return 'New Sale';
      case 'restock':
        return 'Restock Medication';
      default:
        return '';
    }
  };

  const renderModalContent = () => {
    switch (type) {
      case 'addMedication':
      case 'editMedication':
      case 'deleteMedication':
        return renderForm();
      case 'newSale':
      case 'restock':
        return (
          <>
            {renderForm()}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {type === 'newSale' ? 'Complete Sale' : 'Record Restock'}
              </button>
            </div>
          </>
        );
      default:
        return (
          <>
            <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded max-h-64 overflow-y-auto">
              {item ? JSON.stringify(item, null, 2) : 'No item selected.'}
            </div>
            <div className="mt-4 text-right">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 sm:p-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold">{getModalTitle()}</h2>
            <button onClick={onClose} className="text-white hover:text-blue-200 p-1">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {renderModalContent()}
        </div>
      </div>
    </div>
  );
};

export default Modal;