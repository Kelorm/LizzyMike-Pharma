import { ReactNode } from "react";

export interface User {
  id: string;  // Changed to string for UUID
  username: string;
  email: string;
  full_name: string; // Add this line
  role: 'admin' | 'pharmacist' | 'staff'; // Added staff role
  first_name: string;
  last_name: string;
  phone?: string; // Added phone
}

export interface Medication {
  id: string; // Changed to string
  name: string;
  category: string;
  stock: number;
  min_stock: number;
  price: number;
  expiry: string;
  supplier: string;
  batch_no: string;
  cost: number;
  // ... other fields
}

export interface Customer {
  id: string;  // Changed to string for UUID
  name: string;
  phone: string;
  email: string;
  address: string;
  dob: string;
  insurance: string;
  allergies: string;
}

export interface Prescription {
  id: string;
  custom_id?: string;
  
  // Patient Information
  customer: string;  // Customer ID (UUID)
  patient_name: string;
  patient_age?: number;
  patient_weight?: number;
  
  // Medication Information
  medication: string;  // Medication ID (UUID)
  medication_name: string;
  medication_category?: string;
  quantity_prescribed: number;
  quantity_dispensed: number;
  
  // Dosage Information
  dosage: string;
  frequency: string;
  duration: string;
  administration_route: string;
  
  // Prescription Details
  status: 'pending' | 'approved' | 'preparing' | 'ready' | 'dispensed' | 'completed' | 'cancelled' | 'expired';
  status_display?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  priority_display?: string;
  
  // Doctor Information
  prescribed_by: string;
  doctor_license?: string;
  doctor_phone?: string;
  
  // Dates
  prescribed_date: string;
  expiry_date: string;
  dispensed_date?: string;
  
  // Refill Information
  refills_allowed: number;
  refills_used: number;
  refills_remaining?: number;
  
  // Digital Signature & Verification
  digital_signature?: string;
  signed_at?: string;
  verified_by?: string;
  
  // Additional Information
  diagnosis?: string;
  allergies?: string;
  special_instructions?: string;
  notes?: string;
  
  // Insurance Information
  insurance_provider?: string;
  insurance_number?: string;
  copay_amount?: number;
  
  // System Fields
  created_at: string;
  updated_at: string;
  created_by?: string;
  
  // Computed Properties
  is_expired?: boolean;
  can_refill?: boolean;
  days_until_expiry?: number;
  
  // Related Data
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
}

export interface Discount {
  id: string;
  name: string;
  type: 'percentage' | 'fixed' | 'buy_x_get_y';
  value: number; // percentage or fixed amount
  min_purchase?: number;
  max_discount?: number;
  applicable_medications?: string[]; // medication IDs
  applicable_customers?: string[]; // customer IDs
  start_date: string;
  end_date: string;
  is_active: boolean;
  usage_limit?: number;
  current_usage: number;
}

