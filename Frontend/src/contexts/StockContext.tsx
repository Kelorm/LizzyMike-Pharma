import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { Medication } from '../types';
import api from '../services/api';

interface StockContextType {
  stockLevels: { [medicationId: string]: number };
  loading: boolean;
  error: string | null;
  checkStockLevel: (medicationId: string) => number;
  reserveStock: (medicationId: string, quantity: number) => Promise<boolean>;
  releaseStock: (medicationId: string, quantity: number) => void;
  updateStockLevel: (medicationId: string, newLevel: number) => void;
  refreshStockLevels: () => Promise<void>;
  getLowStockItems: () => Medication[];
  getExpiringItems: () => Medication[];
}

const StockContext = createContext<StockContextType | undefined>(undefined);

export const StockContextProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [stockLevels, setStockLevels] = useState<{ [medicationId: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reservedStock, setReservedStock] = useState<{ [medicationId: string]: number }>({});
  const [medications, setMedications] = useState<Medication[]>([]);

  const fetchStockLevels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.medication.list();
      const meds = response.data?.results || response.data || [];
      setMedications(meds);
      
      const levels: { [medicationId: string]: number } = {};
      meds.forEach((med: Medication) => {
        levels[med.id] = med.stock;
      });
      setStockLevels(levels);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.response?.data?.error || err.message || 'Failed to load stock levels. Please try again later.';
      setError(errorMsg);
      console.error('Stock levels fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStockLevels();
    
    // Set up polling for real-time updates
    const interval = setInterval(() => {
      fetchStockLevels();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [fetchStockLevels]);

  const checkStockLevel = useCallback((medicationId: string): number => {
    const currentStock = stockLevels[medicationId] || 0;
    const reserved = reservedStock[medicationId] || 0;
    return Math.max(0, currentStock - reserved);
  }, [stockLevels, reservedStock]);

  const reserveStock = useCallback(async (medicationId: string, quantity: number): Promise<boolean> => {
    try {
      const availableStock = checkStockLevel(medicationId);
      
      if (availableStock < quantity) {
        return false; // Insufficient stock
      }

      // Reserve the stock temporarily
      setReservedStock(prev => ({
        ...prev,
        [medicationId]: (prev[medicationId] || 0) + quantity
      }));

      return true;
    } catch (error) {
      console.error('Stock reservation error:', error);
      return false;
    }
  }, [checkStockLevel]);

  const releaseStock = useCallback((medicationId: string, quantity: number) => {
    setReservedStock(prev => ({
      ...prev,
      [medicationId]: Math.max(0, (prev[medicationId] || 0) - quantity)
    }));
  }, []);

  const updateStockLevel = useCallback((medicationId: string, newLevel: number) => {
    setStockLevels(prev => ({
      ...prev,
      [medicationId]: Math.max(0, newLevel)
    }));
  }, []);

  const refreshStockLevels = useCallback(async () => {
    await fetchStockLevels();
  }, [fetchStockLevels]);

  const getLowStockItems = useCallback((): Medication[] => {
    return medications.filter(med => {
      const availableStock = checkStockLevel(med.id);
      return availableStock <= med.min_stock;
    });
  }, [medications, checkStockLevel]);

  const getExpiringItems = useCallback((): Medication[] => {
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    
    return medications.filter(med => {
      const expiryDate = new Date(med.expiry);
      return expiryDate <= threeMonthsFromNow;
    });
  }, [medications]);

  return (
    <StockContext.Provider
      value={{
        stockLevels,
        loading,
        error,
        checkStockLevel,
        reserveStock,
        releaseStock,
        updateStockLevel,
        refreshStockLevels,
        getLowStockItems,
        getExpiringItems,
      }}
    >
      {children}
    </StockContext.Provider>
  );
};

export const useStockContext = () => {
  const context = useContext(StockContext);
  if (!context) {
    throw new Error(
      'useStockContext must be used within a StockContextProvider'
    );
  }
  return context;
};

export default StockContextProvider; 