import React from 'react';

interface TableRowProps {
  children: React.ReactNode;
  className?: string;
  highlight?: boolean;
}

const TableRow: React.FC<TableRowProps> = ({ 
  children, 
  className = '', 
  highlight = false 
}) => {
  return (
    <tr className={`${highlight ? 'bg-red-50' : ''} ${className}`}>
      {children}
    </tr>
  );
};

export default TableRow;