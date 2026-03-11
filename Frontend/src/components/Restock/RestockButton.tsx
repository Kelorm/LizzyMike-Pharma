import React, { useState } from 'react';
import { Package, Plus } from 'lucide-react';
import RestockForm from './RestockForm';
import RestockHistory from './RestockHistory';
import RestockAnalytics from './RestockAnalytics';
import { Medication } from '../../types';

interface RestockButtonProps {
  medication?: Medication;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const RestockButton = ({ 
  medication, 
  className = '', 
  variant = 'primary',
  size = 'md' 
}: RestockButtonProps) => {
  const [showRestockForm, setShowRestockForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const getButtonClasses = () => {
    const baseClasses = 'inline-flex items-center font-medium rounded-lg transition-colors';
    
    const variantClasses = {
      primary: 'bg-green-600 text-white hover:bg-green-700',
      secondary: 'bg-gray-600 text-white hover:bg-gray-700',
      outline: 'border border-green-600 text-green-600 hover:bg-green-50'
    };
    
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    };
    
    return `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
  };

  return (
    <>
      <div className="flex space-x-2">
        <button
          onClick={() => setShowRestockForm(true)}
          className={getButtonClasses()}
        >
          <Plus className="mr-2" size={16} />
          Restock
        </button>
        
        <button
          onClick={() => setShowHistory(true)}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Package className="mr-2" size={16} />
          History
        </button>
        
        <button
          onClick={() => setShowAnalytics(true)}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-purple-600 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors"
        >
          <Package className="mr-2" size={16} />
          Analytics
        </button>
      </div>

      {/* Restock Form Modal */}
      {showRestockForm && (
        <RestockForm
          onClose={() => setShowRestockForm(false)}
          medication={medication}
          onRestockSuccess={(restock) => {
            console.log('Restock created:', restock);
            setShowRestockForm(false);
            // You can add a callback here to refresh the parent component
          }}
        />
      )}

      {/* Restock History Modal */}
      {showHistory && (
        <RestockHistory
          onClose={() => setShowHistory(false)}
          onRestockClick={(restock) => {
            console.log('Restock clicked:', restock);
            // You can add navigation or detailed view here
          }}
        />
      )}

      {/* Restock Analytics Modal */}
      {showAnalytics && (
        <RestockAnalytics
          onClose={() => setShowAnalytics(false)}
        />
      )}
    </>
  );
};

export default RestockButton; 