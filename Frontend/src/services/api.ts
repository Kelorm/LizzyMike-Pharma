import apiClient from '../utils/axios';
import { Customer, Sale, Medication, Prescription, DashboardAnalytics, SalesAnalytics } from '../types';

// Define API endpoints with TypeScript interfaces
interface MedicationAPI {
  list: () => Promise<any>;
  create: (data: Partial<Medication>) => Promise<any>;
  update: (id: string, data: Partial<Medication>) => Promise<any>;
  delete: (id: string) => Promise<any>;
  search: (query: string) => Promise<any>;
  getLowStock: () => Promise<any>;
  getExpiringSoon: () => Promise<any>;
}

interface CustomerAPI {
  list: () => Promise<any>;
  create: (data: Partial<Customer>) => Promise<any>;
  update: (id: string, data: Partial<Customer>) => Promise<any>;
  delete: (id: string) => Promise<any>;
  search: (query: string) => Promise<any>;
  getById: (id: string) => Promise<any>;
  getSalesHistory: (id: string) => Promise<any>;
}

interface PrescriptionAPI {
  list: () => Promise<any>;
  create: (data: Partial<Prescription>) => Promise<any>;
  update: (id: string, data: Partial<Prescription>) => Promise<any>;
  delete: (id: string) => Promise<any>;
  updateStatus: (id: string, status: string) => Promise<any>;
  getByCustomer: (customerId: string) => Promise<any>;
}

interface SaleAPI {
  list: () => Promise<any>;
  create: (data: Partial<Sale>) => Promise<any>;
  update: (id: string, data: Partial<Sale>) => Promise<any>;
  delete: (id: string) => Promise<any>;
  getById: (id: string) => Promise<any>;
  getDailySummary: () => Promise<any>;
  getMonthlySummary: () => Promise<any>;
  generateReceipt: (id: string) => Promise<any>;
  generateInvoice: (id: string) => Promise<any>;
}

interface RestockAPI {
  create: (data: Record<string, unknown>) => Promise<any>;
  list: (params?: Record<string, string>) => Promise<any>;
  getById: (id: string) => Promise<any>;
  update: (id: string, data: Record<string, unknown>) => Promise<any>;
  delete: (id: string) => Promise<any>;
  analytics: () => Promise<any>;
}

interface AnalyticsAPI {
  getDashboardAnalytics: (days?: number) => Promise<DashboardAnalytics>;
  getSalesAnalytics: (days?: number) => Promise<SalesAnalytics>;
}

// Attach methods to API objects
const medicationAPI: MedicationAPI = {
  list: () => apiClient.get('/medications/'),
  create: (data) => apiClient.post('/medications/', data),
  update: (id, data) => apiClient.put(`/medications/${id}/`, data),
  delete: (id) => apiClient.delete(`/medications/${id}/`),
  search: (query) => apiClient.get(`/medications/?search=${encodeURIComponent(query)}`),
  getLowStock: () => apiClient.get('/medications/low_stock_alerts/'),
  getExpiringSoon: () => apiClient.get('/medications/expiring_soon/'),
};

const customerAPI: CustomerAPI = {
  list: () => apiClient.get('/customers/'),
  create: (data) => apiClient.post('/customers/', data),
  update: (id, data) => apiClient.put(`/customers/${id}/`, data),
  delete: (id) => apiClient.delete(`/customers/${id}/`),
  search: (query) => apiClient.get(`/customers/?search=${encodeURIComponent(query)}`),
  getById: (id) => apiClient.get(`/customers/${id}/`),
  getSalesHistory: (id) => apiClient.get(`/customers/${id}/sales/`),
};

const prescriptionAPI: PrescriptionAPI = {
  list: () => apiClient.get('/prescriptions/'),
  create: (data) => apiClient.post('/prescriptions/', data),
  update: (id, data) => apiClient.put(`/prescriptions/${id}/`, data),
  delete: (id) => apiClient.delete(`/prescriptions/${id}/`),
  updateStatus: (id, status) => apiClient.patch(`/prescriptions/${id}/update_status/`, { status }),
  getByCustomer: (customerId) => apiClient.get(`/customers/${customerId}/prescriptions/`),
};

const saleAPI: SaleAPI = {
  list: () => apiClient.get('/sales/'),
  create: (data) => apiClient.post('/sales/', data),
  update: (id, data) => apiClient.put(`/sales/${id}/`, data),
  delete: (id) => apiClient.delete(`/sales/${id}/`),
  getById: (id) => apiClient.get(`/sales/${id}/`),
  getDailySummary: () => apiClient.get('/sales/daily_summary/'),
  getMonthlySummary: () => apiClient.get('/sales/monthly_summary/'),
  generateReceipt: (id) => apiClient.get(`/sales/${id}/receipt/`, { responseType: 'blob' }),
  generateInvoice: (id) => apiClient.get(`/sales/${id}/invoice/`, { responseType: 'blob' }),
};

