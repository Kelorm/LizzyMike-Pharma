import React, { useState, useEffect, useMemo } from 'react';
import { Percent, Tag, Gift, Calculator, AlertTriangle } from 'lucide-react';
import { SaleItem, Discount, Customer } from '../types';

interface DiscountCalculatorProps {
  items: SaleItem[];
  customer?: Customer;
  subtotal: number;
  onDiscountApplied: (discounts: Discount[], totalDiscount: number) => void;
}

interface DiscountResult {
  discount: Discount;
  amount: number;
  description: string;
}

const DiscountCalculator: React.FC<DiscountCalculatorProps> = ({
  items,
  customer,
  subtotal,
  onDiscountApplied,
}) => {
  const [availableDiscounts, setAvailableDiscounts] = useState<Discount[]>([]);
  const [selectedDiscounts, setSelectedDiscounts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Mock discounts - in real app, fetch from API
  useEffect(() => {
    const mockDiscounts: Discount[] = [
      {
        id: '1',
        name: 'New Customer Discount',
        type: 'percentage',
        value: 10,
        min_purchase: 50,
        max_discount: 20,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        is_active: true,
        current_usage: 0,
      },
      {
        id: '2',
        name: 'Bulk Purchase Discount',
        type: 'percentage',
        value: 5,
        min_purchase: 100,
        max_discount: 50,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        is_active: true,
        current_usage: 0,
      },
      {
        id: '3',
        name: 'Fixed Discount',
        type: 'fixed',
        value: 5,
        min_purchase: 30,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        is_active: true,
        current_usage: 0,
      },
    ];
    setAvailableDiscounts(mockDiscounts);
  }, []);

  const calculateDiscounts = useMemo((): DiscountResult[] => {
    const results: DiscountResult[] = [];
    const now = new Date();

    availableDiscounts.forEach(discount => {
      // Check if discount is active and within date range
      const startDate = new Date(discount.start_date);
      const endDate = new Date(discount.end_date);
      
      if (!discount.is_active || now < startDate || now > endDate) {
        return;
      }

      // Check minimum purchase requirement
      if (discount.min_purchase && subtotal < discount.min_purchase) {
        return;
      }

      // Check customer eligibility
      if (discount.applicable_customers && customer) {
        if (!discount.applicable_customers.includes(customer.id)) {
          return;
        }
      }

      // Check medication eligibility
      if (discount.applicable_medications) {
        const hasEligibleMedication = items.some(item => 
          discount.applicable_medications!.includes(item.medication)
        );
        if (!hasEligibleMedication) {
          return;
        }
      }

      let discountAmount = 0;
      let description = '';

      if (discount.type === 'percentage') {
        discountAmount = (subtotal * discount.value) / 100;
        if (discount.max_discount) {
          discountAmount = Math.min(discountAmount, discount.max_discount);
        }
        description = `${discount.value}% off`;
      } else if (discount.type === 'fixed') {
        discountAmount = discount.value;
        description = `GHS ${discount.value} off`;
      }

      if (discountAmount > 0) {
        results.push({
          discount,
          amount: discountAmount,
          description,
        });
      }
    });

    return results.sort((a, b) => b.amount - a.amount);
  }, [availableDiscounts, items, customer, subtotal]);

  const totalDiscount = useMemo(() => {
    return calculateDiscounts
      .filter(result => selectedDiscounts.includes(result.discount.id))
      .reduce((sum, result) => sum + result.amount, 0);
  }, [calculateDiscounts, selectedDiscounts]);

  const finalTotal = subtotal - totalDiscount;

  useEffect(() => {
    const applicableDiscounts = calculateDiscounts
      .filter(result => selectedDiscounts.includes(result.discount.id))
      .map(result => result.discount);
    
    onDiscountApplied(applicableDiscounts, totalDiscount);
  }, [selectedDiscounts, totalDiscount, calculateDiscounts, onDiscountApplied]);

  const handleDiscountToggle = (discountId: string) => {
    setSelectedDiscounts(prev => 
      prev.includes(discountId) 
        ? prev.filter(id => id !== discountId)
        : [...prev, discountId]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <div className="flex items-center gap-2 mb-4">
        <Tag className="text-blue-600" size={20} />
        <h3 className="font-semibold text-gray-800">Available Discounts</h3>
      </div>

      {loading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading discounts...</p>
        </div>
      ) : calculateDiscounts.length > 0 ? (
        <div className="space-y-3">
          {calculateDiscounts.map((result) => (
            <div
              key={result.discount.id}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedDiscounts.includes(result.discount.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleDiscountToggle(result.discount.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Gift className="text-green-600" size={16} />
                    <span className="font-medium">{result.discount.name}</span>
                    {selectedDiscounts.includes(result.discount.id) && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Applied
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {result.description}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Min purchase: GHS {result.discount.min_purchase || 0}
                    {result.discount.max_discount && ` • Max discount: GHS ${result.discount.max_discount}`}
                  </div>
                  <div className="text-xs text-gray-500">
                    Valid until {formatDate(result.discount.end_date)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-green-600">
                    -GHS {result.amount.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">
          <AlertTriangle className="mx-auto mb-2 text-gray-400" size={24} />
          <p className="text-sm">No discounts available for this purchase</p>
        </div>
      )}

      {/* Summary */}
      {selectedDiscounts.length > 0 && (
        <div className="mt-4 p-3 bg-white border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Calculator className="text-blue-600" size={16} />
            <span className="font-medium">Discount Summary</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>GHS {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Total Discount:</span>
              <span>-GHS {totalDiscount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-1">
              <span>Final Total:</span>
              <span>GHS {finalTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscountCalculator; 