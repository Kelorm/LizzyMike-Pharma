import React from 'react';

interface StockBadgeProps {
  stock: number;
  minStock: number;
}

const StockBadge: React.FC<StockBadgeProps> = ({ stock, minStock }) => {
  const isLow = stock <= minStock;
  
  return (
    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
      isLow ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
    }`}>
      {stock}
    </span>
  );
};

export default StockBadge;