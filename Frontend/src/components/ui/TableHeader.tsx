import React from 'react';

interface TableHeaderProps {
  headers: string[];
  className?: string;
}

const TableHeader: React.FC<TableHeaderProps> = ({ headers, className = '' }) => {
  return (
    <thead className={`bg-gray-50 ${className}`}>
      <tr>
        {headers.map((header, index) => (
          <th 
            key={index} 
            className="px-4 py-3 text-left text-sm font-medium text-gray-500"
          >
            {header}
          </th>
        ))}
      </tr>
    </thead>
  );
};

export default TableHeader;