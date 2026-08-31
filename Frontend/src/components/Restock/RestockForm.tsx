import React, { useState, useEffect, useMemo } from 'react';
import { Plus, X, Search, AlertCircle, CheckCircle, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { Medication, Restock } from '../../types';
import { useMedicationContext } from '../../contexts/MedicationContext';
import api from '../../services/api';

interface RestockFormProps {
  onClose: () => void;
  onRestockSuccess?: (restock: Restock) => void;
  medication?: Medication;
}

function formatNumber(value: unknown): string {
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(num) ? num.toFixed(2) : '0.00';
}

function apiErrorMessage(err: unknown): string {
  const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
  if (!data) return 'Failed to create restock. Please try again.';
  if (typeof data.detail === 'string') return data.detail;
  return Object.values(data).flat().join(' ');
}

const RestockForm = ({ onClose, onRestockSuccess, medication }: RestockFormProps) => {
  const { medications } = useMedicationContext();

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

  const totalCost = quantity * unitCost;

  useEffect(() => {
    if (!selectedMedication) return;
    setUnitCost(Number(selectedMedication.cost) || 0);
    if (selectedMedication.supplier) {
      setSupplier(selectedMedication.supplier);
    }
    const medBatch = (selectedMedication.batch_no || '').trim();
    if (medBatch) {
      setBatchNumber(medBatch);
    } else {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      setBatchNumber(`BATCH-${timestamp}-${random}`);
    }
    if (selectedMedication.expiry) {
      setExpiryDate(selectedMedication.expiry.split('T')[0]);
    }
  }, [selectedMedication]);

  useEffect(() => {
    if (!expiryDate) {
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      setExpiryDate(oneYearFromNow.toISOString().split('T')[0]);
    }
  }, [expiryDate]);

  const batchHint = useMemo(() => {
    if (!selectedMedication || !batchNumber.trim()) return null;
    const normalized = batchNumber.trim();
    const existing = medications.find(
      (m) =>
        m.name === selectedMedication.name &&
        (m.batch_no || '').trim() === normalized &&
        m.id !== selectedMedication.id
    );
    if (existing) {
      return {
        type: 'existing' as const,
        message: `Existing batch — stock will increase on batch ${normalized} (current: ${existing.stock}).`,
        targetStock: existing.stock + quantity,
        targetId: existing.id,
      };
    }
    const sameBatch =
      (selectedMedication.batch_no || '').trim() === normalized ||
      !(selectedMedication.batch_no || '').trim();
    if (sameBatch) {
      return {
        type: 'increment' as const,
        message: `Stock will increase on the current inventory line.`,
        targetStock: selectedMedication.stock + quantity,
        targetId: selectedMedication.id,
      };
    }
    return {
      type: 'new' as const,
      message: `New batch — a separate inventory line will be created for ${normalized}.`,
      targetStock: quantity,
      targetId: null,
    };
  }, [selectedMedication, batchNumber, medications, quantity]);

  const handleSubmit = async () => {
    if (!selectedMedication) {
      toast.error('Please select a medication');
      return;
    }
    if (quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }
    if (unitCost < 0) {
      toast.error('Unit cost cannot be negative');
      return;
    }
    if (!supplier.trim()) {
      toast.error('Please enter a supplier');
      return;
    }
    if (!expiryDate) {
      toast.error('Please select an expiry date');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.restock.create({
        medication: selectedMedication.id,
        quantity,
        unit_cost: unitCost,
        supplier: supplier.trim(),
        batch_number: batchNumber.trim(),
        expiry_date: expiryDate,
        notes: notes.trim() || undefined,
      });
      toast.success('Restock recorded');
      onRestockSuccess?.(response.data);
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMedications = medications.filter(
    (med) =>
      med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      med.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-green-600 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Package className="mr-3" size={24} />
              <h2 className="text-2xl font-bold">Restock Medication</h2>
            </div>
            <button type="button" onClick={onClose} className="text-white hover:text-green-200">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">Select Medication</h3>
            <div className="border rounded-lg p-4">
              {selectedMedication ? (
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-bold">{selectedMedication.name}</h4>
                    <p className="text-gray-600">
                      {selectedMedication.category} • Batch: {selectedMedication.batch_no || '—'} • Stock:{' '}
                      {selectedMedication.stock}
                    </p>
                    <p className="text-sm text-gray-500">Cost: GHS {formatNumber(selectedMedication.cost)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedMedication(null)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowMedicationSearch(true)}
                  className="w-full py-3 px-4 bg-green-50 text-green-600 rounded-lg flex items-center justify-center hover:bg-green-100"
                >
                  <Search className="mr-2" size={18} />
                  Search medications to restock
                </button>
              )}
            </div>
          </div>

          {selectedMedication && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-800">Restock Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity *</label>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unit Cost (GHS) *</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={unitCost}
                    onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Cost:</span>
                  <span className="text-xl font-bold text-green-600">GHS {formatNumber(totalCost)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Supplier *</label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Batch Number</label>
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {batchHint && (
                <div
                  className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                    batchHint.type === 'new'
                      ? 'bg-amber-50 text-amber-900 border border-amber-200'
                      : 'bg-blue-50 text-blue-900 border border-blue-200'
                  }`}
                >
                  <AlertCircle className="shrink-0 mt-0.5" size={16} />
                  <span>{batchHint.message}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date *</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500"
                  rows={3}
                />
              </div>

              {batchHint && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="text-blue-600 mr-2" size={16} />
                    <span className="font-medium text-blue-800">Stock Preview</span>
                  </div>
                  <div className="text-sm">
                    After restock: <strong>{batchHint.targetStock}</strong> units on target line
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-4 pt-6 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg flex items-center hover:bg-green-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Processing…' : (
                    <>
                      <Plus className="mr-2" size={18} />
                      Complete Restock
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {showMedicationSearch && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Select Medication</h3>
                <button type="button" onClick={() => setShowMedicationSearch(false)}>
                  <X size={24} />
                </button>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search medications..."
                className="w-full p-3 border rounded-lg mb-4"
              />
              <div className="max-h-60 overflow-y-auto">
                {filteredMedications.map((med) => (
                  <button
                    type="button"
                    key={med.id}
                    className="w-full text-left p-3 border-b hover:bg-gray-50"
                    onClick={() => {
                      setSelectedMedication(med);
                      setShowMedicationSearch(false);
                    }}
                  >
                    <div className="font-medium">{med.name}</div>
                    <div className="text-sm text-gray-600">
                      {med.category} • Batch: {med.batch_no || '—'} • Stock: {med.stock}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RestockForm;
