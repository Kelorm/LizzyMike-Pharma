import React from 'react';

interface PaymentBadgeProps {
  method: 'cash' | 'card' | 'insurance' | 'insurance-copay';
}

const PaymentBadge: React.FC<PaymentBadgeProps> = ({ method }) => {
  const methodData = {
    cash: { label: 'Cash', color: 'bg-green-100 text-green-800' },
    card: { label: 'Card', color: 'bg-blue-100 text-blue-800' },
    insurance: { label: 'Insurance', color: 'bg-purple-100 text-purple-800' },
    'insurance-copay': { label: 'Insurance + Copay', color: 'bg-yellow-100 text-yellow-800' }
  };
  
  const { label, color } = methodData[method];
  
  return (
    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${color}`}>
      {label}
    </span>
  );
};

export default PaymentBadge;