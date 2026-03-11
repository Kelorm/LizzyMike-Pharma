import React, { createContext, useContext, useState, useCallback } from 'react';
import { Medication, Customer, Prescription, Sale } from '../types';
import api from '../services/api';

interface SearchResult {
  type: 'medication' | 'customer' | 'prescription' | 'sale';
  id: string;
  title: string;
  subtitle: string;
  data: any;
}

interface GlobalSearchContextType {
  searchQuery: string;
  searchResults: SearchResult[];
  isSearching: boolean;
  searchError: string | null;
  performGlobalSearch: (query: string) => Promise<void>;
  clearSearch: () => void;
  setSearchQuery: (query: string) => void;
}

const GlobalSearchContext = createContext<GlobalSearchContextType | undefined>(undefined);

export const GlobalSearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const performGlobalSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const results: SearchResult[] = [];

      // Search medications
      try {
        const medResponse = await api.medication.search(query);
        const medications = medResponse.data?.results || medResponse.data || [];
        medications.forEach((med: Medication) => {
          results.push({
            type: 'medication',
            id: med.id.toString(),
            title: med.name,
            subtitle: `${med.category} • Stock: ${med.stock}`,
            data: med
          });
        });
      } catch (error) {
        console.error('Medication search error:', error);
      }

      // Search customers
      try {
        const custResponse = await api.customer.search(query);
        const customers = custResponse.data?.results || custResponse.data || [];
        customers.forEach((cust: Customer) => {
          results.push({
            type: 'customer',
            id: cust.id.toString(),
            title: cust.name,
            subtitle: `${cust.phone} • ${cust.insurance || 'No Insurance'}`,
            data: cust
          });
        });
      } catch (error) {
        console.error('Customer search error:', error);
      }

      // Search prescriptions
      try {
        const presResponse = await api.prescription.list();
        const prescriptions = presResponse.data?.results || presResponse.data || [];
        const filteredPrescriptions = prescriptions.filter((pres: Prescription) =>
          pres.patient_name?.toLowerCase().includes(query.toLowerCase()) ||
          pres.medication_name?.toLowerCase().includes(query.toLowerCase()) ||
          pres.prescribed_by?.toLowerCase().includes(query.toLowerCase())
        );
        filteredPrescriptions.forEach((pres: Prescription) => {
          results.push({
            type: 'prescription',
            id: pres.id.toString(),
            title: `${pres.patient_name} - ${pres.medication_name}`,
            subtitle: `${pres.prescribed_by} • ${pres.status}`,
            data: pres
          });
        });
      } catch (error) {
        console.error('Prescription search error:', error);
      }

      // Search sales
      try {
        const salesResponse = await api.sale.list();
        const sales = salesResponse.data?.results || salesResponse.data || [];
        const filteredSales = sales.filter((sale: Sale) =>
          sale.customer_name?.toLowerCase().includes(query.toLowerCase()) ||
          sale.id.toString().includes(query)
        );
        filteredSales.forEach((sale: Sale) => {
          results.push({
            type: 'sale',
            id: sale.id.toString(),
            title: `Sale #${sale.id} - ${sale.customer_name}`,
            subtitle: `${sale.payment_method} • GHS ${sale.total}`,
            data: sale
          });
        });
      } catch (error) {
        console.error('Sales search error:', error);
      }

      setSearchResults(results);
    } catch (error) {
      setSearchError('Search failed. Please try again.');
      console.error('Global search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(null);
  }, []);

  return (
    <GlobalSearchContext.Provider value={{
      searchQuery,
      searchResults,
      isSearching,
      searchError,
      performGlobalSearch,
      clearSearch,
      setSearchQuery
    }}>
      {children}
    </GlobalSearchContext.Provider>
  );
};

export const useGlobalSearch = () => {
  const context = useContext(GlobalSearchContext);
  if (!context) {
    throw new Error('useGlobalSearch must be used within a GlobalSearchProvider');
  }
  return context;
}; 