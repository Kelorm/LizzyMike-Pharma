// Enhanced Prescriptions Management Page
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Filter, Eye, Package, RefreshCw, 
  Calendar, AlertTriangle, Clock, CheckCircle,
  User, Pill, FileText, Phone, TrendingUp
} from 'lucide-react';
import { Prescription, Customer, Medication } from '../types';
import api from '../services/api';
import apiClient from '../utils/axios';
import PrescriptionModal from '../components/Prescriptions/PrescriptionModal';
import PrescriptionDetailsModal from '../components/Prescriptions/PrescriptionDetailsModal';
import PrescriptionDispenseModal from '../components/Prescriptions/PrescriptionDispenseModal';

interface PrescriptionsProps {}

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
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(status)} ${className}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const PriorityBadge: React.FC<{ priority: string; className?: string }> = ({ priority, className = '' }) => {
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
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(priority)} ${className}`}>
      {priority === 'urgent' && <AlertTriangle className="inline h-3 w-3 mr-1" />}
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
};

const StatCard: React.FC<{
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  trend?: number;
}> = ({ title, value, icon, color, trend }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        {trend !== undefined && (
          <p className={`text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'} flex items-center mt-1`}>
            <TrendingUp className={`h-3 w-3 mr-1 ${trend < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(trend)}% from last week
          </p>
        )}
      </div>
      <div className={`p-3 rounded-full ${color.replace('text-', 'bg-').replace('-600', '-100')}`}>
        {icon}
      </div>
    </div>
  </div>
);

const Prescriptions: React.FC<PrescriptionsProps> = () => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDispenseModal, setShowDispenseModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [editPrescription, setEditPrescription] = useState<Prescription | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [expiringFilter, setExpiringFilter] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchPrescriptions();
    fetchStats();
    fetchCustomersAndMedications();
  }, [currentPage, statusFilter, priorityFilter, searchTerm]);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/prescriptions/', {
        params: {
          status: statusFilter !== 'all' ? statusFilter : undefined,
          priority: priorityFilter !== 'all' ? priorityFilter : undefined,
          search: searchTerm || undefined,
          page: currentPage,
          page_size: itemsPerPage
        }
      });
      
      setPrescriptions(response.data.results || response.data);
      setTotalItems(response.data.count || response.data.length);
    } catch (err: any) {
      setError('Failed to fetch prescriptions');
      console.error('Error fetching prescriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomersAndMedications = async () => {
    try {
      const [customersResponse, medicationsResponse] = await Promise.all([
        apiClient.get('/customers/'),
        apiClient.get('/medications/')
      ]);
      
      setCustomers(customersResponse.data.results || customersResponse.data);
      setMedications(medicationsResponse.data.results || medicationsResponse.data);
    } catch (err) {
      console.error('Error fetching customers/medications:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/prescriptions/dashboard_stats/');
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const filteredPrescriptions = useMemo(() => {
    return prescriptions;
  }, [prescriptions]);

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedPrescriptions = filteredPrescriptions;

  const handleStatusUpdate = async (prescriptionId: string, newStatus: string) => {
    try {
      await apiClient.patch(`/prescriptions/${prescriptionId}/`, { status: newStatus });
      fetchPrescriptions();
      fetchStats();
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleViewDetails = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setShowDetailsModal(true);
  };

  const handleDispense = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setShowDispenseModal(true);
  };

  const handleRefill = async (prescription: Prescription) => {
    try {
      await apiClient.post(`/prescriptions/${prescription.id}/refill/`);
      fetchPrescriptions();
      fetchStats();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process refill');
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    setEditPrescription(null);
    fetchPrescriptions();
    fetchStats();
  };

  const handleDispenseSuccess = () => {
    setShowDispenseModal(false);
    setSelectedPrescription(null);
    fetchPrescriptions();
    fetchStats();
  };

  const handleEdit = (prescription: Prescription) => {
    setEditPrescription(prescription);
    setShowCreateModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prescriptions</h1>
          <p className="text-gray-600">Manage patient prescriptions and dispensing</p>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Prescription
          </button>
          <button
            onClick={() => fetchPrescriptions()}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Prescriptions"
          value={stats.total_prescriptions}
          icon={<FileText className="h-6 w-6" />}
          color="text-blue-600"
        />
        <StatCard
          title="Pending Review"
          value={stats.pending_prescriptions}
          icon={<Clock className="h-6 w-6" />}
          color="text-yellow-600"
        />
        <StatCard
          title="Ready for Pickup"
          value={stats.ready_prescriptions}
          icon={<CheckCircle className="h-6 w-6" />}
          color="text-green-600"
        />
        <StatCard
          title="Urgent"
          value={stats.urgent_prescriptions}
          icon={<AlertTriangle className="h-6 w-6" />}
          color="text-red-600"
        />
      </div> */}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search prescriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="dispensed">Dispensed</option>
            <option value="completed">Completed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={expiringFilter}
              onChange={(e) => setExpiringFilter(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Expiring Soon</span>
          </label>

          <div className="text-sm text-gray-600 flex items-center">
            Showing {filteredPrescriptions.length} of {prescriptions.length}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Prescriptions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prescription
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Medication
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Doctor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expiry
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedPrescriptions.map((prescription) => (
                <tr key={prescription.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {prescription.custom_id || `#${prescription.id.substring(0, 8)}`}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(prescription.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {prescription.patient_name}
                        </div>
                        {prescription.patient_age && (
                          <div className="text-sm text-gray-500">
                            Age: {prescription.patient_age}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <Pill className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {prescription.medication_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {prescription.dosage} • {prescription.frequency}
                        </div>
                        <div className="text-sm text-gray-500">
                          Qty: {prescription.quantity_dispensed}/{prescription.quantity_prescribed}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{prescription.prescribed_by}</div>
                    {prescription.doctor_phone && (
                      <div className="text-sm text-gray-500">{prescription.doctor_phone}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={prescription.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <PriorityBadge priority={prescription.priority} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(prescription.expiry_date).toLocaleDateString()}
                    </div>
                    {prescription.days_until_expiry !== undefined && (
                      <div className={`text-sm ${prescription.days_until_expiry <= 7 ? 'text-red-600' : prescription.days_until_expiry <= 30 ? 'text-yellow-600' : 'text-gray-500'}`}>
                        {prescription.days_until_expiry <= 0 ? 'Expired' : `${prescription.days_until_expiry} days`}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewDetails(prescription)}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(prescription)}
                        className="text-gray-600 hover:text-gray-800 transition-colors"
                        title="Edit"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDispense(prescription)}
                        className={`transition-colors ${
                          ['approved', 'preparing', 'ready'].includes(prescription.status)
                            ? 'text-green-600 hover:text-green-800'
                            : 'text-gray-400 cursor-not-allowed'
                        }`}
                        title="Dispense"
                        disabled={!['approved', 'preparing', 'ready'].includes(prescription.status)}
                      >
                        <Package className="h-4 w-4" />
                      </button>
                      {prescription.can_refill && (
                        <button
                          onClick={() => handleRefill(prescription)}
                          className="text-purple-600 hover:text-purple-800 transition-colors"
                          title="Refill"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, filteredPrescriptions.length)}
                  </span>{' '}
                  of <span className="font-medium">{filteredPrescriptions.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Components */}
      <PrescriptionModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditPrescription(null);
        }}
        onSuccess={handleCreateSuccess}
        customers={customers}
        medications={medications}
        editPrescription={editPrescription}
      />

      {selectedPrescription && (
        <PrescriptionDetailsModal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedPrescription(null);
          }}
          prescription={selectedPrescription}
          onStatusUpdate={handleStatusUpdate}
          onRefresh={() => {
            fetchPrescriptions();
            fetchStats();
          }}
        />
      )}

      {selectedPrescription && (
        <PrescriptionDispenseModal
          isOpen={showDispenseModal}
          onClose={() => {
            setShowDispenseModal(false);
            setSelectedPrescription(null);
          }}
          prescription={selectedPrescription}
          onSuccess={handleDispenseSuccess}
        />
      )}
    </div>
  );
};

export default Prescriptions;
