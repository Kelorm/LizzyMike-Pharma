import React from 'react';

interface StatusBadgeProps {
  status: 'Preparing' | 'Ready' | 'Dispensed';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const statusData = {
    Preparing: { label: 'Preparing', color: 'bg-yellow-100 text-yellow-800' },
    Ready: { label: 'Ready', color: 'bg-green-100 text-green-800' },
    Dispensed: { label: 'Dispensed', color: 'bg-gray-100 text-gray-800' }
  };
  
  const { label, color } = statusData[status];
  
  return (
    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${color}`}>
      {label}
    </span>
  );
};

export default StatusBadge;