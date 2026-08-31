import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './test-utils';
import apiClient from '../utils/axios';
import { server } from './mocks/server';
import { http, HttpResponse } from 'msw';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api/v1';

/**
 * Mock Sale Form Component for testing
 */
interface SaleFormProps {
  onSuccess?: (message: string) => void;
}

function SaleForm({ onSuccess }: SaleFormProps) {
  const [customerName, setCustomerName] = React.useState('');
  const [quantity, setQuantity] = React.useState('1');
  const [price, setPrice] = React.useState('');
  const [paymentMethod, setPaymentMethod] = React.useState('cash');
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const validateForm = (): boolean => {
    setError(null);

    if (!customerName.trim()) {
      setError('Customer name is required');
      return false;
    }

    if (!price || parseFloat(price) <= 0) {
      setError('Price must be greater than 0');
      return false;
    }

    const qty = parseInt(quantity, 10);
    if (qty <= 0) {
      setError('Quantity must be greater than 0');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setSuccess(null);

    try {
      const qty = parseInt(quantity, 10);
      const priceNum = parseFloat(price);
      const total = qty * priceNum;

      const saleData = {
        customer: '1302598e-d2b7-4048-b43e-96bf3851529a', // Default customer
        customer_name: customerName,
        date: new Date().toISOString().split('T')[0],
        total,
        subtotal: total,
        discount_total: 0,
        payment_method: paymentMethod,
        notes: '',
        items: [
          {
            medication: 'med-uuid-1',
            qty,
            quantity: qty,
            price: priceNum,
            cost: priceNum * 0.5, // Mock cost
          },
        ],
      };

      const response = await apiClient.post(`${API_BASE_URL}/sales/`, saleData);

      setSuccess('Sale recorded successfully!');
      setCustomerName('');
      setQuantity('1');
      setPrice('');
      setPaymentMethod('cash');

      if (onSuccess) {
        onSuccess('Sale recorded successfully!');
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.detail ||
        err.response?.data?.items ||
        'Failed to record sale. Please try again.';
      setError(
        typeof errorMessage === 'object'
          ? JSON.stringify(errorMessage)
          : errorMessage
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="customer-name">Customer Name *</label>
        <input
          id="customer-name"
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Enter customer name"
          data-testid="customer-name-input"
          required
        />
      </div>

      <div>
        <label htmlFor="quantity">Quantity *</label>
        <input
          id="quantity"
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Enter quantity"
          data-testid="quantity-input"
          min="0"
          required
        />
      </div>

      <div>
        <label htmlFor="price">Price per Unit *</label>
        <input
          id="price"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Enter price"
          data-testid="price-input"
          step="0.01"
          min="0"
          required
        />
      </div>

      <div>
        <label htmlFor="payment-method">Payment Method</label>
        <select
          id="payment-method"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          data-testid="payment-method-select"
        >
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="mobile_money">Mobile Money</option>
        </select>
      </div>

      {error && <div data-testid="error-message" style={{ color: 'red' }}>{error}</div>}
      {success && (
        <div data-testid="success-message" style={{ color: 'green' }}>
          {success}
        </div>
      )}

      <button type="submit" disabled={isLoading} data-testid="submit-button">
        {isLoading ? 'Processing...' : 'Record Sale'}
      </button>
    </form>
  );
}

describe('Sales Form', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('access_token', 'test-token');
    delete apiClient.defaults.headers.common['Authorization'];
  });

  describe('Form Validation', () => {
    it('should render form with all required fields', () => {
      renderWithProviders(<SaleForm />, { withAuth: true });

      expect(screen.getByTestId('customer-name-input')).toBeInTheDocument();
      expect(screen.getByTestId('quantity-input')).toBeInTheDocument();
      expect(screen.getByTestId('price-input')).toBeInTheDocument();
      expect(screen.getByTestId('payment-method-select')).toBeInTheDocument();
      expect(screen.getByTestId('submit-button')).toBeInTheDocument();
    });

    it('should validate that customer name is required', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SaleForm />, { withAuth: true });

      const quantityInput = screen.getByTestId('quantity-input');
      const priceInput = screen.getByTestId('price-input');
      const submitButton = screen.getByTestId('submit-button');

      // Fill in other fields but leave customer name empty
      await user.clear(quantityInput);
      await user.type(quantityInput, '5');
      await user.type(priceInput, '100');

      // Try to submit
      await user.click(submitButton);

      // Should show error
      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Customer name is required'
      );
    });

    it('should validate that price is required and greater than 0', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SaleForm />, { withAuth: true });

      const customerNameInput = screen.getByTestId('customer-name-input');
      const quantityInput = screen.getByTestId('quantity-input');
      const submitButton = screen.getByTestId('submit-button');

      await user.type(customerNameInput, 'John Doe');
      await user.clear(quantityInput);
      await user.type(quantityInput, '5');

      // Leave price empty and submit
      await user.click(submitButton);

      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Price must be greater than 0'
      );
    });

    it('should reject zero price', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SaleForm />, { withAuth: true });

      const customerNameInput = screen.getByTestId('customer-name-input');
      const quantityInput = screen.getByTestId('quantity-input');
      const priceInput = screen.getByTestId('price-input');
      const submitButton = screen.getByTestId('submit-button');

      await user.type(customerNameInput, 'Jane Doe');
      await user.clear(quantityInput);
      await user.type(quantityInput, '5');
      await user.type(priceInput, '0');

      await user.click(submitButton);

      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Price must be greater than 0'
      );
    });

    it('should reject negative price', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SaleForm />, { withAuth: true });

      const customerNameInput = screen.getByTestId('customer-name-input');
      const quantityInput = screen.getByTestId('quantity-input');
      const priceInput = screen.getByTestId('price-input');
      const submitButton = screen.getByTestId('submit-button');

      await user.type(customerNameInput, 'Jane Doe');
      await user.clear(quantityInput);
      await user.type(quantityInput, '5');
      await user.type(priceInput, '-10');

      await user.click(submitButton);

      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Price must be greater than 0'
      );
    });
  });

  describe('Quantity Validation', () => {
    it('should not allow quantity of 0', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SaleForm />, { withAuth: true });

      const customerNameInput = screen.getByTestId('customer-name-input');
      const quantityInput = screen.getByTestId('quantity-input');
      const priceInput = screen.getByTestId('price-input');
      const submitButton = screen.getByTestId('submit-button');

      await user.type(customerNameInput, 'John Doe');
      await user.clear(quantityInput);
      await user.type(quantityInput, '0');
      await user.type(priceInput, '50');

      await user.click(submitButton);

      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Quantity must be greater than 0'
      );
    });

    it('should not allow negative quantity', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SaleForm />, { withAuth: true });

      const customerNameInput = screen.getByTestId('customer-name-input');
      const quantityInput = screen.getByTestId('quantity-input');
      const priceInput = screen.getByTestId('price-input');
      const submitButton = screen.getByTestId('submit-button');

      await user.type(customerNameInput, 'John Doe');
      await user.clear(quantityInput);
      await user.type(quantityInput, '-5');
      await user.type(priceInput, '50');

      await user.click(submitButton);

      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Quantity must be greater than 0'
      );
    });

    it('should accept positive quantity', async () => {
      const user = userEvent.setup();
      const onSuccess = jest.fn();
      
      renderWithProviders(<SaleForm onSuccess={onSuccess} />, {
        withAuth: true,
      });

      const customerNameInput = screen.getByTestId('customer-name-input');
      const quantityInput = screen.getByTestId('quantity-input');
      const priceInput = screen.getByTestId('price-input');
      const submitButton = screen.getByTestId('submit-button');

      await user.type(customerNameInput, 'John Doe');
      await user.clear(quantityInput);
      await user.type(quantityInput, '5');
      await user.type(priceInput, '50');

      await user.click(submitButton);

      // Should show success message
      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toBeInTheDocument();
      });
    });
  });

  describe('Sale Submission', () => {
    it('should successfully submit form with valid data', async () => {
      const user = userEvent.setup();
      const onSuccess = jest.fn();

      renderWithProviders(<SaleForm onSuccess={onSuccess} />, {
        withAuth: true,
      });

      const customerNameInput = screen.getByTestId('customer-name-input');
      const quantityInput = screen.getByTestId('quantity-input');
      const priceInput = screen.getByTestId('price-input');
      const submitButton = screen.getByTestId('submit-button');

      await user.type(customerNameInput, 'Test Customer');
      await user.clear(quantityInput);
      await user.type(quantityInput, '3');
      await user.type(priceInput, '100.50');

      await user.click(submitButton);

      // Should show success message
      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toHaveTextContent(
          'Sale recorded successfully!'
        );
      });

      // Callback should be called
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith('Sale recorded successfully!');
      });
    });

    it('should clear form after successful submission', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SaleForm />, { withAuth: true });

      const customerNameInput = screen.getByTestId(
        'customer-name-input'
      ) as HTMLInputElement;
      const quantityInput = screen.getByTestId(
        'quantity-input'
      ) as HTMLInputElement;
      const priceInput = screen.getByTestId('price-input') as HTMLInputElement;
      const submitButton = screen.getByTestId('submit-button');

      await user.type(customerNameInput, 'Test Customer');
      await user.clear(quantityInput);
      await user.type(quantityInput, '3');
      await user.type(priceInput, '100');

      await user.click(submitButton);

      // Wait for success message
      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toBeInTheDocument();
      });

      // Form should be cleared
      expect(customerNameInput.value).toBe('');
      expect(quantityInput.value).toBe('1');
      expect(priceInput.value).toBe('');
    });

    it('should show loading state while submitting', async () => {
      const user = userEvent.setup();

      // Make sale endpoint slow
      server.use(
        http.post(`${API_BASE_URL}/sales/`, async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json(
            {
              id: 'sale-uuid',
              customer_name: 'Test',
              total: 300,
              items: [],
            },
            { status: 201 }
          );
        })
      );

      renderWithProviders(<SaleForm />, { withAuth: true });

      const customerNameInput = screen.getByTestId('customer-name-input');
      const quantityInput = screen.getByTestId('quantity-input');
      const priceInput = screen.getByTestId('price-input');
      const submitButton = screen.getByTestId('submit-button');

      await user.type(customerNameInput, 'Test Customer');
      await user.clear(quantityInput);
      await user.type(quantityInput, '3');
      await user.type(priceInput, '100');

      await user.click(submitButton);

      // Button should show loading text
      expect(submitButton).toHaveTextContent('Processing...');
      expect(submitButton).toBeDisabled();
    });

    it('should handle server validation errors', async () => {
      const user = userEvent.setup();

      // Mock validation error response
      server.use(
        http.post(`${API_BASE_URL}/sales/`, () => {
          return HttpResponse.json(
            {
              customer_name: ['This field is required'],
            },
            { status: 400 }
          );
        })
      );

      renderWithProviders(<SaleForm />, { withAuth: true });

      const customerNameInput = screen.getByTestId('customer-name-input');
      const quantityInput = screen.getByTestId('quantity-input');
      const priceInput = screen.getByTestId('price-input');
      const submitButton = screen.getByTestId('submit-button');

      await user.type(customerNameInput, 'Test');
      await user.clear(quantityInput);
      await user.type(quantityInput, '3');
      await user.type(priceInput, '100');

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });
    });

    it('should handle network errors', async () => {
      const user = userEvent.setup();

      // Mock network error
      server.use(
        http.post(`${API_BASE_URL}/sales/`, () => {
          return HttpResponse.error();
        })
      );

      renderWithProviders(<SaleForm />, { withAuth: true });

      const customerNameInput = screen.getByTestId('customer-name-input');
      const quantityInput = screen.getByTestId('quantity-input');
      const priceInput = screen.getByTestId('price-input');
      const submitButton = screen.getByTestId('submit-button');

      await user.type(customerNameInput, 'Test Customer');
      await user.clear(quantityInput);
      await user.type(quantityInput, '3');
      await user.type(priceInput, '100');

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });
    });
  });

  describe('Form Field Interactions', () => {
    it('should allow selecting different payment methods', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SaleForm />, { withAuth: true });

      const paymentMethodSelect = screen.getByTestId(
        'payment-method-select'
      ) as HTMLSelectElement;

      expect(paymentMethodSelect.value).toBe('cash');

      await user.selectOptions(paymentMethodSelect, 'card');
      expect(paymentMethodSelect.value).toBe('card');

      await user.selectOptions(paymentMethodSelect, 'mobile_money');
      expect(paymentMethodSelect.value).toBe('mobile_money');
    });

    it('should accept decimal prices', async () => {
      const user = userEvent.setup();
      const onSuccess = jest.fn();

      renderWithProviders(<SaleForm onSuccess={onSuccess} />, {
        withAuth: true,
      });

      const customerNameInput = screen.getByTestId('customer-name-input');
      const quantityInput = screen.getByTestId('quantity-input');
      const priceInput = screen.getByTestId('price-input');
      const submitButton = screen.getByTestId('submit-button');

      await user.type(customerNameInput, 'Test Customer');
      await user.clear(quantityInput);
      await user.type(quantityInput, '2');
      await user.type(priceInput, '99.99');

      await user.click(submitButton);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });
  });
});
