
import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  change,
  changeType = 'neutral'
}) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 hover:scale-105">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
          {change && (
            <p className={`text-sm ${
              changeType === 'positive' ? 'text-green-600' : 
              changeType === 'negative' ? 'text-red-600' : 
              'text-gray-500'
            }`}>
              {change}
            </p>
          )}
        </div>
        <div className="p-3 bg-blue-50 rounded-lg">
          {icon}
        </div>
      </div>
    </div>
  );
};
