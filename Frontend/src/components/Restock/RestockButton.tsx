import React, { useState } from 'react';
import { Package, Plus } from 'lucide-react';
import RestockForm from './RestockForm';
import RestockHistory from './RestockHistory';
import RestockAnalytics from './RestockAnalytics';
import { Medication } from '../../types';
import { usePermissions } from '../../hooks/usePermissions';

interface RestockButtonProps {
  medication?: Medication;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  onRefresh?: () => void | Promise<void>;
}

const RestockButton = ({
  medication,
  className = '',
  variant = 'primary',
  size = 'md',
  onRefresh,
}: RestockButtonProps) => {
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('create_restock');
  const canView = hasPermission('view_restock');

  const [showRestockForm, setShowRestockForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  if (!canCreate && !canView) {
    return null;
  }

  const getButtonClasses = () => {
    const baseClasses = 'inline-flex items-center font-medium rounded-lg transition-colors';
    const variantClasses = {
      primary: 'bg-green-600 text-white hover:bg-green-700',
      secondary: 'bg-gray-600 text-white hover:bg-gray-700',
      outline: 'border border-green-600 text-green-600 hover:bg-green-50',
    };
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };
    return `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
  };

  const handleSuccess = async () => {
    setShowRestockForm(false);
    if (onRefresh) {
      await onRefresh();
    }
  };

  return (
    <>
      <div className="flex space-x-2">
        {canCreate && (
          <button
            type="button"
            onClick={() => setShowRestockForm(true)}
            className={getButtonClasses()}
          >
            <Plus className="mr-2" size={16} />
            Restock
          </button>
        )}

        {canView && (
          <>
            <button
              type="button"
              onClick={() => setShowHistory(true)}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Package className="mr-2" size={16} />
              History
            </button>
            <button
              type="button"
              onClick={() => setShowAnalytics(true)}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-purple-600 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors"
            >
              <Package className="mr-2" size={16} />
              Analytics
            </button>
          </>
        )}
      </div>

      {showRestockForm && canCreate && (
        <RestockForm
          onClose={() => setShowRestockForm(false)}
          medication={medication}
          onRestockSuccess={handleSuccess}
        />
      )}

      {showHistory && canView && (
        <RestockHistory
          onClose={() => setShowHistory(false)}
          medicationId={medication?.id}
        />
      )}

      {showAnalytics && canView && (
        <RestockAnalytics onClose={() => setShowAnalytics(false)} />
      )}
    </>
  );
};

export default RestockButton;
