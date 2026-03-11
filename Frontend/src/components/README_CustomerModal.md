# CustomerModal Component

A comprehensive, reusable modal component for managing pharmacy customers with full CRUD operations.

## Features

✅ **Add New Customers** - Complete form with validation  
✅ **Edit Existing Customers** - Pre-populated form with current data  
✅ **View Customer Details** - Read-only display of customer information  
✅ **Delete Customers** - Confirmation dialog with safety checks  
✅ **Form Validation** - Real-time validation with error messages  
✅ **Responsive Design** - Works on desktop and mobile devices  
✅ **Loading States** - Visual feedback during operations  
✅ **Error Handling** - Comprehensive error management  
✅ **Toast Notifications** - Success and error feedback  
✅ **Accessibility** - Keyboard navigation and screen reader support  

## Installation

The CustomerModal component is already included in your project. Make sure you have the required dependencies:

```bash
npm install lucide-react react-hot-toast
```

## Basic Usage

```tsx
import React, { useState } from 'react';
import CustomerModal from './components/CustomerModal';
import { Customer } from './types';

const MyComponent = () => {
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view' | 'delete' | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>(undefined);

  const handleOpenModal = (type: 'add' | 'edit' | 'view' | 'delete', customer?: Customer) => {
    setModalType(type);
    setSelectedCustomer(customer);
  };

  const handleCloseModal = () => {
    setModalType(null);
    setSelectedCustomer(undefined);
  };

  const handleSuccess = () => {
    // Refresh your customer list or perform other actions
    console.log('Customer operation completed successfully');
  };

  return (
    <div>
      {/* Your existing content */}
      
      {/* Customer Modal */}
      {modalType && (
        <CustomerModal
          type={modalType}
          customer={selectedCustomer}
          onClose={handleCloseModal}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};
```

## Modal Types

### 1. Add Customer (`type="add"`)

Opens a form to create a new customer. No customer data is required.

```tsx
<button onClick={() => handleOpenModal('add')}>
  Add Customer
</button>
```

### 2. Edit Customer (`type="edit"`)

Opens a form pre-populated with existing customer data for editing.

```tsx
<button onClick={() => handleOpenModal('edit', customer)}>
  Edit Customer
</button>
```

### 3. View Customer (`type="view"`)

Displays customer information in a read-only format.

```tsx
<button onClick={() => handleOpenModal('view', customer)}>
  View Customer
</button>
```

### 4. Delete Customer (`type="delete"`)

Shows a confirmation dialog for deleting a customer.

```tsx
<button onClick={() => handleOpenModal('delete', customer)}>
  Delete Customer
</button>
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `type` | `'add' \| 'edit' \| 'view' \| 'delete'` | Yes | The type of modal to display |
| `customer` | `Customer \| undefined` | No | Customer data (required for edit, view, delete) |
| `onClose` | `() => void` | Yes | Function called when modal is closed |
| `onSuccess` | `() => void` | No | Function called after successful operation |

## Customer Data Structure

```tsx
interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  dob: string;
  insurance: string;
  allergies: string;
}
```

## Form Validation

The modal includes comprehensive form validation:

- **Name**: Required field
- **Phone**: Required, must be a valid phone number format
- **Email**: Optional, but must be valid email format if provided
- **Address**: Required field
- **Date of Birth**: Optional, but cannot be in the future
- **Insurance**: Optional
- **Allergies**: Optional

## Integration with CustomerContext

The CustomerModal automatically uses your existing CustomerContext for all operations:

```tsx
import { useCustomerContext } from '../contexts/CustomerContext';

// The modal automatically uses these functions:
const { createCustomer, updateCustomer, deleteCustomer } = useCustomerContext();
```

## Error Handling

The modal handles errors gracefully:

- **API Errors**: Displays error messages from the backend
- **Validation Errors**: Shows field-specific error messages
- **Network Errors**: Generic error messages for connectivity issues
- **Toast Notifications**: Success and error feedback using react-hot-toast

## Styling

The modal uses Tailwind CSS classes and is fully responsive:

- **Desktop**: Full-width modal with proper spacing
- **Mobile**: Responsive design that adapts to smaller screens
- **Icons**: Uses Lucide React icons for consistent styling
- **Colors**: Follows your existing color scheme

## Accessibility Features

- **Keyboard Navigation**: Tab through form fields
- **Screen Reader Support**: Proper ARIA labels and descriptions
- **Focus Management**: Automatic focus handling
- **Escape Key**: Close modal with Escape key
- **Click Outside**: Close modal by clicking outside

## Example Integration

Here's how to integrate the CustomerModal into your existing Customers page:

```tsx
import React, { useState } from 'react';
import CustomerModal from './components/CustomerModal';
import { Customer } from './types';
import { useCustomerContext } from './contexts/CustomerContext';

const CustomersPage = () => {
  const { customers, refreshCustomers } = useCustomerContext();
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view' | 'delete' | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>(undefined);

  const handleOpenModal = (type: 'add' | 'edit' | 'view' | 'delete', customer?: Customer) => {
    setModalType(type);
    setSelectedCustomer(customer);
  };

  const handleCloseModal = () => {
    setModalType(null);
    setSelectedCustomer(undefined);
  };

  const handleSuccess = () => {
    refreshCustomers(); // Refresh the customer list
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Customers</h1>
        <button
          onClick={() => handleOpenModal('add')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Add Customer
        </button>
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-lg shadow">
        <table className="min-w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id}>
                <td>{customer.name}</td>
                <td>{customer.phone}</td>
                <td>{customer.email}</td>
                <td>
                  <button onClick={() => handleOpenModal('view', customer)}>
                    View
                  </button>
                  <button onClick={() => handleOpenModal('edit', customer)}>
                    Edit
                  </button>
                  <button onClick={() => handleOpenModal('delete', customer)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Customer Modal */}
      {modalType && (
        <CustomerModal
          type={modalType}
          customer={selectedCustomer}
          onClose={handleCloseModal}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};
```

## Best Practices

1. **Always handle the onSuccess callback** to refresh your data after operations
2. **Use proper TypeScript types** for customer data
3. **Implement proper error boundaries** in your parent components
4. **Test all modal types** to ensure they work correctly
5. **Consider adding loading states** in your parent components
6. **Use consistent naming** for your state variables

## Troubleshooting

### Modal not opening
- Check that `modalType` is not null
- Ensure the modal component is rendered in your JSX
- Verify that your click handlers are working

### Form validation errors
- Check that all required fields are filled
- Ensure phone number format is correct
- Verify email format if provided

### API errors
- Check your network connection
- Verify your CustomerContext is properly configured
- Ensure your backend API is running

### Styling issues
- Make sure Tailwind CSS is properly configured
- Check that Lucide React icons are installed
- Verify that your CSS classes are not being overridden

## Support

If you encounter any issues with the CustomerModal component:

1. Check the browser console for error messages
2. Verify that all required dependencies are installed
3. Ensure your CustomerContext is properly set up
4. Test with the provided demo components

The CustomerModal is designed to be robust and handle edge cases gracefully, but if you need additional customization, you can modify the component directly or extend it with additional props. 