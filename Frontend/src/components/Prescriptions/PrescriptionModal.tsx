// Enhanced Prescription Creation Modal
import React, { useState, useEffect } from 'react';
import { X, User, Pill, Calendar, AlertTriangle, Save, Plus } from 'lucide-react';
import { PrescriptionFormData, Customer, Medication } from '../../types';
import api from '../../services/api';
import apiClient from '../../utils/axios';

interface PrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customers: Customer[];
  medications: Medication[];
  editPrescription?: any; // For editing existing prescriptions
}

const PrescriptionModal: React.FC<PrescriptionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  customers,
  medications,
  editPrescription
}) => {
  const [formData, setFormData] = useState<PrescriptionFormData>({
    customer: '',
    medication: '',
    quantity_prescribed: 1,
    dosage: '',
    frequency: '',
    duration: '',
    administration_route: 'Oral',
    priority: 'normal',
    prescribed_by: '',
    doctor_license: '',
    doctor_phone: '',
    prescribed_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    refills_allowed: 0,
    diagnosis: '',
    allergies: '',
    special_instructions: '',
    notes: '',
    insurance_provider: '',
    insurance_number: '',
    copay_amount: undefined,
    patient_age: undefined,
    patient_weight: undefined
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);

  // Set default expiry date (30 days from prescribed date)
  useEffect(() => {
    if (formData.prescribed_date) {
      const prescribedDate = new Date(formData.prescribed_date);
      const expiryDate = new Date(prescribedDate);
      expiryDate.setDate(expiryDate.getDate() + 30);
      setFormData(prev => ({
        ...prev,
        expiry_date: expiryDate.toISOString().split('T')[0]
      }));
    }
  }, [formData.prescribed_date]);

  // Update selected customer when customer ID changes
  useEffect(() => {
    const customer = customers.find(c => c.id === formData.customer);
    setSelectedCustomer(customer || null);
    if (customer) {
      setFormData(prev => ({
        ...prev,
        allergies: customer.allergies || '',
        insurance_provider: customer.insurance || ''
      }));
    }
  }, [formData.customer, customers]);

  // Update selected medication when medication ID changes
  useEffect(() => {
    const medication = medications.find(m => m.id === formData.medication);
    setSelectedMedication(medication || null);
  }, [formData.medication, medications]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity_prescribed' || name === 'refills_allowed' || name === 'patient_age' || name === 'copay_amount' || name === 'patient_weight'
        ? value === '' ? undefined : Number(value)
        : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.customer || !formData.medication || !formData.prescribed_by) {
        throw new Error('Please fill in all required fields');
      }

      if (formData.quantity_prescribed <= 0) {
        throw new Error('Quantity prescribed must be greater than 0');
      }

      // Check medication stock
      if (selectedMedication && selectedMedication.stock < formData.quantity_prescribed) {
        throw new Error(`Insufficient stock. Available: ${selectedMedication.stock}`);
      }

      if (editPrescription) {
        await apiClient.put(`/prescriptions/${editPrescription.id}/`, formData);
      } else {
        await apiClient.post('/prescriptions/', formData);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save prescription');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Pill className="h-6 w-6" />
            <h2 className="text-xl font-semibold">
              {editPrescription ? 'Edit Prescription' : 'New Prescription'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-blue-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Patient Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <User className="h-5 w-5" />
                Patient Information
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Patient *
                </label>
                <select
                  name="customer"
                  value={formData.customer}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a patient</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.phone}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCustomer && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm text-blue-800">
                    <div><strong>Email:</strong> {selectedCustomer.email}</div>
                    <div><strong>Address:</strong> {selectedCustomer.address}</div>
                    <div><strong>DOB:</strong> {new Date(selectedCustomer.dob).toLocaleDateString()}</div>
                    {selectedCustomer.allergies && (
                      <div className="text-red-600">
                        <strong>Allergies:</strong> {selectedCustomer.allergies}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age
                  </label>
                  <input
                    type="number"
                    name="patient_age"
                    value={formData.patient_age || ''}
                    onChange={handleInputChange}
                    min="0"
                    max="150"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    name="patient_weight"
                    value={formData.patient_weight || ''}
                    onChange={handleInputChange}
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allergies
                </label>
                <textarea
                  name="allergies"
                  value={formData.allergies}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="List any known allergies..."
                />
              </div>
            </div>

            {/* Medication Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Pill className="h-5 w-5" />
                Medication Information
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medication *
                </label>
                <select
                  name="medication"
                  value={formData.medication}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a medication</option>
                  {medications.map(medication => (
                    <option key={medication.id} value={medication.id}>
                      {medication.name} - {medication.category} (Stock: {medication.stock})
                    </option>
                  ))}
                </select>
              </div>

              {selectedMedication && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-sm text-green-800">
                    <div><strong>Category:</strong> {selectedMedication.category}</div>
                    <div><strong>Stock:</strong> {selectedMedication.stock} units</div>
                    <div><strong>Price:</strong> GHS {selectedMedication.price}</div>
                    <div><strong>Expiry:</strong> {new Date(selectedMedication.expiry).toLocaleDateString()}</div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity Prescribed *
                  </label>
                  <input
                    type="number"
                    name="quantity_prescribed"
                    value={formData.quantity_prescribed}
                    onChange={handleInputChange}
                    required
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Refills Allowed
                  </label>
                  <input
                    type="number"
                    name="refills_allowed"
                    value={formData.refills_allowed}
                    onChange={handleInputChange}
                    min="0"
                    max="12"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dosage *
                </label>
                <input
                  type="text"
                  name="dosage"
                  value={formData.dosage}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., 500mg, 2 tablets"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frequency *
                </label>
                <input
                  type="text"
                  name="frequency"
                  value={formData.frequency}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Twice daily, Every 8 hours"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration *
                  </label>
                  <input
                    type="text"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., 7 days, 2 weeks"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Administration Route
                  </label>
                  <select
                    name="administration_route"
                    value={formData.administration_route}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Oral">Oral</option>
                    <option value="Topical">Topical</option>
                    <option value="Injection">Injection</option>
                    <option value="Inhalation">Inhalation</option>
                    <option value="Sublingual">Sublingual</option>
                    <option value="Rectal">Rectal</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Doctor Information */}
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <User className="h-5 w-5" />
              Doctor Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Doctor Name *
                </label>
                <input
                  type="text"
                  name="prescribed_by"
                  value={formData.prescribed_by}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License Number
                </label>
                <input
                  type="text"
                  name="doctor_license"
                  value={formData.doctor_license}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Doctor Phone
                </label>
                <input
                  type="tel"
                  name="doctor_phone"
                  value={formData.doctor_phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Prescription Details */}
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Prescription Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prescribed Date *
                </label>
                <input
                  type="date"
                  name="prescribed_date"
                  value={formData.prescribed_date}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiry Date *
                </label>
                <input
                  type="date"
                  name="expiry_date"
                  value={formData.expiry_date}
                  onChange={handleInputChange}
                  required
                  min={formData.prescribed_date}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Diagnosis
              </label>
              <input
                type="text"
                name="diagnosis"
                value={formData.diagnosis}
                onChange={handleInputChange}
                placeholder="Primary diagnosis or condition"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Instructions
              </label>
              <textarea
                name="special_instructions"
                value={formData.special_instructions}
                onChange={handleInputChange}
                rows={2}
                placeholder="Special instructions for the patient or pharmacist"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={2}
                placeholder="Additional notes"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Insurance Information */}
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Insurance Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Insurance Provider
                </label>
                <input
                  type="text"
                  name="insurance_provider"
                  value={formData.insurance_provider}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Insurance Number
                </label>
                <input
                  type="text"
                  name="insurance_number"
                  value={formData.insurance_number}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Copay Amount (GHS)
                </label>
                <input
                  type="number"
                  name="copay_amount"
                  value={formData.copay_amount || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
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
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="h-4 w-4" />
              )}
              {loading ? 'Saving...' : editPrescription ? 'Update Prescription' : 'Create Prescription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PrescriptionModal;
