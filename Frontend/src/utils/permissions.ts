// Permission system for pharmacy management system

export type UserRole = 'admin' | 'pharmacist' | 'staff';

export type Permission = 
  // Dashboard & Analytics
  | 'view_dashboard'
  | 'view_analytics'
  | 'view_reports'
  
  // Inventory Management
  | 'view_inventory'
  | 'add_medication'
  | 'edit_medication'
  | 'delete_medication'
  | 'manage_stock'
  | 'view_low_stock'
  | 'manage_suppliers'
  
  // Sales Management
  | 'view_sales'
  | 'create_sale'
  | 'edit_sale'
  | 'delete_sale'
  | 'view_sales_transactions'
  | 'print_receipts'
  | 'export_sales_data'
  
  // Customer Management
  | 'view_customers'
  | 'add_customer'
  | 'edit_customer'
  | 'delete_customer'
  | 'view_customer_history'
  
  // Prescription Management
  | 'view_prescriptions'
  | 'create_prescription'
  | 'edit_prescription'
  | 'delete_prescription'
  | 'dispense_prescription'
  | 'update_prescription_status'
  
  // Restock Management
  | 'view_restock'
  | 'create_restock'
  | 'edit_restock'
  | 'delete_restock'
  | 'approve_restock'
  
  // User Management
  | 'view_users'
  | 'add_user'
  | 'edit_user'
  | 'delete_user'
  | 'manage_roles'
  
  // System Settings
  | 'view_settings'
  | 'edit_settings'
  | 'system_configuration'
  
  // Notifications
  | 'view_notifications'
  | 'manage_notifications'
  
  // Reports & Analytics
  | 'generate_reports'
  | 'view_financial_reports'
  | 'view_inventory_reports'
  | 'export_data';

// Permission matrix - defines what each role can do
export const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    // Full access to everything
    'view_dashboard',
    'view_analytics',
    'view_reports',
    'view_inventory',
    'add_medication',
    'edit_medication',
    'delete_medication',
    'manage_stock',
    'view_low_stock',
    'manage_suppliers',
    'view_sales',
    'create_sale',
    'edit_sale',
    'delete_sale',
    'view_sales_transactions',
    'print_receipts',
    'export_sales_data',
    'view_customers',
    'add_customer',
    'edit_customer',
    'delete_customer',
    'view_customer_history',
    'view_prescriptions',
    'create_prescription',
    'edit_prescription',
    'delete_prescription',
    'dispense_prescription',
    'update_prescription_status',
    'view_restock',
    'create_restock',
    'edit_restock',
    'delete_restock',
    'approve_restock',
    'view_users',
    'add_user',
    'edit_user',
    'delete_user',
    'manage_roles',
    'view_settings',
    'edit_settings',
    'system_configuration',
    'view_notifications',
    'manage_notifications',
    'generate_reports',
    'view_financial_reports',
    'view_inventory_reports',
    'export_data'
  ],
  
  pharmacist: [
    // Can manage most operations but not user management
    'view_dashboard',
    'view_analytics',
    'view_reports',
    'view_inventory',
    'add_medication',
    'edit_medication',
    'manage_stock',
    'view_low_stock',
    'view_sales',
    'create_sale',
    'edit_sale',
    'view_sales_transactions',
    'print_receipts',
    'export_sales_data',
    'view_customers',
    'add_customer',
    'edit_customer',
    'view_customer_history',
    'view_prescriptions',
    'create_prescription',
    'edit_prescription',
    'dispense_prescription',
    'update_prescription_status',
    'view_restock',
    'create_restock',
    'edit_restock',
    'view_settings',
    'view_notifications',
    'generate_reports',
    'view_financial_reports',
    'view_inventory_reports'
  ],
  
  staff: [
    // Limited access - basic operations only
    'view_dashboard',
    'view_inventory',
    'view_low_stock',
    'view_sales',
    'create_sale',
    'view_sales_transactions',
    'print_receipts',
    'view_customers',
    'add_customer',
    'edit_customer',
    'view_prescriptions',
    'update_prescription_status',
    'view_restock',
    'view_notifications'
  ]
};

// Helper functions for permission checking
export const hasPermission = (userRole: UserRole | undefined, permission: Permission): boolean => {
  if (!userRole) return false;
  return rolePermissions[userRole]?.includes(permission) || false;
};

export const hasAnyPermission = (userRole: UserRole | undefined, permissions: Permission[]): boolean => {
  if (!userRole) return false;
  return permissions.some(permission => hasPermission(userRole, permission));
};

export const hasAllPermissions = (userRole: UserRole | undefined, permissions: Permission[]): boolean => {
  if (!userRole) return false;
  return permissions.every(permission => hasPermission(userRole, permission));
};

// Feature access control
export const canAccessFeature = (userRole: UserRole | undefined, feature: string): boolean => {
  const featurePermissions: Record<string, Permission[]> = {
    dashboard: ['view_dashboard'],
    analytics: ['view_analytics'],
    inventory: ['view_inventory'],
    sales: ['view_sales'],
    customers: ['view_customers'],
    prescriptions: ['view_prescriptions'],
    restock: ['view_restock'],
    settings: ['view_settings'],
    users: ['view_users'],
    reports: ['view_reports']
  };
  
  const requiredPermissions = featurePermissions[feature] || [];
  return hasAnyPermission(userRole, requiredPermissions);
};

// Navigation permissions
export const getNavPermissions = (userRole: UserRole | undefined) => {
  return {
    dashboard: canAccessFeature(userRole, 'dashboard'),
    analytics: canAccessFeature(userRole, 'analytics'),
    inventory: canAccessFeature(userRole, 'inventory'),
    sales: canAccessFeature(userRole, 'sales'),
    customers: canAccessFeature(userRole, 'customers'),
    prescriptions: canAccessFeature(userRole, 'prescriptions'),
    restock: canAccessFeature(userRole, 'restock'),
    settings: canAccessFeature(userRole, 'settings'),
    users: canAccessFeature(userRole, 'users'),
    reports: canAccessFeature(userRole, 'reports')
  };
}; 