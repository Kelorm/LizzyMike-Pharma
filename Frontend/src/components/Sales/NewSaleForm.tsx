// src/components/Sales/NewSaleForm.tsx
import React, { useState, useMemo } from 'react';
import { Plus, X, Search, Trash2, ArrowRight, ChevronDown } from 'lucide-react';
import { Medication, Customer, SaleItem, Sale } from '../../types';
import { useMedicationContext } from '../../contexts/MedicationContext';
import { useSalesContext } from '../../contexts/SalesContext';
import MedicationComboBox from '../MedicationComboBox';
import ReceiptGenerator from '../ReceiptGenerator';

interface NewSaleFormProps {
  onClose: () => void;
  onSaveSuccess?: (sale: any) => void;
}

const NewSaleForm = ({ onClose, onSaveSuccess }: NewSaleFormProps) => {
  const { medications } = useMedicationContext();
  const { addSale } = useSalesContext();
  // Remove step state
  // const [step, setStep] = useState<number>(1);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'insurance' | 'cash' | 'card' | 'insurance-copay'>('cash');
  const [saleItems, setSaleItems] = useState<SaleItem[]>([
    {
      medication: '', medication_name: '', qty: 1, price: 0, cost: 0,
      id: '',
      sale: ''
    }
  ]);
  const [notes, setNotes] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [showMedicationSearch, setShowMedicationSearch] = useState(new Array(saleItems.length).fill(false));
  
  // Receipt generation state
  const [showReceipt, setShowReceipt] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  
  // Filter available medications that are in stock
  const availableMedications = useMemo(() => {
    return medications.filter(med => med.stock > 0);
  }, [medications]);

  // Filter customers based on search term
  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return [];
    
    // Mock customer data - in a real app, this would come from an API
    return [
      { id: 1, name: "John Doe", phone: "024-123-4567", insurance: "NHIS Gold" },
      { id: 2, name: "Jane Smith", phone: "020-987-6543", insurance: "Private" },
      { id: 3, name: "Kwame Asante", phone: "027-555-1234", insurance: "NHIS Silver" },
      { id: 4, name: "Ama Boateng", phone: "054-321-0987", insurance: "Corporate" },
      { id: 5, name: "Yaw Mensah", phone: "057-777-8888", insurance: "NHIS Gold" },
    ].filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.phone.includes(searchTerm)
    );
  }, [searchTerm]);

  // Calculate totals
  const totals = useMemo(() => {
    return saleItems.reduce((acc, item) => {
      acc.subtotal += item.price * item.qty;
      acc.totalCost += item.cost * item.qty;
      return acc;
    }, { subtotal: 0, totalCost: 0 });
  }, [saleItems]);

  const profit = totals.subtotal - totals.totalCost;
  const profitMargin = totals.subtotal > 0 ? (profit / totals.subtotal) * 100 : 0;

  // Utility function to safely format numbers
  const formatNumber = (value: any): string => {
    const num = typeof value === 'number' ? value : parseFloat(value);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  // Handle medication selection
  const handleMedicationSelect = (index: number, medication: Medication) => {
    const newItems = [...saleItems];
    newItems[index] = {
      ...newItems[index],
      medication: medication.id,
      medication_name: medication.name,
      price: parseFloat(medication.price as any) || 0,
      cost: parseFloat(medication.cost as any) || 0
    };
    setSaleItems(newItems);
    
    // Close the dropdown
    const newShowMedicationSearch = [...showMedicationSearch];
    newShowMedicationSearch[index] = false;
    setShowMedicationSearch(newShowMedicationSearch);
  };

  // Handle price change
  const handlePriceChange = (index: number, price: number) => {
    const newItems = [...saleItems];
    newItems[index] = {
      ...newItems[index],
      price: price
    };
    setSaleItems(newItems);
  };

  // Add a new medication item
  const handleAddItem = () => {
    setSaleItems([...saleItems, {
      medication: '', medication_name: '', qty: 1, price: 0, cost: 0,
      id: '',
      sale: ''
    }]);
    
    // Update the showMedicationSearch array
    setShowMedicationSearch([...showMedicationSearch, false]);
  };
  // Remove a medication item
  const handleRemoveItem = (index: number) => {
    if (saleItems.length <= 1) return;
    
    const newItems = [...saleItems];
    newItems.splice(index, 1);
    setSaleItems(newItems);
    
    const newShowMedicationSearch = [...showMedicationSearch];
    newShowMedicationSearch.splice(index, 1);
    setShowMedicationSearch(newShowMedicationSearch);
  };

  // Update the quantity input to handle strings
  const handleQuantityChange = (index: number, value: string | number) => {
    const numericValue = typeof value === 'string' ? parseInt(value) || 1 : value;
    const newItems = [...saleItems];
    const medication = availableMedications.find(m => m.id === newItems[index].medication);
    let finalValue = numericValue;
    if (medication && finalValue > medication.stock) {
      finalValue = medication.stock;
    }
    if (finalValue < 1) finalValue = 1;
    newItems[index].qty = finalValue;
    setSaleItems(newItems);
  };

  // Submit the sale - UPDATED VERSION with auto-print
  const handleSubmit = async () => {
    try {
      const saleData = {
        customer: customer ? customer.id.toString() : "0",
        customer_name: customer ? customer.name : "Walk-in Customer",
        date: new Date().toISOString(),
        total: totals.subtotal,
        subtotal: totals.subtotal,
        discount_total: 0,
        payment_method: paymentMethod as "insurance" | "cash" | "card" | "insurance-copay",
        notes,
        items: saleItems.map(item => ({
          ...item,
          medication: item.medication.toString() // Convert to string
        }))
      };
      
      const newSale = await addSale(saleData);
      
      if (onSaveSuccess) {
        onSaveSuccess(newSale);
      }
      
      // Show receipt and auto-print instead of opening PDF
      if (newSale && newSale.id && newSale.id !== 'undefined' && newSale.id !== 'null') {
        setCompletedSale(newSale);
        setShowReceipt(true);
        // Don't close the form yet - let user see the receipt first
      } else {
        console.error('Invalid sale ID received:', newSale?.id);
        alert('Sale created successfully, but could not generate receipt. Please check the sales list.');
        onClose();
      }
    } catch (error) {
      console.error("Failed to create sale:", error);
      alert("Failed to create sale. Please check your inputs and try again.");
    }
  };

  // Render medication info with safe number formatting
  const renderMedicationInfo = (medication: Medication, item: SaleItem) => (
    <div className="mt-3 grid grid-cols-3 gap-2 text-xs bg-blue-50 p-2 rounded">
      <div>
        <span className="font-medium">Cost:</span> GHS {formatNumber(medication.cost)}
      </div>
      <div>
        <span className="font-medium">Profit:</span> GHS {formatNumber(item.price - (medication.cost || 0))}
      </div>
      <div>
        <span className="font-medium">After Sale:</span> {medication.stock - item.qty}
      </div>
    </div>
  );

  // Render summary items with safe number formatting
  const renderSummaryItem = (item: SaleItem, index: number) => {
    const price = parseFloat(item.price as any) || 0;
    const quantity = parseInt(item.qty as any) || 0;
    return (
      <div key={index} className="flex justify-between border-b pb-3">
        <div>
          <div className="font-medium">{item.medication_name}</div>
          <div className="text-sm text-gray-600">
            {quantity} × GHS {formatNumber(price)}
          </div>
        </div>
        <div className="font-medium">
          GHS {formatNumber(price * quantity)}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      {/* Form Header */}
      <div className="bg-blue-600 text-white p-4 sm:p-6 rounded-t-lg">
        <div className="flex justify-between items-center">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold">New Sale Transaction</h2>
          <button onClick={onClose} className="text-white hover:text-blue-200 p-1">
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>
      {/* Form Body - All sections visible */}
      <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
        {/* Customer Selection */}
        <div className="space-y-4">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800">Select Customer</h3>
            <div className="border rounded-lg p-3 sm:p-4">
              {customer ? (
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
                  <div>
                    <h4 className="font-bold text-sm sm:text-base">{customer.name}</h4>
                    <p className="text-gray-600 text-xs sm:text-sm">{customer.phone} • {customer.insurance}</p>
                  </div>
                  <button 
                    onClick={() => setCustomer(null)}
                    className="text-red-600 hover:text-red-800 text-sm bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md transition-colors"
                  >
                    Change Customer
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 sm:p-3 border rounded-lg text-sm"
                  />
                  {showCustomerSearch && (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          onClick={() => {
                            // Create a proper Customer object with all required fields
                            const fullCustomer: Customer = {
                              id: customer.id.toString(),
                              name: customer.name,
                              phone: customer.phone,
                              insurance: customer.insurance,
                              email: '', // Default empty values for required fields
                              address: '',
                              dob: '',
                              allergies: ''
                            };
                            setCustomer(fullCustomer);
                            setShowCustomerSearch(false);
                            setSearchTerm('');
                          }}
                          className="w-full text-left p-2 hover:bg-gray-50 rounded border text-sm"
                        >
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-gray-600 text-xs">{customer.phone} • {customer.insurance}</div>
                        </button>
                      ))}
                    </div>
                  )}
                  {!showCustomerSearch && (
                    <div className="space-y-3">
                      <button
                        onClick={() => setShowCustomerSearch(true)}
                        className="w-full p-2 sm:p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors text-sm"
                      >
                        + Add Customer
                      </button>
                      <div className="text-center">
                        <button 
                          onClick={() => {
                            // Create a walk-in customer object
                            const walkInCustomer: Customer = {
                              id: "0",
                              name: "Walk-in Customer",
                              phone: "",
                              insurance: "",
                              email: "",
                              address: "",
                              dob: "",
                              allergies: ""
                            };
                            setCustomer(walkInCustomer);
                          }}
                          className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
                        >
                          Proceed without customer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
        </div>
        
        {/* Medication Items */}
        <div className="space-y-4">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800">Medication Items</h3>
          <div className="space-y-4">
            {saleItems.map((item, index) => {
              const medication = availableMedications.find(m => m.id.toString() === item.medication);
              return (
                <div key={index} className="border rounded-lg p-3 sm:p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Medication Selection */}
                    <div className="sm:col-span-2 lg:col-span-1">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Medication</label>
                      <button
                        onClick={() => {
                          const newShow = [...showMedicationSearch];
                          newShow[index] = true;
                          setShowMedicationSearch(newShow);
                        }}
                        className="w-full p-2 sm:p-3 border rounded-lg text-left text-sm bg-white hover:bg-gray-50 transition-colors"
                      >
                        {item.medication_name || 'Select medication...'}
                      </button>
                    </div>
                    
                    {/* Quantity */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => handleQuantityChange(index, parseInt(e.target.value))}
                        className="w-full p-2 sm:p-3 border rounded-lg text-sm"
                      />
                    </div>
                    
                    {/* Price */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Price (GHS)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.price}
                        onChange={(e) => handlePriceChange(index, parseFloat(e.target.value))}
                        className="w-full p-2 sm:p-3 border rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  
                  {/* Medication Info */}
                  {medication && renderMedicationInfo(medication, item)}
                  
                  {/* Remove Button */}
                  {saleItems.length > 1 && (
                    <button 
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-600 hover:text-red-800 text-sm bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md transition-colors"
                    >
                      <Trash2 size={16} className="inline mr-1" />
                      Remove Item
                    </button>
                  )}
                  
                  {/* Medication Search Modal */}
                  {showMedicationSearch[index] && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold">Select Medication</h3>
                          <button 
                            onClick={() => {
                              const newShow = [...showMedicationSearch];
                              newShow[index] = false;
                              setShowMedicationSearch(newShow);
                            }}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <X size={20} />
                          </button>
                        </div>
                        <div className="mb-4">
                          <MedicationComboBox
                            medications={availableMedications}
                            value={item.medication ? item.medication.toString() : null}
                            onChange={(id) => {
                              const med = availableMedications.find(m => m.id.toString() === id);
                              if (med) {
                                handleMedicationSelect(index, med);
                                // Close the modal after selection
                                const newShow = [...showMedicationSearch];
                                newShow[index] = false;
                                setShowMedicationSearch(newShow);
                              }
                            }}
                            showStock={true}
                          />
                        </div>
                        {medication && (
                          <div className="border rounded-lg p-4 mt-4 bg-gray-50">
                            <h4 className="font-bold text-sm sm:text-base mb-2">{medication.name}</h4>
                            <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                              <div>
                                <span className="font-medium">Category:</span> {medication.category}
                              </div>
                              <div>
                                <span className="font-medium">Stock:</span> {medication.stock}
                              </div>
                              <div>
                                <span className="font-medium">Price:</span> GHS {formatNumber(medication.price)}
                              </div>
                              <div>
                                <span className="font-medium">Expiry:</span> {new Date(medication.expiry).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <button
              onClick={handleAddItem}
              className="flex items-center text-blue-600 hover:text-blue-800 text-sm bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-md transition-colors"
            >
              <Plus className="mr-1" size={16} />
              Add another medication
            </button>
          </div>
        </div>
        
        {/* Payment and Customer Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Payment Details */}
          <div className="space-y-4 sm:space-y-6">
            <div className="border rounded-lg p-3 sm:p-4">
              <h4 className="font-bold text-base sm:text-lg mb-3 sm:mb-4">Payment Method</h4>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {(['cash', 'card', 'insurance', 'insurance-copay'] as const).map(method => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`p-2 sm:p-3 border rounded-lg text-center text-xs sm:text-sm transition-colors ${
                      paymentMethod === method 
                        ? 'border-blue-500 bg-blue-50 text-blue-600' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {method === 'cash' && 'Cash'}
                    {method === 'card' && 'Credit Card'}
                    {method === 'insurance' && 'Insurance'}
                    {method === 'insurance-copay' && 'Insurance Copay'}
                  </button>
                ))}
              </div>
            </div>
            <div className="border rounded-lg p-3 sm:p-4">
              <h4 className="font-bold text-base sm:text-lg mb-3 sm:mb-4">Customer Information</h4>
              {customer ? (
                <div className="space-y-2">
                  <div className="font-medium text-sm sm:text-base">{customer.name}</div>
                  <div className="text-gray-600 text-xs sm:text-sm">{customer.phone}</div>
                  {customer.insurance && (
                    <div className="mt-2">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs sm:text-sm">
                        {customer.insurance}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-500 text-sm">No customer selected</div>
              )}
            </div>
            <div className="border rounded-lg p-3 sm:p-4">
              <h4 className="font-bold text-base sm:text-lg mb-3 sm:mb-4">Additional Notes</h4>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any special instructions..."
                className="w-full p-2 sm:p-3 border rounded-lg min-h-[80px] sm:min-h-[100px] text-sm resize-none"
              />
            </div>
          </div>
          
          {/* Order Summary */}
          <div className="border rounded-lg p-3 sm:p-4">
            <h4 className="font-bold text-base sm:text-lg mb-3 sm:mb-4">Order Summary</h4>
            <div className="space-y-3">
              {saleItems.map((item, index) => (
                <div key={index} className="flex justify-between items-center border-b pb-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm sm:text-base truncate">{item.medication_name}</div>
                    <div className="text-xs sm:text-sm text-gray-600">
                      {item.qty} × GHS {formatNumber(item.price)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <div className="font-medium text-sm sm:text-base">
                      GHS {formatNumber(item.price * item.qty)}
                    </div>
                    <button
                      className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                      aria-label="Edit item"
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-edit">
                        <path d="M11 4h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                        <path d="M15 2l-7.5 7.5"></path>
                      </svg>
                    </button>
                    <button
                      className="p-1 hover:bg-gray-100 rounded text-red-600 hover:text-red-800"
                      aria-label="Remove item"
                      onClick={() => handleRemoveItem(index)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              <div className="pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>GHS {formatNumber(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm text-gray-600">
                  <span>Profit Margin</span>
                  <span>{formatNumber(profitMargin)}%</span>
                </div>
                <div className="flex justify-between font-bold text-base sm:text-lg pt-2 border-t">
                  <span>Total</span>
                  <span>GHS {formatNumber(totals.subtotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Complete Sale Button */}
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSubmit}
            className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white rounded-lg flex items-center justify-center hover:bg-green-700 transition-colors text-sm sm:text-base font-medium"
          >
            Complete Sale
            <ArrowRight className="ml-2" size={18} />
          </button>
        </div>
      </div>
      
      {/* Receipt Generator Modal - Auto-opens after sale creation */}
      {showReceipt && completedSale && (
        <ReceiptGenerator
          sale={completedSale}
          customer={customer || undefined}
          onClose={() => {
            setShowReceipt(false);
            setCompletedSale(null);
            onClose(); // Close the NewSaleForm after receipt is closed
          }}
        />
      )}
    </div>
  );
};

export default NewSaleForm;