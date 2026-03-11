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
  create: (data: any) => Promise<any>;
  list: () => Promise<any>;
  getById: (id: string) => Promise<any>;
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
  list: () => apiClient.get('/restocks/'),
  getById: (id) => apiClient.get(`/restocks/${id}/`),
};

const analyticsAPI: AnalyticsAPI = {
  getDashboardAnalytics: (days = 30) => apiClient.get(`/analytics/dashboard/?days=${days}`),
  getSalesAnalytics: (days = 30) => apiClient.get(`/analytics/sales/?days=${days}`),
};

// Export a typed API object
export default {
  medication: medicationAPI,
  customer: customerAPI,
  prescription: prescriptionAPI,
  sale: saleAPI,
  restock: restockAPI,
  analytics: analyticsAPI,
};