import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Medication } from '../types';
import medicationAPI from '../services/api';

interface MedicationContextType {
  medications: Medication[];
  loading: boolean;
  error: string | null;
  fetchMedications: () => Promise<void>;
  updateMedicationStock: (id: string | number, delta: number) => void;
}

const MedicationContext = createContext<MedicationContextType | undefined>(undefined);

export const MedicationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMedications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await medicationAPI.medication.list();
      const medicationsData = response.data?.results || response.data || [];
      setMedications(medicationsData);
      setLoading(false);
    } catch (err) {
      setError('Failed to load medications');
      setLoading(false);
    }
  }, []);

  const updateMedicationStock = useCallback((id: string | number, delta: number) => {
    setMedications(prev => 
      prev.map(med => 
        String(med.id) === String(id) ? { ...med, stock: med.stock + delta } : med
      )
    );
  }, []);

  useEffect(() => {
    fetchMedications();
  }, [fetchMedications]);

  return (
    <MedicationContext.Provider value={{
      medications,
      loading,
      error,
      fetchMedications,
      updateMedicationStock
    }}>
      {children}
    </MedicationContext.Provider>
  );
};

export const useMedicationContext = () => {
  const context = useContext(MedicationContext);
  if (!context) {
    throw new Error('useMedicationContext must be used within a MedicationProvider');
  }
  return context;
};