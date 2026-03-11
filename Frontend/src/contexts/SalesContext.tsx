import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { Medication, Sale, SaleItem } from '../types';
import { useMedicationContext } from './MedicationContext';
import saleAPI from '../services/api';

interface SalesContextType {
  sales: Sale[];
  loading: boolean;
  error: string | null;
  addSale: (sale: Omit<Sale, 'id' | 'total_cost' | 'profit'>) => Promise<Sale>;
  refreshSales: () => Promise<void>;
  calculateProfit: (sale: Sale) => number;
  calculateProfitMargin: (sale: Sale) => number;
}

const SalesContext = createContext<SalesContextType | undefined>(undefined);

export const SalesContextProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { medications, updateMedicationStock } = useMedicationContext();

  const formatSaleData = (sale: any): Sale => ({
    ...sale,
    id: String(sale.id), // Convert to string to match the interface
    total: parseFloat(sale.total),
    total_cost: parseFloat(sale.total_cost),
    profit: parseFloat(sale.profit),
    items: (sale.items || []).map((item: any) => ({
      ...item,
      medication: String(item.medication), // Convert to string to match the interface
      price: parseFloat(item.price),
      cost: parseFloat(item.cost),
      quantity: Number(item.quantity),
    })),
  });

  const fetchSales = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await saleAPI.sale.list();
      const salesData = response.data?.results || response.data || [];
      const formattedSales = salesData.map(formatSaleData);
      setSales(formattedSales);
    } catch (err) {
      setError('Failed to load sales data. Please try again later.');
      console.error('Sales fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const calculateProfit = useCallback((sale: Sale): number => {
    return sale.items.reduce(
      (total, item) =>
        total + item.qty * (item.price - item.cost),
      0
    );
  }, []);

  const calculateProfitMargin = useCallback(
    (sale: Sale): number => {
      if (sale.total <= 0) return 0;
      return (calculateProfit(sale) / sale.total) * 100;
    },
    [calculateProfit]
  );

  const addSale = useCallback(
    async (
      sale: Omit<Sale, 'id' | 'total_cost' | 'profit'>
    ): Promise<Sale> => {
      try {
        setError(null);
        const stockUpdates: { id: string; quantity: number }[] = [];
        const itemsWithCost: SaleItem[] = [];

        for (const item of sale.items) {
          const medication = medications.find(
            (m: Medication) => m.id.toString() === item.medication.toString()
          );
          if (!medication) {
            throw new Error(`Medication ID ${item.medication} not found`);
          }
          if (medication.stock < item.qty) {
            throw new Error(
              `Not enough stock for ${medication.name}. ` +
                `Requested: ${item.qty}, Available: ${medication.stock}`
            );
          }

          itemsWithCost.push({
            ...item,
            cost: medication.cost,
            medication_name: medication.name,
          });

          stockUpdates.push({
            id: item.medication.toString(),
            quantity: -item.qty,
          });
        }

        // Clean items for backend (only required fields)
        const cleanedItems = itemsWithCost.map(({ medication, price, cost, qty }) => ({
          medication,
          price: typeof price === 'string' ? parseFloat(price) : price,
          cost: typeof cost === 'string' ? parseFloat(cost) : cost,
          qty,
        }));

        // Capitalize payment_method for backend display value
        const paymentMethodDisplay = sale.payment_method.charAt(0).toUpperCase() + sale.payment_method.slice(1).replace('_', ' ');

        const completeSale: any = {
          customer: sale.customer === '0' ? '1302598e-d2b7-4048-b43e-96bf3851529a' : sale.customer,
          customer_name: sale.customer_name,
          date: sale.date,
          total: sale.total,
          subtotal: sale.subtotal,
          discount_total: sale.discount_total,
          payment_method: paymentMethodDisplay,
          notes: sale.notes,
          items: cleanedItems,
        };

        console.log('Sending sale data:', completeSale);
        const response = await saleAPI.sale.create(completeSale);
        console.log('Sale creation response:', response.data);
        const formattedSale = formatSaleData(response.data);

        for (const update of stockUpdates) {
          updateMedicationStock(update.id, update.quantity);
        }

        setSales((prev) => [formattedSale, ...prev]);
        return formattedSale;
      } catch (err: any) {
        const errorMsg =
          err.response?.data?.detail ||
          err.message ||
          'Failed to add sale. Please try again.';
        setError(errorMsg);
        console.error('Add sale error:', err);
        throw new Error(errorMsg);
      }
    },
    [medications, updateMedicationStock]
  );

  const refreshSales = useCallback(async () => {
    await fetchSales();
  }, [fetchSales]);

  return (
    <SalesContext.Provider
      value={{
        sales,
        loading,
        error,
        addSale,
        refreshSales,
        calculateProfit,
        calculateProfitMargin,
      }}
    >
      {children}
    </SalesContext.Provider>
  );
};

export const useSalesContext = () => {
  const context = useContext(SalesContext);
  if (!context) {
    throw new Error(
      'useSalesContext must be used within a SalesContextProvider'
    );
  }
  return context;
};

export default SalesContextProvider;
