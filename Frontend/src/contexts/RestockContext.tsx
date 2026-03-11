import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Restock } from '../types';

interface RestockContextType {
  restocks: Restock[];
  loading: boolean;
  error: string | null;
  fetchRestocks: () => Promise<void>;
  createRestock: (restockData: Partial<Restock>) => Promise<Restock>;
  updateRestock: (id: string, restockData: Partial<Restock>) => Promise<Restock>;
  deleteRestock: (id: string) => Promise<void>;
  getRestockById: (id: string) => Restock | undefined;
  getRestocksByMedication: (medicationId: string) => Restock[];
  getRestocksBySupplier: (supplier: string) => Restock[];
  getRestockStats: () => {
    totalRestocks: number;
    totalQuantity: number;
    totalValue: number;
    averageCost: number;
  };
}

const RestockContext = createContext<RestockContextType | undefined>(undefined);

export const useRestockContext = () => {
  const context = useContext(RestockContext);
  if (!context) {
    throw new Error('useRestockContext must be used within a RestockProvider');
  }
  return context;
};

interface RestockProviderProps {
  children: ReactNode;
}

export const RestockProvider: React.FC<RestockProviderProps> = ({ children }) => {
  const [restocks, setRestocks] = useState<Restock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRestocks = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/restocks/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch restocks');
      }

      const data = await response.json();
      setRestocks(data.results || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching restocks:', err);
    } finally {
      setLoading(false);
    }
  };

  const createRestock = async (restockData: Partial<Restock>): Promise<Restock> => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/restocks/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(restockData)
      });

      if (!response.ok) {
        throw new Error('Failed to create restock');
      }

      const newRestock = await response.json();
      setRestocks(prev => [newRestock, ...prev]);
      return newRestock;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create restock');
      throw err;
    }
  };

  const updateRestock = async (id: string, restockData: Partial<Restock>): Promise<Restock> => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/restocks/${id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(restockData)
      });

      if (!response.ok) {
        throw new Error('Failed to update restock');
      }

      const updatedRestock = await response.json();
      setRestocks(prev => prev.map(r => r.id === id ? updatedRestock : r));
      return updatedRestock;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update restock');
      throw err;
    }
  };

  const deleteRestock = async (id: string): Promise<void> => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/restocks/${id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete restock');
      }

      setRestocks(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete restock');
      throw err;
    }
  };

  const getRestockById = (id: string): Restock | undefined => {
    return restocks.find(r => r.id === id);
  };

  const getRestocksByMedication = (medicationId: string): Restock[] => {
    return restocks.filter(r => r.medication === medicationId);
  };

  const getRestocksBySupplier = (supplier: string): Restock[] => {
    return restocks.filter(r => r.supplier === supplier);
  };

  const getRestockStats = () => {
    const totalRestocks = restocks.length;
    const totalQuantity = restocks.reduce((sum, r) => sum + parseInt(r.quantity), 0);
    const totalValue = restocks.reduce((sum, r) => sum + parseFloat(r.total_cost), 0);
    const averageCost = totalRestocks > 0 ? totalValue / totalRestocks : 0;

    return {
      totalRestocks,
      totalQuantity,
      totalValue,
      averageCost
    };
  };

  useEffect(() => {
    fetchRestocks();
  }, []);

  const value: RestockContextType = {
    restocks,
    loading,
    error,
    fetchRestocks,
    createRestock,
    updateRestock,
    deleteRestock,
    getRestockById,
    getRestocksByMedication,
    getRestocksBySupplier,
    getRestockStats
  };

  return (
    <RestockContext.Provider value={value}>
      {children}
    </RestockContext.Provider>
  );
}; 