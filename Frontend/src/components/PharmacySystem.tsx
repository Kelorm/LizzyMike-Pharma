import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import Inventory from '../pages/Inventory';
import Prescriptions from '../pages/Prescriptions';
import Customers from '../pages/Customers';
import Sales from '../pages/Sales';
import POS from '../pages/POS';
import SalesTransactions from '../pages/SalesTransactions';
import Settings from '../pages/Settings';
import Branches from '../pages/Branches';
import RestockPage from '../pages/Restock';
import Modal from './Modal';
import { Medication, Customer, Prescription, Sale } from '../types';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { useLayoutMetrics } from '../contexts/LayoutMetricsContext';
import { useMedicationContext } from '../contexts/MedicationContext';
import { useAuth } from '../contexts/AuthContext';
import { hasPermission } from '../utils/permissions';

const getArrayFromResponse = <T,>(data: unknown): T[] => {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown }).results)) {
    return (data as { results: T[] }).results;
  }
  return [];
};

const pathToTab = (pathname: string): string => {
  if (pathname.startsWith('/inventory')) return 'inventory';
  if (pathname.startsWith('/prescription')) return 'prescription';
  if (pathname.startsWith('/customers')) return 'customers';
  if (pathname.startsWith('/sales-transactions')) return 'sales-transactions';
  if (pathname.startsWith('/pos')) return 'pos';
  if (pathname.startsWith('/sales')) return 'sales';
  if (pathname.startsWith('/restock')) return 'restock';
  if (pathname.startsWith('/branches')) return 'branches';
  if (pathname.startsWith('/settings')) return 'settings';
  return 'dashboard';
};

