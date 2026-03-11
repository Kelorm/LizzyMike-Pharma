import React from 'react';

interface AlertCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const AlertCard: React.FC<AlertCardProps> = ({ title, icon, children }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        {icon}
        <span className="ml-2">{title}</span>
      </h3>
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

export default AlertCard;