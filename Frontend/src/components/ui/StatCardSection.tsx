// src/components/ui/StatCardSection.tsx
import React from 'react';
import { DollarSign, TrendingUp, Activity, Calendar } from 'lucide-react';
import StatCard from './StatCard';

interface StatCardSectionProps {
  totalRevenue: number;
  totalProfit?: number;
  totalCost?: number;
  averageOrderValue?: number;
}

const StatCardSection: React.FC<StatCardSectionProps> = ({
  totalRevenue,
  totalProfit = 0,
  totalCost = 0,
  averageOrderValue = 0,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Revenue"
        value={`GHS ${totalRevenue.toFixed(2)}`}
        icon={<DollarSign className="h-6 w-6 text-white" />}
        gradient="from-green-500 to-emerald-600"
      />
      <StatCard
        title="Total Profit"
        value={`GHS ${totalProfit.toFixed(2)}`}
        icon={<TrendingUp className="h-6 w-6 text-white" />}
        gradient="from-blue-500 to-blue-700"
      />
      <StatCard
        title="Total Cost"
        value={`GHS ${totalCost.toFixed(2)}`}
        icon={<Activity className="h-6 w-6 text-white" />}
        gradient="from-red-400 to-red-600"
      />
      <StatCard
        title="Avg. Order Value"
        value={`GHS ${averageOrderValue.toFixed(2)}`}
        icon={<Calendar className="h-6 w-6 text-white" />}
        gradient="from-yellow-400 to-yellow-600"
      />
    </div>
  );
};

export default StatCardSection;