export interface Promotion {
  id: string;
  name: string;
  description: string;
  type: 'discount' | 'free_shipping' | 'buy_x_get_y' | 'loyalty_points';
  discount_id?: string;
  conditions: {
    min_purchase?: number;
    max_discount?: number;
    applicable_medications?: string[];
    applicable_customers?: string[];
  };
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface SaleItem {
  id: string;  // Changed to string for UUID
  sale: string;  // Sale ID (UUID)
  medication: string;  // Medication ID (UUID)
  medication_name?: string;
  qty: number;  // Changed from quantity to qty to match backend
  price: number;
  cost: number;
  discount?: number; // Added discount field
  final_price?: number; // Added final price after discount
}

export interface Sale {
  id: string;  // Changed to string for UUID
  custom_id?: string;  // Short user-friendly transaction ID (e.g., SALE2501021A2B)
  customer: string;  // Customer ID (UUID)
  customer_name: string; // Added name field
  date: string;
  total: number;
  total_cost: number;
  profit: number;
  subtotal: number; // Added subtotal before discounts
  discount_total: number; // Added total discount applied
  payment_method: 'cash' | 'card' | 'mobile_money' | 'insurance' | 'insurance-copay'; // Added mobile_money
  items: SaleItem[];
  notes?: string; // Added field
  applied_discounts?: Discount[]; // Added applied discounts
  loyalty_points_earned?: number; // Added loyalty points
}

export interface ApiResponse<T> {
  results?: T[];
  count?: number;
  next?: string | null;
  previous?: string | null;
}

// Added Restock interface
export interface Restock {
  id: string;
  medication: string; // Medication ID (UUID)
  medication_name: string;
  quantity: string;
  unit_cost: string;
  total_cost: string;
  supplier: string;
  batch_number: string;
  expiry_date: string;
  notes?: string;
  date_restocked: string;
  created_at?: string;
  updated_at?: string;
}

// Added Notification interface
export interface Notification {
  id: string;
  type: 'low_stock' | 'expiry' | 'system';
  message: string;
  entity_id?: string;
  entity_type?: 'medication' | 'prescription';
  read: boolean;
  created_at: string;
}

export interface MedicationFormData {
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

export interface CustomerFormData {
  name: string;
  phone: string;
  email: string;
  address: string;
  dob: string;
  insurance: string;
  allergies: string;
}

export interface PrescriptionFormData {
  customer: string;  // Customer ID (UUID)
  medication: string;  // Medication ID (UUID)
  quantity_prescribed: number;
  dosage: string;
  frequency: string;
  duration: string;
  administration_route: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  prescribed_by: string;
  doctor_license?: string;
  doctor_phone?: string;
  prescribed_date: string;
  expiry_date: string;
  refills_allowed: number;
  diagnosis?: string;
  allergies?: string;
  special_instructions?: string;
  notes?: string;
  insurance_provider?: string;
  insurance_number?: string;
  copay_amount?: number;
  patient_age?: number;
  patient_weight?: number;
}

export interface PrescriptionUpdateData {
  status?: 'pending' | 'approved' | 'preparing' | 'ready' | 'dispensed' | 'completed' | 'cancelled' | 'expired';
  quantity_dispensed?: number;
  dispensed_date?: string;
  verified_by?: string;
  digital_signature?: string;
  signed_at?: string;
  notes?: string;
  refills_used?: number;
}

export interface PrescriptionStats {
  total_prescriptions: number;
  pending_prescriptions: number;
  ready_prescriptions: number;
  expiring_soon: number;
  urgent_prescriptions: number;
  weekly_new: number;
  status_breakdown: Record<string, number>;
  priority_breakdown: Record<string, number>;
}

export interface SaleFormData {
  customer: string;  // Customer ID (UUID)
  date: string;
  payment_method: 'cash' | 'card' | 'mobile_money' | 'insurance' | 'insurance-copay';
  items: {
    medication: string;  // Medication ID (UUID)
    quantity: number;
    price: number;
    cost: number;
  }[];
  notes?: string;
}

export interface RestockFormData {
  medication: string; // Medication ID (UUID)
  supplier: string;
  quantity: number;
  batch_number: string;
  expiry: string;
  unit_cost: number;
}

export interface DashboardStats {
  lowStockCount: number;
  pendingPrescriptions: number;
  totalStockValue: number;
  todaysRevenue: number;
  notificationCount: number;
  expiringMedications: number;
  totalCustomers: number;
  totalMedications: number;
  totalProfit: number;
  profitMargin: number;
  monthlyRevenue?: number; // Added
  averageSaleValue?: number; // Added
}

export interface ApiError {
  message: string;
  field?: string;
  code?: string;
  details?: any; // Added for additional error info
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface TokenResponse {
  access: string;
  refresh: string;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
  low_stock?: boolean; // Added filter
  expiring_soon?: boolean; // Added filter
}

export interface LowStockAlert {
  id: string;
  name: string;
  current_stock: number;
  min_stock: number;
}

export interface ExpiringMedication {
  id: string;
  name: string;
  expiry: string;
  days_until_expiry: number;
}

export interface SalesSummary {
  date: string;
  total_amount: number;
  total_transactions: number;
  total_profit: number;
  profit_margin: number; // Added
}

export interface PrescriptionStatusUpdate {
  id: string;
  status: 'Preparing' | 'Ready' | 'Dispensed';
}

// Added Analytics interfaces
export interface SalesAnalytics {
  daily: SalesSummary;
  monthly: SalesSummary;
  top_medications: Array<{
    medication_id: string;
    name: string;
    total_sold: number;
  }>;
}

export interface HealthCheck {
  status: 'ok' | 'down';
  services: {
    database: boolean;
    cache: boolean;
    storage: boolean;
  };
}

export interface AuditFilter {
  userId?: string;
  action?: string;
  entity?: string;
  entityId?: string; // Add this line
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

// Enhanced Analytics interfaces
export interface DashboardAnalytics {
  today_stats: {
    total_revenue: number;
    total_sales: number;
    total_profit: number;
    avg_sale_value: number;
  };
  month_stats: {
    total_revenue: number;
    total_sales: number;
    total_profit: number;
    avg_sale_value: number;
  };
  top_products_by_quantity: Array<{
    medication__name: string;
    medication__id: string;
    medication__category: string;
    total_sold: number;
    total_revenue: number;
    total_profit: number;
    avg_price: number;
  }>;
  top_products_by_revenue: Array<{
    medication__name: string;
    medication__id: string;
    medication__category: string;
    total_sold: number;
    total_revenue: number;
    total_profit: number;
    avg_price: number;
  }>;
  daily_trend: Array<{
    day: string;
    total_revenue: number;
    total_sales: number;
    total_profit: number;
  }>;
  category_performance: Array<{
    medication__category: string;
    total_sold: number;
    total_revenue: number;
    total_profit: number;
  }>;
  date_range: {
    start_date: string;
    end_date: string;
    days: number;
  };
}