const PharmacySystem: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canViewPrescriptions = hasPermission(user?.role, 'view_prescriptions');
  const activeTab = pathToTab(location.pathname);
  const {
    setLowStockCount,
    setPendingPrescriptions,
    setTotalStockValue,
    setSales: setLayoutSales,
    setNotifications,
  } = useLayoutMetrics();
  const { fetchMedications } = useMedicationContext();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedItem, setSelectedItem] = useState<unknown>(null);

  const setActiveTab = (tab: string) => {
    const map: Record<string, string> = {
      dashboard: '/',
      inventory: '/inventory',
      prescription: '/prescription',
      prescriptions: '/prescription',
      customers: '/customers',
      sales: '/sales',
      pos: '/pos',
      'sales-transactions': '/sales-transactions',
      restock: '/restock',
      branches: '/branches',
      settings: '/settings',
    };
    navigate(map[tab] || '/');
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [medsResult, custsResult, salesResult, prescResult] = await Promise.all([
        api.medication.list().then(
          (r) => ({ ok: true as const, data: r.data }),
          () => ({ ok: false as const, data: null })
        ),
        api.customer.list().then(
          (r) => ({ ok: true as const, data: r.data }),
          () => ({ ok: false as const, data: null })
        ),
        api.sale.list().then(
          (r) => ({ ok: true as const, data: r.data }),
          () => ({ ok: false as const, data: null })
        ),
        canViewPrescriptions
          ? api.prescription.list().then(
              (r) => ({ ok: true as const, data: r.data }),
              () => ({ ok: false as const, data: null })
            )
          : Promise.resolve({ ok: true as const, data: [] as Prescription[] }),
      ]);

      if (!medsResult.ok && !custsResult.ok && !salesResult.ok) {
        throw new Error('core_fetch_failed');
      }

      const medicationsData = medsResult.ok
        ? getArrayFromResponse<Medication>(medsResult.data)
        : [];
      const customersData = custsResult.ok
        ? getArrayFromResponse<Customer>(custsResult.data)
        : [];
      const prescriptionsData =
        canViewPrescriptions && prescResult.ok
          ? getArrayFromResponse<Prescription>(prescResult.data)
          : [];
      const salesData = salesResult.ok
        ? getArrayFromResponse<Sale>(salesResult.data)
        : [];

      setMedications(medicationsData);
      setCustomers(customersData);
      setPrescriptions(prescriptionsData);
      setSales(salesData);
      setLayoutSales(salesData);

      const lowStockMeds = medicationsData.filter((med) => med.stock <= med.min_stock);
      const pendingRx = prescriptionsData.filter((p) => p.status === 'preparing');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const in30Days = new Date(today);
      in30Days.setDate(in30Days.getDate() + 30);
      const expiringMeds = medicationsData.filter((med) => {
        if (!med.expiry) return false;
        const expiry = new Date(med.expiry);
        return expiry >= today && expiry <= in30Days;
      });

      const lowStockCount = lowStockMeds.length;
      const pendingPrescriptions = pendingRx.length;
      const totalStockValue = medicationsData.reduce((sum, med) => sum + med.stock * med.price, 0);
      const nowIso = new Date().toISOString();

      const nextNotifications = [
        ...pendingRx.slice(0, 8).map((p) => ({
          id: `rx-${p.id}`,
          type: 'prescription' as const,
          message: `Prescription pending: ${p.medication_name || 'Medication'} for ${p.patient_name || 'patient'}`,
          entity_id: String(p.id),
          entity_type: 'prescription' as const,
          href: '/prescription',
          read: false,
          created_at: nowIso,
        })),
        ...lowStockMeds.slice(0, 8).map((med) => ({
          id: `low-${med.id}`,
          type: 'low_stock' as const,
          message: `${med.name} is low on stock (${med.stock} left, min ${med.min_stock})`,
          entity_id: String(med.id),
          entity_type: 'medication' as const,
          href: `/inventory?restock=${med.id}`,
          read: false,
          created_at: nowIso,
        })),
        ...expiringMeds.slice(0, 8).map((med) => ({
          id: `exp-${med.id}`,
          type: 'expiry' as const,
          message: `${med.name} expires on ${med.expiry}`,
          entity_id: String(med.id),
          entity_type: 'medication' as const,
          href: '/inventory',
          read: false,
          created_at: nowIso,
        })),
      ];

      setLowStockCount(lowStockCount);
      setPendingPrescriptions(pendingPrescriptions);
      setTotalStockValue(totalStockValue);
      setNotifications(nextNotifications);
    } catch (err) {
      setError('Failed to load pharmacy data');
      toast.error('Failed to load pharmacy data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canViewPrescriptions]);

  useEffect(() => {
    const onBranch = () => {
      fetchData();
      fetchMedications();
    };
    window.addEventListener('branch-changed', onBranch);
    return () => window.removeEventListener('branch-changed', onBranch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canViewPrescriptions]);

  const refreshData = async () => {
    await fetchData();
    await fetchMedications();
  };

  const openModal = (type: string, item?: unknown) => {
    setModalType(type);
    setSelectedItem(item || null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedItem(null);
    setModalType('');
  };

  const getStringMedications = () => medications;

  const handleMedicationOperation = async (
    operation: string,
    medicationData?: Partial<Medication>,
    id?: string
  ) => {
    try {
      if (operation === 'create' && medicationData) {
        await api.medication.create(medicationData);
        toast.success('Medication created');
      } else if (operation === 'update' && id && medicationData) {
        await api.medication.update(id, medicationData);
        toast.success('Medication updated');
      } else if (operation === 'delete' && id) {
        await api.medication.delete(id);
        toast.success('Medication deleted');
      }
      closeModal();
      await refreshData();
    } catch {
      toast.error('Medication operation failed');
    }
  };

  const handleUpdatePrescriptionStatus = async (id: string, status: string) => {
    try {
      await api.prescription.updateStatus(id, status);
      toast.success('Prescription updated');
      await refreshData();
    } catch {
      toast.error('Failed to update prescription');
    }
  };

  const handleSaveSale = async (saleData: Record<string, unknown>) => {
    try {
      await api.sale.create(saleData);
      toast.success('Sale recorded');
      closeModal();
      await refreshData();
    } catch {
      toast.error('Failed to create sale');
      throw new Error('sale failed');
    }
  };

  const baseProps = {
    loading,
    error,
    medications: getStringMedications(),
    prescriptions,
    customers,
    sales,
    onOpenModal: openModal,
    onRefresh: refreshData,
    onMedicationOperation: handleMedicationOperation,
    onUpdateStatus: handleUpdatePrescriptionStatus,
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            {...baseProps}
            setActiveTab={setActiveTab}
            onRestockMedication={(id) => navigate(`/inventory?restock=${id}`)}
          />
        );
      case 'inventory':
        return <Inventory {...baseProps} />;
      case 'prescription':
        return <Prescriptions />;
      case 'customers':
        return <Customers {...baseProps} />;
      case 'pos':
        return <POS />;
      case 'sales':
        return <Sales />;
      case 'sales-transactions':
        return <SalesTransactions {...baseProps} />;
      case 'restock':
        return <RestockPage onRefresh={refreshData} />;
      case 'branches':
        return <Branches />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard {...baseProps} setActiveTab={setActiveTab} />;
    }
  };

  const getCustomerList = () =>
    customers.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      insurance: c.insurance,
    }));

  return (
    <>
      {renderActiveTab()}
      {showModal && (
        <Modal
          type={modalType}
          item={selectedItem}
          onClose={closeModal}
          onSaveMedication={(medicationData, isEdit) =>
            handleMedicationOperation(
              isEdit ? 'update' : 'create',
              medicationData,
              isEdit ? (selectedItem as { id: string }).id : undefined
            )
          }
          onDeleteMedication={(id) => handleMedicationOperation('delete', undefined, String(id))}
          onSaveSale={handleSaveSale}
          medications={getStringMedications()}
          customers={getCustomerList()}
        />
      )}
    </>
  );
};

export default PharmacySystem;
