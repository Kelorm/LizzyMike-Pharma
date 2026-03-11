import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { Customer } from '../types';
import api from '../services/api';

interface CustomerContextType {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  searchCustomers: (query: string) => Promise<Customer[]>;
  createCustomer: (customer: Partial<Customer>) => Promise<Customer>;
  updateCustomer: (id: string, customer: Partial<Customer>) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<void>;
  getCustomerById: (id: string) => Promise<Customer>;
  getCustomerSalesHistory: (id: string) => Promise<any[]>;
  refreshCustomers: () => Promise<void>;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export const CustomerContextProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatCustomerData = (customer: any): Customer => ({
    ...customer,
    id: customer.id.toString(),
    name: customer.name || '',
    phone: customer.phone || '',
    email: customer.email || '',
    address: customer.address || '',
    dob: customer.dob || '',
    insurance: customer.insurance || '',
    allergies: customer.allergies || '',
  });

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.customer.list();
      const customersData = response.data?.results || response.data || [];
      const formattedCustomers = customersData.map(formatCustomerData);
      setCustomers(formattedCustomers);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.response?.data?.error || err.message || 'Failed to load customers. Please try again later.';
      setError(errorMsg);
      console.error('Customers fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const searchCustomers = useCallback(async (query: string): Promise<Customer[]> => {
    try {
      if (!query.trim()) return [];
      
      const response = await api.customer.search(query);
      const formattedCustomers = (response.data || []).map(formatCustomerData);
      return formattedCustomers;
    } catch (err: any) {
      console.error('Customer search error:', err);
      return [];
    }
  }, []);

  const createCustomer = useCallback(async (customerData: Partial<Customer>): Promise<Customer> => {
    try {
      setError(null);
      const response = await api.customer.create(customerData);
      const newCustomer = formatCustomerData(response.data);
      
      setCustomers(prev => [newCustomer, ...prev]);
      return newCustomer;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.response?.data?.error || err.message || 'Failed to create customer. Please try again.';
      setError(errorMsg);
      console.error('Create customer error:', err);
      throw new Error(errorMsg);
    }
  }, []);

  const updateCustomer = useCallback(async (id: string, customerData: Partial<Customer>): Promise<Customer> => {
    try {
      setError(null);
      const response = await api.customer.update(id, customerData);
      const updatedCustomer = formatCustomerData(response.data);
      
      setCustomers(prev => prev.map(customer => 
        customer.id === id ? updatedCustomer : customer
      ));
      return updatedCustomer;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.response?.data?.error || err.message || 'Failed to update customer. Please try again.';
      setError(errorMsg);
      console.error('Update customer error:', err);
      throw new Error(errorMsg);
    }
  }, []);

  const deleteCustomer = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);
      await api.customer.delete(id);
      
      setCustomers(prev => prev.filter(customer => customer.id !== id));
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.response?.data?.error || err.message || 'Failed to delete customer. Please try again.';
      setError(errorMsg);
      console.error('Delete customer error:', err);
      throw new Error(errorMsg);
    }
  }, []);

  const getCustomerById = useCallback(async (id: string): Promise<Customer> => {
    try {
      const response = await api.customer.getById(id);
      return formatCustomerData(response.data);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.response?.data?.error || err.message || 'Failed to get customer. Please try again.';
      console.error('Get customer error:', err);
      throw new Error(errorMsg);
    }
  }, []);

  const getCustomerSalesHistory = useCallback(async (id: string): Promise<any[]> => {
    try {
      const response = await api.customer.getSalesHistory(id);
      return response.data || [];
    } catch (err: any) {
      console.error('Get customer sales history error:', err);
      return [];
    }
  }, []);

  const refreshCustomers = useCallback(async () => {
    await fetchCustomers();
  }, [fetchCustomers]);

  return (
    <CustomerContext.Provider
      value={{
        customers,
        loading,
        error,
        searchCustomers,
        createCustomer,
        updateCustomer,
        deleteCustomer,
        getCustomerById,
        getCustomerSalesHistory,
        refreshCustomers,
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
};

export const useCustomerContext = () => {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error(
      'useCustomerContext must be used within a CustomerContextProvider'
    );
  }
  return context;
};

export default CustomerContextProvider; 