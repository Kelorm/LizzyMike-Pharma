import React from 'react';

interface PaymentMethodBadgeProps {
  method: string;
}

const PaymentMethodBadge: React.FC<PaymentMethodBadgeProps> = ({ method }) => {
  const getBadgeInfo = () => {
    switch(method.toLowerCase()) {
      case 'cash':
        return { text: 'Cash', className: 'bg-green-100 text-green-800' };
      case 'card':
        return { text: 'Card', className: 'bg-blue-100 text-blue-800' };
      case 'mobile_money':
        return { text: 'Mobile Money', className: 'bg-purple-100 text-purple-800' };
      case 'insurance':
        return { text: 'Insurance', className: 'bg-yellow-100 text-yellow-800' };
      default:
        return { text: method, className: 'bg-gray-100 text-gray-800' };
    }
  };

  const badgeInfo = getBadgeInfo();

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${badgeInfo.className}`}>
      {badgeInfo.text}
    </span>
  );
};

export default PaymentMethodBadge;