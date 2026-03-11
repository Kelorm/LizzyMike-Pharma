import { useAuth } from '../contexts/AuthContext';
import { 
  hasPermission, 
  hasAnyPermission, 
  hasAllPermissions, 
  canAccessFeature, 
  getNavPermissions,
  Permission 
} from '../utils/permissions';

export const usePermissions = () => {
  const { user } = useAuth();
  const userRole = user?.role;

  return {
    // Basic permission checks
    hasPermission: (permission: Permission) => hasPermission(userRole, permission),
    hasAnyPermission: (permissions: Permission[]) => hasAnyPermission(userRole, permissions),
    hasAllPermissions: (permissions: Permission[]) => hasAllPermissions(userRole, permissions),
    
    // Feature access
    canAccessFeature: (feature: string) => canAccessFeature(userRole, feature),
    
    // Navigation permissions
    navPermissions: getNavPermissions(userRole),
    
    // Role checks
    isAdmin: userRole === 'admin',
    isPharmacist: userRole === 'pharmacist',
    isStaff: userRole === 'staff',
    
    // User info
    userRole,
    user
  };
};

// Specific permission hooks for common use cases
export const useInventoryPermissions = () => {
  const { hasPermission } = usePermissions();
  
  return {
    canViewInventory: hasPermission('view_inventory'),
    canAddMedication: hasPermission('add_medication'),
    canEditMedication: hasPermission('edit_medication'),
    canDeleteMedication: hasPermission('delete_medication'),
    canManageStock: hasPermission('manage_stock'),
    canViewLowStock: hasPermission('view_low_stock'),
    canManageSuppliers: hasPermission('manage_suppliers')
  };
};

export const useSalesPermissions = () => {
  const { hasPermission } = usePermissions();
  
  return {
    canViewSales: hasPermission('view_sales'),
    canCreateSale: hasPermission('create_sale'),
    canEditSale: hasPermission('edit_sale'),
    canDeleteSale: hasPermission('delete_sale'),
    canViewTransactions: hasPermission('view_sales_transactions'),
    canPrintReceipts: hasPermission('print_receipts'),
    canExportData: hasPermission('export_sales_data')
  };
};

export const useCustomerPermissions = () => {
  const { hasPermission } = usePermissions();
  
  return {
    canViewCustomers: hasPermission('view_customers'),
    canAddCustomer: hasPermission('add_customer'),
    canEditCustomer: hasPermission('edit_customer'),
    canDeleteCustomer: hasPermission('delete_customer'),
    canViewHistory: hasPermission('view_customer_history')
  };
};

export const usePrescriptionPermissions = () => {
  const { hasPermission } = usePermissions();
  
  return {
    canViewPrescriptions: hasPermission('view_prescriptions'),
    canCreatePrescription: hasPermission('create_prescription'),
    canEditPrescription: hasPermission('edit_prescription'),
    canDeletePrescription: hasPermission('delete_prescription'),
    canDispensePrescription: hasPermission('dispense_prescription'),
    canUpdateStatus: hasPermission('update_prescription_status')
  };
};

export const useRestockPermissions = () => {
  const { hasPermission } = usePermissions();
  
  return {
    canViewRestock: hasPermission('view_restock'),
    canCreateRestock: hasPermission('create_restock'),
    canEditRestock: hasPermission('edit_restock'),
    canDeleteRestock: hasPermission('delete_restock'),
    canApproveRestock: hasPermission('approve_restock')
  };
};

export const useUserManagementPermissions = () => {
  const { hasPermission } = usePermissions();
  
  return {
    canViewUsers: hasPermission('view_users'),
    canAddUser: hasPermission('add_user'),
    canEditUser: hasPermission('edit_user'),
    canDeleteUser: hasPermission('delete_user'),
    canManageRoles: hasPermission('manage_roles')
  };
};

export const useSettingsPermissions = () => {
  const { hasPermission } = usePermissions();
  
  return {
    canViewSettings: hasPermission('view_settings'),
    canEditSettings: hasPermission('edit_settings'),
    canConfigureSystem: hasPermission('system_configuration')
  };
}; 