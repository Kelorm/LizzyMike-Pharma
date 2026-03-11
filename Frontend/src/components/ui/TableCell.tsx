import React from 'react';

interface TableCellProps {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
}

const TableCell: React.FC<TableCellProps> = ({ children, className, colSpan }) => (
  <td className={className} colSpan={colSpan}>{children}</td>
);

export default TableCell;