// Prescription Details Modal with Status Management
import React, { useState } from 'react';
import { 
  X, User, Pill, Calendar, FileText, Phone, Mail, 
  CheckCircle, Clock, AlertTriangle, Edit, RefreshCw,
  Shield, Signature, Eye, Download
} from 'lucide-react';
import { Prescription } from '../../types';
import { formatTransactionId } from '../../utils/transactionUtils';
import api from '../../services/api';
import apiClient from '../../utils/axios';

interface PrescriptionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  prescription: Prescription;
  onStatusUpdate: (prescriptionId: string, newStatus: string) => void;
  onRefresh: () => void;
}

const StatusBadge: React.FC<{ status: string; className?: string }> = ({ status, className = '' }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'preparing': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ready': return 'bg-green-100 text-green-800 border-green-200';
      case 'dispensed': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'expired': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(status)} ${className}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(priority)}`}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
};

const PrescriptionDetailsModal: React.FC<PrescriptionDetailsModalProps> = ({
  isOpen,
  onClose,
  prescription,
  onStatusUpdate,
  onRefresh
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [newStatus, setNewStatus] = useState(prescription.status);

  const handleStatusUpdate = async () => {
    if (newStatus === prescription.status) {
      setShowStatusUpdate(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onStatusUpdate(prescription.id, newStatus);
      setShowStatusUpdate(false);
      onRefresh();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleRefill = async () => {
    setLoading(true);
    setError(null);

    try {
      await apiClient.post(`/prescriptions/${prescription.id}/refill/`);
      onRefresh();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process refill');
    } finally {
      setLoading(false);
    }
  };

  const getStatusActions = () => {
    const actions = [];
    
    switch (prescription.status) {
      case 'pending':
        actions.push(
          <button
            key="approve"
            onClick={() => {
              setNewStatus('approved');
              setShowStatusUpdate(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <CheckCircle className="h-4 w-4" />
            Approve
          </button>
        );
        break;
      case 'approved':
        actions.push(
          <button
            key="prepare"
            onClick={() => {
              setNewStatus('preparing');
              setShowStatusUpdate(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Clock className="h-4 w-4" />
            Start Preparing
          </button>
        );
        break;
      case 'preparing':
        actions.push(
          <button
            key="ready"
            onClick={() => {
              setNewStatus('ready');
              setShowStatusUpdate(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <CheckCircle className="h-4 w-4" />
            Mark Ready
          </button>
        );
        break;
      case 'dispensed':
        actions.push(
          <button
            key="complete"
            onClick={() => {
              setNewStatus('completed');
              setShowStatusUpdate(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <CheckCircle className="h-4 w-4" />
            Complete
          </button>
        );
        break;
    }

    // Add refill option if available
    if (prescription.can_refill) {
      actions.push(
        <button
          key="refill"
          onClick={handleRefill}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Process Refill
        </button>
      );
    }

    return actions;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6" />
            <div>
              <h2 className="text-xl font-semibold">Prescription Details</h2>
              <p className="text-blue-200">
                {prescription.custom_id || `#${prescription.id.substring(0, 8)}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-blue-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-2 text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          )}

          {/* Status and Priority */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <StatusBadge status={prescription.status} />
              <PriorityBadge priority={prescription.priority} />
              {prescription.is_expired && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200">
                  <AlertTriangle className="inline h-4 w-4 mr-1" />
                  Expired
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {getStatusActions()}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Patient Information */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <User className="h-5 w-5" />
                  Patient Information
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Name:</span>
                    <span className="ml-2 text-gray-900">{prescription.patient_name}</span>
                  </div>
                  {prescription.customer_phone && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-600">Phone:</span>
                      <span className="ml-2 text-gray-900">{prescription.customer_phone}</span>
                    </div>
                  )}
                  {prescription.customer_email && (
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-600">Email:</span>
                      <span className="ml-2 text-gray-900">{prescription.customer_email}</span>
                    </div>
                  )}
                  {prescription.patient_age && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Age:</span>
                      <span className="ml-2 text-gray-900">{prescription.patient_age} years</span>
                    </div>
                  )}
                  {prescription.patient_weight && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Weight:</span>
                      <span className="ml-2 text-gray-900">{prescription.patient_weight} kg</span>
                    </div>
                  )}
                  {prescription.allergies && (
                    <div>
                      <span className="text-sm font-medium text-red-600">Allergies:</span>
                      <span className="ml-2 text-red-900">{prescription.allergies}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Doctor Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <User className="h-5 w-5" />
                  Doctor Information
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Doctor:</span>
                    <span className="ml-2 text-gray-900">{prescription.prescribed_by}</span>
                  </div>
                  {prescription.doctor_license && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">License:</span>
                      <span className="ml-2 text-gray-900">{prescription.doctor_license}</span>
                    </div>
                  )}
                  {prescription.doctor_phone && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-600">Phone:</span>
                      <span className="ml-2 text-gray-900">{prescription.doctor_phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Insurance Information */}
              {(prescription.insurance_provider || prescription.insurance_number || prescription.copay_amount) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                    <Shield className="h-5 w-5" />
                    Insurance Information
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    {prescription.insurance_provider && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Provider:</span>
                        <span className="ml-2 text-gray-900">{prescription.insurance_provider}</span>
                      </div>
                    )}
                    {prescription.insurance_number && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Number:</span>
                        <span className="ml-2 text-gray-900">{prescription.insurance_number}</span>
                      </div>
                    )}
                    {prescription.copay_amount && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Copay:</span>
                        <span className="ml-2 text-gray-900">GHS {prescription.copay_amount}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Medication and Prescription Details */}
            <div className="space-y-6">
              {/* Medication Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <Pill className="h-5 w-5" />
                  Medication Information
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Medication:</span>
                    <span className="ml-2 text-gray-900 font-medium">{prescription.medication_name}</span>
                  </div>
                  {prescription.medication_category && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Category:</span>
                      <span className="ml-2 text-gray-900">{prescription.medication_category}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-medium text-gray-600">Dosage:</span>
                    <span className="ml-2 text-gray-900">{prescription.dosage}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Frequency:</span>
                    <span className="ml-2 text-gray-900">{prescription.frequency}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Duration:</span>
                    <span className="ml-2 text-gray-900">{prescription.duration}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Route:</span>
                    <span className="ml-2 text-gray-900">{prescription.administration_route}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Quantity:</span>
                    <span className="ml-2 text-gray-900">
                      {prescription.quantity_dispensed} / {prescription.quantity_prescribed} dispensed
                    </span>
                  </div>
                </div>
              </div>

              {/* Dates and Refills */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <Calendar className="h-5 w-5" />
                  Dates & Refills
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Prescribed:</span>
                    <span className="ml-2 text-gray-900">
                      {new Date(prescription.prescribed_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Expires:</span>
                    <span className={`ml-2 ${prescription.is_expired ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                      {new Date(prescription.expiry_date).toLocaleDateString()}
                      {prescription.days_until_expiry !== undefined && (
                        <span className="text-sm text-gray-500 ml-2">
                          ({prescription.days_until_expiry <= 0 ? 'Expired' : `${prescription.days_until_expiry} days left`})
                        </span>
                      )}
                    </span>
                  </div>
                  {prescription.dispensed_date && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Dispensed:</span>
                      <span className="ml-2 text-gray-900">
                        {new Date(prescription.dispensed_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-medium text-gray-600">Refills:</span>
                    <span className="ml-2 text-gray-900">
                      {prescription.refills_used} / {prescription.refills_allowed} used
                      {prescription.refills_remaining !== undefined && (
                        <span className="text-sm text-gray-500 ml-2">
                          ({prescription.refills_remaining} remaining)
                        </span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Created:</span>
                    <span className="ml-2 text-gray-900">
                      {new Date(prescription.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Digital Signature */}
              {prescription.digital_signature && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                    <Signature className="h-5 w-5" />
                    Digital Signature
                  </h3>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center text-green-800">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      <span className="font-medium">Digitally Signed</span>
                    </div>
                    {prescription.signed_at && (
                      <div className="text-sm text-green-700 mt-1">
                        Signed on {new Date(prescription.signed_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Additional Information */}
          {(prescription.diagnosis || prescription.special_instructions || prescription.notes) && (
            <div className="mt-8 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Additional Information</h3>
              
              {prescription.diagnosis && (
                <div>
                  <span className="text-sm font-medium text-gray-600">Diagnosis:</span>
                  <p className="mt-1 text-gray-900 bg-gray-50 p-3 rounded-lg">{prescription.diagnosis}</p>
                </div>
              )}
              
              {prescription.special_instructions && (
                <div>
                  <span className="text-sm font-medium text-gray-600">Special Instructions:</span>
                  <p className="mt-1 text-gray-900 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                    {prescription.special_instructions}
                  </p>
                </div>
              )}
              
              {prescription.notes && (
                <div>
                  <span className="text-sm font-medium text-gray-600">Notes:</span>
                  <p className="mt-1 text-gray-900 bg-gray-50 p-3 rounded-lg">{prescription.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Status Update Modal */}
          {showStatusUpdate && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
              <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Status</h3>
                <p className="text-gray-600 mb-4">
                  Change status from <strong>{prescription.status}</strong> to <strong>{newStatus}</strong>?
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowStatusUpdate(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleStatusUpdate}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Updating...' : 'Update Status'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Last updated: {new Date(prescription.updated_at).toLocaleString()}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionDetailsModal;
