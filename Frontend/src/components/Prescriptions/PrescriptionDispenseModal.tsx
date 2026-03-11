// Prescription Dispensing Modal
import React, { useState, useEffect } from 'react';
import { X, Package, AlertTriangle, CheckCircle, User, Pill, Calculator } from 'lucide-react';
import { Prescription, PrescriptionUpdateData } from '../../types';
import api from '../../services/api';
import apiClient from '../../utils/axios';

interface PrescriptionDispenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  prescription: Prescription;
  onSuccess: () => void;
}

const PrescriptionDispenseModal: React.FC<PrescriptionDispenseModalProps> = ({
  isOpen,
  onClose,
  prescription,
  onSuccess
}) => {
  const [dispenseData, setDispenseData] = useState({
    quantity_to_dispense: prescription.quantity_prescribed - prescription.quantity_dispensed,
    notes: '',
    verify_patient_id: false,
    patient_signature_required: true,
    insurance_verified: false
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [medicationStock, setMedicationStock] = useState<number | null>(null);
  const [totalCost, setTotalCost] = useState<number>(0);

  // Fetch medication details and calculate costs
  useEffect(() => {
    const fetchMedicationDetails = async () => {
      try {
        const response = await apiClient.get(`/medications/${prescription.medication}/`);
        const medication = response.data;
        setMedicationStock(medication.stock);
        setTotalCost(medication.price * dispenseData.quantity_to_dispense);
      } catch (err) {
        console.error('Failed to fetch medication details:', err);
      }
    };

    if (isOpen && prescription.medication) {
      fetchMedicationDetails();
    }
  }, [isOpen, prescription.medication, dispenseData.quantity_to_dispense]);

  // Validate dispensing and show warnings
  useEffect(() => {
    const newWarnings: string[] = [];

    // Check if prescription is expired
    if (prescription.is_expired) {
      newWarnings.push('This prescription has expired');
    }

    // Check if already fully dispensed
    if (prescription.quantity_dispensed >= prescription.quantity_prescribed) {
      newWarnings.push('This prescription has already been fully dispensed');
    }

    // Check medication stock
    if (medicationStock !== null && dispenseData.quantity_to_dispense > medicationStock) {
      newWarnings.push(`Insufficient stock. Available: ${medicationStock}, Requested: ${dispenseData.quantity_to_dispense}`);
    }

    // Check if quantity is valid
    if (dispenseData.quantity_to_dispense <= 0) {
      newWarnings.push('Quantity to dispense must be greater than 0');
    }

    // Check if quantity exceeds remaining
    const remainingQuantity = prescription.quantity_prescribed - prescription.quantity_dispensed;
    if (dispenseData.quantity_to_dispense > remainingQuantity) {
      newWarnings.push(`Quantity exceeds remaining prescription. Remaining: ${remainingQuantity}`);
    }

    // Check if prescription is in correct status
    if (!['approved', 'preparing', 'ready'].includes(prescription.status)) {
      newWarnings.push('Prescription must be approved and ready for dispensing');
    }

    setWarnings(newWarnings);
  }, [prescription, dispenseData.quantity_to_dispense, medicationStock]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setDispenseData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              name === 'quantity_to_dispense' ? Number(value) : value
    }));
  };

  const handleDispense = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (warnings.length > 0) {
      setError('Please resolve all warnings before dispensing');
      return;
    }

    if (!dispenseData.verify_patient_id) {
      setError('Please verify patient identification');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updateData: PrescriptionUpdateData = {
        quantity_dispensed: prescription.quantity_dispensed + dispenseData.quantity_to_dispense,
        status: 'dispensed',
        dispensed_date: new Date().toISOString(),
        notes: dispenseData.notes
      };

      await apiClient.post(`/prescriptions/${prescription.id}/dispense/`, {
        quantity_to_dispense: dispenseData.quantity_to_dispense,
        notes: dispenseData.notes,
        verify_patient_id: dispenseData.verify_patient_id,
        patient_signature_required: dispenseData.patient_signature_required,
        insurance_verified: dispenseData.insurance_verified
      });

      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to dispense prescription');
    } finally {
      setLoading(false);
    }
  };

  const canDispense = warnings.length === 0 && 
                     dispenseData.verify_patient_id && 
                     dispenseData.quantity_to_dispense > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-green-600 text-white p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6" />
            <div>
              <h2 className="text-xl font-semibold">Dispense Prescription</h2>
              <p className="text-green-200">
                {prescription.custom_id || `#${prescription.id.substring(0, 8)}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-green-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleDispense} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center text-yellow-800 mb-2">
                <AlertTriangle className="h-5 w-5 mr-2" />
                <span className="font-medium">Warnings</span>
              </div>
              <ul className="text-yellow-700 text-sm space-y-1">
                {warnings.map((warning, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Prescription Summary */}
          <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Prescription Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="flex items-center mb-2">
                  <User className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="font-medium">Patient:</span>
                  <span className="ml-2">{prescription.patient_name}</span>
                </div>
                <div className="flex items-center mb-2">
                  <Pill className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="font-medium">Medication:</span>
                  <span className="ml-2">{prescription.medication_name}</span>
                </div>
                <div>
                  <span className="font-medium">Dosage:</span>
                  <span className="ml-2">{prescription.dosage}</span>
                </div>
              </div>
              <div>
                <div className="mb-2">
                  <span className="font-medium">Prescribed:</span>
                  <span className="ml-2">{prescription.quantity_prescribed} units</span>
                </div>
                <div className="mb-2">
                  <span className="font-medium">Already Dispensed:</span>
                  <span className="ml-2">{prescription.quantity_dispensed} units</span>
                </div>
                <div>
                  <span className="font-medium">Remaining:</span>
                  <span className="ml-2 text-green-600 font-semibold">
                    {prescription.quantity_prescribed - prescription.quantity_dispensed} units
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Dispensing Details */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity to Dispense *
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="quantity_to_dispense"
                  value={dispenseData.quantity_to_dispense}
                  onChange={handleInputChange}
                  min="1"
                  max={prescription.quantity_prescribed - prescription.quantity_dispensed}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-gray-500 text-sm">units</span>
                </div>
              </div>
              {medicationStock !== null && (
                <p className="mt-1 text-sm text-gray-600">
                  Available stock: {medicationStock} units
                </p>
              )}
            </div>

            {/* Cost Calculation */}
            {totalCost > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center text-blue-800 mb-2">
                  <Calculator className="h-5 w-5 mr-2" />
                  <span className="font-medium">Cost Calculation</span>
                </div>
                <div className="text-blue-700 space-y-1">
                  <div className="flex justify-between">
                    <span>Quantity:</span>
                    <span>{dispenseData.quantity_to_dispense} units</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unit Price:</span>
                    <span>GHS {(totalCost / dispenseData.quantity_to_dispense).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t border-blue-200 pt-1">
                    <span>Total Cost:</span>
                    <span>GHS {totalCost.toFixed(2)}</span>
                  </div>
                  {prescription.copay_amount && (
                    <div className="flex justify-between text-sm">
                      <span>Patient Copay:</span>
                      <span>GHS {prescription.copay_amount}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Verification Checklist */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Verification Checklist</h3>
              
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="verify_patient_id"
                    checked={dispenseData.verify_patient_id}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-700">
                    Patient identification verified *
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="patient_signature_required"
                    checked={dispenseData.patient_signature_required}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-700">
                    Patient signature obtained
                  </span>
                </label>

                {prescription.insurance_provider && (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="insurance_verified"
                      checked={dispenseData.insurance_verified}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <span className="ml-3 text-sm text-gray-700">
                      Insurance coverage verified
                    </span>
                  </label>
                )}
              </div>
            </div>

            {/* Dispensing Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dispensing Notes
              </label>
              <textarea
                name="notes"
                value={dispenseData.notes}
                onChange={handleInputChange}
                rows={3}
                placeholder="Add any notes about the dispensing process..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* Patient Instructions */}
            {prescription.special_instructions && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h4 className="font-medium text-yellow-800 mb-2">Special Instructions for Patient:</h4>
                <p className="text-yellow-700 text-sm">{prescription.special_instructions}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-8 flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !canDispense}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-white transition-colors ${
                canDispense 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              {loading ? 'Dispensing...' : 'Dispense Medication'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PrescriptionDispenseModal;