const restockAPI: RestockAPI = {
  create: (data) => apiClient.post('/restocks/', data),
  list: (params) => apiClient.get('/restocks/', { params }),
  getById: (id) => apiClient.get(`/restocks/${id}/`),
  update: (id, data) => apiClient.patch(`/restocks/${id}/`, data),
  delete: (id) => apiClient.delete(`/restocks/${id}/`),
  analytics: () => apiClient.get('/restocks/analytics/'),
};

const analyticsAPI: AnalyticsAPI = {
  getDashboardAnalytics: (days = 30) => apiClient.get(`/analytics/dashboard/?days=${days}`),
  getSalesAnalytics: (days = 30) => apiClient.get(`/analytics/sales/?days=${days}`),
};

const discountAPI = {
  list: () => apiClient.get('/discounts/'),
  available: (params: { customer_id?: string; subtotal?: number; medication_ids?: string[] }) =>
    apiClient.get('/discounts/available/', { params }),
  create: (data: Record<string, unknown>) => apiClient.post('/discounts/', data),
  update: (id: string, data: Record<string, unknown>) => apiClient.put(`/discounts/${id}/`, data),
  delete: (id: string) => apiClient.delete(`/discounts/${id}/`),
};

const promotionAPI = {
  list: () => apiClient.get('/promotions/'),
  create: (data: Record<string, unknown>) => apiClient.post('/promotions/', data),
  update: (id: string, data: Record<string, unknown>) => apiClient.put(`/promotions/${id}/`, data),
  delete: (id: string) => apiClient.delete(`/promotions/${id}/`),
};

const auditAPI = {
  list: (params?: Record<string, string>) => apiClient.get('/audit-trail/', { params }),
};

const stockMovementAPI = {
  list: (params?: Record<string, string>) => apiClient.get('/stock-movements/', { params }),
};

const userAPI = {
  list: (params?: Record<string, string>) => apiClient.get('/users/', { params }),
  setActive: (id: string, is_active: boolean) =>
    apiClient.patch(`/users/${id}/`, { is_active }),
  update: (
    id: string,
    data: {
      email?: string;
      full_name?: string;
      phone?: string;
      role?: 'staff' | 'pharmacist' | 'admin';
      is_active?: boolean;
      password?: string;
      branch_ids?: string[];
    }
  ) => apiClient.patch(`/users/${id}/`, data),
  delete: (id: string) => apiClient.delete(`/users/${id}/`),
  register: (data: {
    username: string;
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    role?: 'staff' | 'pharmacist';
    branch_ids?: string[];
  }) => apiClient.post('/auth/register/', data),
  changePassword: (data: { current_password: string; new_password: string }) =>
    apiClient.post('/auth/change-password/', data),
};

const pharmacyAPI = {
  get: () => apiClient.get('/pharmacy-profile/'),
  update: (data: {
    name: string;
    phone: string;
    email?: string;
    license_no?: string;
    address?: string;
    tax_enabled?: boolean;
    tax_rate?: number | string;
    default_tax_id?: string | null;
    default_discount_id?: string | null;
  }) => apiClient.put('/pharmacy-profile/', data),
  patch: (data: {
    name?: string;
    phone?: string;
    email?: string;
    license_no?: string;
    address?: string;
    tax_enabled?: boolean;
    tax_rate?: number | string;
    default_tax_id?: string | null;
    default_discount_id?: string | null;
  }) => apiClient.patch('/pharmacy-profile/', data),
};

const taxRateAPI = {
  list: () => apiClient.get('/tax-rates/'),
  create: (data: Record<string, unknown>) => apiClient.post('/tax-rates/', data),
  update: (id: string, data: Record<string, unknown>) =>
    apiClient.patch(`/tax-rates/${id}/`, data),
};

const discountRateAPI = {
  list: () => apiClient.get('/discount-rates/'),
  create: (data: Record<string, unknown>) => apiClient.post('/discount-rates/', data),
  update: (id: string, data: Record<string, unknown>) =>
    apiClient.patch(`/discount-rates/${id}/`, data),
};

const businessDayAPI = {
  current: () => apiClient.get('/business-days/current/'),
  list: () => apiClient.get('/business-days/'),
  open: (data?: { business_date?: string; opening_float?: number | string; open_notes?: string }) =>
    apiClient.post('/business-days/open/', data || {}),
  close: (data?: { closing_cash?: number | string; close_notes?: string }) =>
    apiClient.post('/business-days/close/', data || {}),
};

// Export a typed API object
export default {
  medication: medicationAPI,
  customer: customerAPI,
  prescription: prescriptionAPI,
  sale: saleAPI,
  restock: restockAPI,
  analytics: analyticsAPI,
  discount: discountAPI,
  promotion: promotionAPI,
  audit: auditAPI,
  stockMovement: stockMovementAPI,
  users: userAPI,
  businessDay: businessDayAPI,
  pharmacy: pharmacyAPI,
  taxRate: taxRateAPI,
  discountRate: discountRateAPI,
  branch: {
    list: () => apiClient.get('/branches/'),
    create: (data: Record<string, unknown>) => apiClient.post('/branches/', data),
    update: (id: string, data: Record<string, unknown>) =>
      apiClient.patch(`/branches/${id}/`, data),
  },
};