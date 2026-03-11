// src/pages/Inventory.tsx
import React, { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Download, Package } from 'lucide-react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { RestockButton } from '../components/Restock';

import { Medication } from '../types';

interface InventoryProps {
  medications: Medication[];
  loading: boolean;
  error: string | null;
  onOpenModal: (type: string, item?: any) => void;
  onMedicationOperation: (
    operation: string,
    medicationData?: any,
    id?: string
  ) => Promise<void>;
}

const formatPrice = (price: number | string | null | undefined): string => {
  if (price === null || price === undefined || price === '') {
    return '0.00';
  }
  const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numericPrice)) return '0.00';
  return numericPrice.toFixed(2);
};

const StockBadge: React.FC<{ stock: number; minStock: number }> = ({ stock, minStock }) => {
  const isLow = stock <= minStock;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
      isLow ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
    }`}>
      {stock} {isLow ? ' (Low)' : ''}
    </span>
  );
};

const Inventory: React.FC<InventoryProps> = ({
  loading,
  error,
  medications,
  onOpenModal,
  onMedicationOperation
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showExpired, setShowExpired] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Medication;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState<string[]>([]);

  // Apply sorting
  const sortedMedications = useMemo(() => {
    const sortableItems = [...medications];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [medications, sortConfig]);

  // Apply filtering
  const filteredMedications = useMemo(() => {
    return sortedMedications.filter((med) => {
      const matchesSearch = med.name.toLowerCase().includes(searchTerm.toLowerCase());
      const isExpired = new Date(med.expiry) < new Date();
      return matchesSearch && (showExpired ? isExpired : true);
    });
  }, [sortedMedications, searchTerm, showExpired]);

  const handleSort = (key: keyof Medication) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === 'asc'
    ) {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleBulkDelete = () => {
    if (selected.length === 0) return;
    setPendingDeletion(selected);
    setDeleteDialogOpen(true);
  };

  const confirmBulkDelete = () => {
    pendingDeletion.forEach(id => onMedicationOperation('delete', undefined, id));
    setSelected([]);
    setDeleteDialogOpen(false);
    setPendingDeletion([]);
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Category', 'Stock', 'Min Stock', 'Price', 'Expiry', 'Batch'];
    const csvContent = [
      headers.join(','),
      ...medications.map(m => [
        `"${m.name}"`,
        m.category,
        m.stock,
        m.min_stock,
        m.price,
        new Date(m.expiry).toISOString().split('T')[0],
        m.batch_no
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) return <div className="text-center py-10">Loading inventory...</div>;
  if (error) return <div className="text-center py-10 text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Inventory Management</h2>
        <div className="flex space-x-2">
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button 
            onClick={() => onOpenModal('addMedication')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Add Medication
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm p-2 pl-10"
              placeholder="Search medications..."
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
        <div className="flex items-center">
          <label className="flex items-center cursor-pointer">
            <div className="relative">
              <input 
                type="checkbox" 
                className="sr-only" 
                checked={showExpired}
                onChange={() => setShowExpired(!showExpired)}
              />
              <div className={`block w-14 h-8 rounded-full ${showExpired ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
              <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${
                showExpired ? 'transform translate-x-6' : ''
              }`}></div>
            </div>
            <div className="ml-3 text-gray-700 font-medium">Show Expired</div>
          </label>
        </div>
        {selected.length > 0 && (
          <div className="flex items-center">
            <button
              onClick={handleBulkDelete}
              className="text-red-600 hover:text-red-800 flex items-center"
            >
              <Trash2 className="mr-1 h-4 w-4" /> Delete ({selected.length})
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  <input 
                    type="checkbox" 
                    checked={selected.length === filteredMedications.length && filteredMedications.length > 0}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelected(filteredMedications.map(m => String(m.id)));
                      } else {
                        setSelected([]);
                      }
                    }}
                  />
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('name')}
              >
                Name {sortConfig?.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('category')}
              >
                Category {sortConfig?.key === 'category' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('price')}
              >
                Price {sortConfig?.key === 'price' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('expiry')}
              >
                Expiry {sortConfig?.key === 'expiry' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredMedications.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                  {searchTerm
                    ? 'No medications found matching your search.'
                    : 'No medications in inventory.'}
                </td>
              </tr>
            ) : (
              filteredMedications.map((med) => (
                <tr key={med.id} className={med.stock <= med.min_stock ? 'bg-red-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selected.includes(String(med.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelected([...selected, String(med.id)]);
                        } else {
                          setSelected(selected.filter(id => id !== String(med.id)));
                        }
                      }}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    {med.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {med.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StockBadge stock={med.stock} minStock={med.min_stock} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    GHS {formatPrice(med.price)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {new Date(med.expiry).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(med.expiry) < new Date() ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Expired
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex gap-2">
                      <button
                        aria-label="Edit medication"
                        onClick={() => onOpenModal('editMedication', med)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        aria-label="Delete medication"
                        onClick={() => onOpenModal('deleteMedication', med)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                      <RestockButton 
                        medication={med}
                        size="sm"
                        variant="outline"
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete {pendingDeletion.length} medication(s)?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmBulkDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Inventory;