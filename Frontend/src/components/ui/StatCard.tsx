import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  gradient?: string;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon, 
  description,
  gradient = 'from-blue-500 to-blue-600'
}) => {
  return (
    <div className={`bg-gradient-to-r ${gradient} text-white p-6 rounded-lg shadow-lg`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-90">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {description && (
            <p className="text-xs opacity-80 mt-1">{description}</p>
          )}
        </div>
        <div className="opacity-80">
          {icon}
        </div>
      </div>
    </div>
  );
};

export default StatCard;