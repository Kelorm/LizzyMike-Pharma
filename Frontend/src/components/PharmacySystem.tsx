import React, { useState, useEffect } from 'react';
import Dashboard from '../pages/Dashboard';
import Inventory from '../pages/Inventory';
import Prescriptions from '../pages/Prescriptions';
import Customers from '../pages/Customers';
import Sales from '../pages/Sales';
import SalesTransactions from '../pages/SalesTransactions';
import Settings from '../pages/Settings';
import Modal from './Modal';
import { Medication, Customer, Prescription } from '../types';
import api from '../services/api';
import { toast } from 'react-hot-toast';

// Helper function to get array from response
const getArrayFromResponse = <T,>(data: any): T[] => {
  if (Array.isArray(data)) return data;
  if (data?.results && Array.isArray(data.results)) return data.results;
  return [];
};

interface PharmacySystemProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setLowStockCount: (count: number) => void;
  setPendingPrescriptions: (count: number) => void;
  setTotalStockValue: (value: number) => void;
  setNotificationCount: (count: number) => void;
  onSalesUpdate: (sales: any[]) => void;
}

const PharmacySystem: React.FC<PharmacySystemProps> = ({
  activeTab,
  setActiveTab,
  setLowStockCount,
  setPendingPrescriptions,
  setTotalStockValue,
  setNotificationCount,
  onSalesUpdate,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [medsResponse, custsResponse, prescResponse, salesResponse] = await Promise.all([
        api.medication.list(),
        api.customer.list(),
        api.prescription.list(),
        api.sale.list()
      ]);

      const medicationsData = getArrayFromResponse<Medication>(medsResponse.data);
      const customersData = getArrayFromResponse<Customer>(custsResponse.data);
      const prescriptionsData = getArrayFromResponse<Prescription>(prescResponse.data);
      const salesData = getArrayFromResponse<any>(salesResponse.data);

      setMedications(medicationsData);
      setCustomers(customersData);
      setPrescriptions(prescriptionsData);
      setSales(salesData);

      // Update dashboard stats
      const lowStockCount = medicationsData.filter(med => med.stock <= med.min_stock).length;
      const pendingPrescriptions = prescriptionsData.filter(p => p.status === 'preparing').length;
      const totalStockValue = medicationsData.reduce((sum, med) => sum + (med.stock * med.price), 0);

      setLowStockCount(lowStockCount);
      setPendingPrescriptions(pendingPrescriptions);
      setTotalStockValue(totalStockValue);
      onSalesUpdate(salesData);

    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to load data';
      setError(errorMsg);
      console.error('Data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Convert medication IDs to strings for compatibility
  const getStringMedications = (): Medication[] => {
    return medications.map(med => ({
      ...med,
      id: med.id.toString()
    }));
  };

  const refreshData = async (tab: string) => {
    try {
      setLoading(true);
      
      switch (tab) {
        case 'inventory': {
          const response = await api.medication.list();
          const medicationsData = getArrayFromResponse<Medication>(response.data);
          setMedications(medicationsData);
          
          const lowStockCount = medicationsData.filter(med => med.stock <= med.min_stock).length;
          const totalStockValue = medicationsData.reduce((sum, med) => sum + (med.stock * med.price), 0);
          
          setLowStockCount(lowStockCount);
          setTotalStockValue(totalStockValue);
          break;
        }
        case 'prescriptions': {
          const response = await api.prescription.list();
          const prescriptionsData = getArrayFromResponse<Prescription>(response.data);
          setPrescriptions(prescriptionsData);
          
          const pendingPrescriptions = prescriptionsData.filter(p => p.status === 'preparing').length;
          setPendingPrescriptions(pendingPrescriptions);
          break;
        }
        case 'customers': {
          const response = await api.customer.list();
          const customersData = getArrayFromResponse<Customer>(response.data);
          setCustomers(customersData);
          break;
        }
        case 'sales': {
          const response = await api.sale.list();
          const salesData = getArrayFromResponse<any>(response.data);
          setSales(salesData);
          onSalesUpdate(salesData);
          break;
        }
        default:
          await fetchData();
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to refresh data';
      toast.error(errorMsg);
      console.error('Refresh error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePrescriptionStatus = async (id: string, status: string) => {
    try {
      await api.prescription.updateStatus(id, status);
      await refreshData('prescriptions');
      toast.success('Prescription status updated successfully!');
    } catch (err: any) {
      toast.error(`Failed to update status: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleMedicationOperation = async (
    operation: string,
    medicationData?: any,
    id?: string | number
  ) => {
    try {
      let response;
      
      switch (operation) {
        case 'create':
          response = await api.medication.create(medicationData);
          toast.success('Medication added successfully!');
          break;
        case 'update':
          response = await api.medication.update(id!.toString(), medicationData);
          toast.success('Medication updated successfully!');
          break;
        case 'delete':
          await api.medication.delete(id!.toString());
          toast.success('Medication deleted successfully!');
          break;
        default:
          throw new Error('Invalid operation');
      }
      
      await refreshData('inventory');
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Operation failed';
      toast.error(errorMsg);
      console.error('Medication operation error:', err);
    }
  };

  const handleRestock = async (restockData: any) => {
    try {
      await api.restock.create(restockData);
      await refreshData('inventory');
      toast.success('Restock recorded successfully!');
    } catch (err: any) {
      toast.error(`Failed to record restock: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleSaveSale = async (saleData: any): Promise<void> => {
    try {
      const response = await api.sale.create(saleData);
      
      // Update medication stock
      const updatedMedications = [...medications];
      saleData.items.forEach((item: any) => {
        const medIndex = updatedMedications.findIndex(m => m.id.toString() === item.medication.toString());
        if (medIndex !== -1) {
          updatedMedications[medIndex].stock -= item.quantity;
        }
      });
      
      setMedications(updatedMedications);
      setSales(prev => [...prev, response.data]);
      toast.success('Sale created successfully!');
    } catch (err: any) {
      toast.error(`Failed to create sale: ${err.response?.data?.detail || err.message}`);
    }
  };

  const openModal = (type: string, item?: any) => {
    setModalType(type);
    setSelectedItem(item ?? null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType('');
    setSelectedItem(null);
  };

  // Create base props to pass to all pages
  const baseProps = {
    loading,
    error,
    medications: getStringMedications(),
    prescriptions, // Pass prescriptions as-is, with id as number
    customers,
    sales,
    onOpenModal: openModal,
    onRefresh: refreshData,
    onMedicationOperation: handleMedicationOperation,
    onUpdateStatus: handleUpdatePrescriptionStatus
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard {...baseProps} setActiveTab={setActiveTab} />;
      case 'inventory':
        return <Inventory {...baseProps} />;
      case 'prescription':
      case 'prescriptions':
        return <Prescriptions />;
      case 'customers':
        return <Customers {...baseProps} />;
      case 'sales':
        return <Sales />;
      case 'sales-transactions':
        return <SalesTransactions {...baseProps} />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard {...baseProps} setActiveTab={setActiveTab} />;
    }
  };

  // Get customer list for modal
  const getCustomerList = () => {
    return customers.map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      insurance: c.insurance
    }));
  };

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
              isEdit ? selectedItem.id : undefined
            )
          }
          onDeleteMedication={(id) => 
            handleMedicationOperation('delete', undefined, id)
          }
          onSaveSale={handleSaveSale}
          onSaveRestock={handleRestock}
          medications={getStringMedications()}
          customers={getCustomerList()} // Pass customers to modal
        />
      )}
    </>
  );
};

export default PharmacySystem;