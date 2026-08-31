import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Medication } from '../types';
import medicationAPI from '../services/api';
import { useAuth } from './AuthContext';

interface MedicationContextType {
  medications: Medication[];
  loading: boolean;
  error: string | null;
  fetchMedications: () => Promise<void>;
  updateMedicationStock: (id: string | number, delta: number) => void;
}

const MedicationContext = createContext<MedicationContextType | undefined>(undefined);

export const MedicationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMedications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await medicationAPI.medication.list();
      const medicationsData = response.data?.results || response.data || [];
      setMedications(Array.isArray(medicationsData) ? medicationsData : []);
    } catch (err) {
      setError('Failed to load medications');
      console.error('Medication fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateMedicationStock = useCallback((id: string | number, delta: number) => {
    setMedications(prev =>
      prev.map(med =>
        String(med.id) === String(id)
          ? { ...med, stock: Number(med.stock) + delta }
          : med
      )
    );
  }, []);

  // Fetch only after auth is ready — avoids empty list from a pre-login 401.
  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) {
      fetchMedications();
    } else {
      setMedications([]);
      setLoading(false);
      setError(null);
    }
  }, [authLoading, isAuthenticated, fetchMedications]);

  useEffect(() => {
    const onBranch = () => {
      if (isAuthenticated) fetchMedications();
    };
    window.addEventListener('branch-changed', onBranch);
    return () => window.removeEventListener('branch-changed', onBranch);
  }, [isAuthenticated, fetchMedications]);

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
