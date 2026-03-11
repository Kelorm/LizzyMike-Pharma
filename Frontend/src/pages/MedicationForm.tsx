import React from 'react';

interface MedicationFormData {
  name: string;
  category: string;
  stock: number;
  min_stock: number;
  price: number;
  cost: number;
  expiry: string;
  supplier: string;
  batch_no: string;
}

interface MedicationFormProps {
  initialData?: MedicationFormData;
  onSubmit: (data: MedicationFormData) => void;
}

const MedicationForm: React.FC<MedicationFormProps> = ({ initialData, onSubmit }) => {
  const [formData, setFormData] = React.useState<MedicationFormData>(initialData || {
    name: '',
    category: '',
    stock: 0,
    min_stock: 0,
    price: 0,
    cost: 0,
    expiry: '',
    supplier: '',
    batch_no: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('stock') || name.includes('min_stock') || name.includes('price') || name.includes('cost') 
        ? Number(value) 
        : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // Calculate profit and margin
  const profit = formData.price - formData.cost;
  const profitMargin = formData.cost ? (profit / formData.cost) * 100 : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Medication Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            required
          />
        </div>
        
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
            Category
          </label>
          <input
            type="text"
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            required
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="stock" className="block text-sm font-medium text-gray-700">
              Current Stock
            </label>
            <input
              type="number"
              id="stock"
              name="stock"
              value={formData.stock}
              onChange={handleChange}
              min="0"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              required
            />
          </div>
          
          <div>
            <label htmlFor="min_stock" className="block text-sm font-medium text-gray-700">
              Minimum Stock
            </label>
            <input
              type="number"
              id="min_stock"
              name="min_stock"
              value={formData.min_stock}
              onChange={handleChange}
              min="0"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              required
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="cost" className="block text-sm font-medium text-gray-700">
              Cost Price
            </label>
            <input
              type="number"
              id="cost"
              name="cost"
              value={formData.cost}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              required
            />
          </div>
          
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700">
              Sale Price
            </label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              required
            />
          </div>
          
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="text-sm font-medium text-gray-700">Profit Information</div>
            <div className="mt-1">
              <div className="text-sm text-gray-600">Profit: GHS {profit.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Margin: {profitMargin.toFixed(2)}%</div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="expiry" className="block text-sm font-medium text-gray-700">
              Expiry Date
            </label>
            <input
              type="date"
              id="expiry"
              name="expiry"
              value={formData.expiry}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              required
            />
          </div>
          
          <div>
            <label htmlFor="supplier" className="block text-sm font-medium text-gray-700">
              Supplier
            </label>
            <input
              type="text"
              id="supplier"
              name="supplier"
              value={formData.supplier}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              required
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="batch_no" className="block text-sm font-medium text-gray-700">
            Batch Number
          </label>
          <input
            type="text"
            id="batch_no"
            name="batch_no"
            value={formData.batch_no}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            required
          />
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Save Medication
        </button>
      </div>
    </form>
  );
};

export default MedicationForm;