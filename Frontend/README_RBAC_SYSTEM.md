# Role-Based Access Control (RBAC) System

## Overview

The pharmacy management system now implements a comprehensive Role-Based Access Control (RBAC) system that restricts user access based on their assigned roles and permissions.

## 🎯 **User Roles**

### **Admin** 👑
- **Full system access**
- Can manage all features and settings
- User management capabilities
- System configuration access
- All analytics and reports

### **Pharmacist** 💊
- **Professional operations**
- Can manage prescriptions and inventory
- Customer care and sales operations
- Cannot manage users or system settings
- Access to professional analytics

### **Staff** 👥
- **Basic operations**
- Sales and customer management
- Limited inventory viewing
- Basic prescription status updates
- No administrative functions

## 🔐 **Permission System**

### **Core Permissions**

#### **Dashboard & Analytics**
- `view_dashboard` - Access to main dashboard
- `view_analytics` - View analytics and reports
- `view_reports` - Access to reporting features

#### **Inventory Management**
- `view_inventory` - View medication inventory
- `add_medication` - Add new medications
- `edit_medication` - Edit medication details
- `delete_medication` - Delete medications
- `manage_stock` - Update stock levels
- `view_low_stock` - View low stock alerts
- `manage_suppliers` - Manage supplier information

#### **Sales Management**
- `view_sales` - View sales data
- `create_sale` - Create new sales
- `edit_sale` - Edit existing sales
- `delete_sale` - Delete sales records
- `view_sales_transactions` - View transaction history
- `print_receipts` - Print sales receipts
- `export_sales_data` - Export sales data

#### **Customer Management**
- `view_customers` - View customer list
- `add_customer` - Add new customers
- `edit_customer` - Edit customer details
- `delete_customer` - Delete customers
- `view_customer_history` - View customer history

#### **Prescription Management**
- `view_prescriptions` - View prescriptions
- `create_prescription` - Create new prescriptions
- `edit_prescription` - Edit prescriptions
- `delete_prescription` - Delete prescriptions
- `dispense_prescription` - Dispense medications
- `update_prescription_status` - Update prescription status

#### **Restock Management**
- `view_restock` - View restock records
- `create_restock` - Create restock orders
- `edit_restock` - Edit restock details
- `delete_restock` - Delete restock records
- `approve_restock` - Approve restock orders

#### **User Management**
- `view_users` - View user list
- `add_user` - Add new users
- `edit_user` - Edit user details
- `delete_user` - Delete users
- `manage_roles` - Manage user roles

#### **System Settings**
- `view_settings` - View system settings
- `edit_settings` - Edit system settings
- `system_configuration` - Configure system

#### **Notifications**
- `view_notifications` - View notifications
- `manage_notifications` - Manage notification settings

#### **Reports & Analytics**
- `generate_reports` - Generate reports
- `view_financial_reports` - View financial reports
- `view_inventory_reports` - View inventory reports
- `export_data` - Export system data

## 🛠 **Implementation Details**

### **Permission Matrix**

```typescript
export const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    // Full access to everything
    'view_dashboard', 'view_analytics', 'view_reports',
    'view_inventory', 'add_medication', 'edit_medication', 'delete_medication',
    // ... all permissions
  ],
  
  pharmacist: [
    // Professional operations
    'view_dashboard', 'view_analytics', 'view_reports',
    'view_inventory', 'add_medication', 'edit_medication',
    // ... limited permissions
  ],
  
  staff: [
    // Basic operations
    'view_dashboard', 'view_inventory', 'view_low_stock',
    'view_sales', 'create_sale', 'view_sales_transactions',
    // ... minimal permissions
  ]
};
```

### **Helper Functions**

```typescript
// Check specific permission
const hasPermission = (userRole: UserRole, permission: Permission): boolean

// Check multiple permissions (any)
const hasAnyPermission = (userRole: UserRole, permissions: Permission[]): boolean

// Check multiple permissions (all)
const hasAllPermissions = (userRole: UserRole, permissions: Permission[]): boolean

// Check feature access
const canAccessFeature = (userRole: UserRole, feature: string): boolean
```

## 🎨 **Usage Examples**

### **Route Protection**

```typescript
// Protect route with permission
<ProtectedRoute requiredPermission="view_inventory">
  <InventoryPage />
</ProtectedRoute>

// Protect route with role
<ProtectedRoute requiredRole="admin">
  <UserManagementPage />
</ProtectedRoute>
```

### **Conditional Rendering**

```typescript
// Show/hide based on permission
<IfHasPermission permission="add_customer">
  <button>Add Customer</button>
</IfHasPermission>

// Show/hide based on role
<AdminOnly>
  <UserManagementSection />
</AdminOnly>

<PharmacistAndAdmin>
  <InventoryManagementSection />
</PharmacistAndAdmin>
```

### **Permission Hooks**

```typescript
// Use specific permission hooks
const { canAddCustomer, canEditCustomer, canDeleteCustomer } = useCustomerPermissions();
const { canViewInventory, canManageStock } = useInventoryPermissions();
const { canCreateSale, canViewTransactions } = useSalesPermissions();
```

## 🔧 **Components**

### **Core Components**

1. **`ProtectedRoute`** - Route-level protection
2. **`ConditionalRender`** - UI conditional rendering
3. **`RoleBasedDashboard`** - Role-specific dashboard
4. **`usePermissions`** - Permission checking hooks

### **Permission Hooks**

- `usePermissions()` - General permission checking
- `useInventoryPermissions()` - Inventory-specific permissions
- `useSalesPermissions()` - Sales-specific permissions
- `useCustomerPermissions()` - Customer-specific permissions
- `usePrescriptionPermissions()` - Prescription-specific permissions
- `useRestockPermissions()` - Restock-specific permissions
- `useUserManagementPermissions()` - User management permissions
- `useSettingsPermissions()` - Settings-specific permissions

## 🚀 **Getting Started**

### **1. Check User Permissions**

```typescript
import { usePermissions } from '../hooks/usePermissions';

const MyComponent = () => {
  const { hasPermission, isAdmin, isPharmacist } = usePermissions();
  
  if (hasPermission('add_customer')) {
    // Show add customer button
  }
};
```

### **2. Protect Routes**

```typescript
import ProtectedRoute from '../components/ProtectedRoute';

<Routes>
  <Route 
    path="/inventory" 
    element={
      <ProtectedRoute requiredPermission="view_inventory">
        <InventoryPage />
      </ProtectedRoute>
    } 
  />
</Routes>
```

### **3. Conditional UI**

```typescript
import { IfHasPermission, AdminOnly } from '../components/ConditionalRender';

<IfHasPermission permission="delete_customer">
  <button onClick={handleDelete}>Delete</button>
</IfHasPermission>

<AdminOnly>
  <UserManagementPanel />
</AdminOnly>
```

## 🔒 **Security Features**

### **Access Control**
- ✅ Route-level protection
- ✅ Component-level protection
- ✅ Feature-level protection
- ✅ Role-based navigation
- ✅ Permission-based UI rendering

### **User Experience**
- ✅ Clear access denied messages
- ✅ Role-specific dashboards
- ✅ Conditional feature visibility
- ✅ Intuitive permission feedback

### **Developer Experience**
- ✅ Type-safe permission checking
- ✅ Reusable permission hooks
- ✅ Easy-to-use conditional components
- ✅ Comprehensive documentation

## 📋 **Testing Permissions**

### **Test Different Roles**

1. **Admin User**: Full access to all features
2. **Pharmacist User**: Professional operations only
3. **Staff User**: Basic operations only

### **Verify Restrictions**

- Staff cannot access user management
- Pharmacist cannot access system settings
- Admin has access to everything
- Navigation items are filtered by role
- Action buttons are hidden based on permissions

## 🔄 **Adding New Permissions**

### **1. Define Permission**

```typescript
export type Permission = 
  | 'existing_permissions'
  | 'new_permission'; // Add new permission
```

### **2. Add to Role Matrix**

```typescript
export const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    // ... existing permissions
    'new_permission'
  ],
  pharmacist: [
    // ... existing permissions
    'new_permission' // If pharmacist should have it
  ],
  staff: [
    // ... existing permissions
    // Don't add if staff shouldn't have it
  ]
};
```

### **3. Use in Components**

```typescript
<IfHasPermission permission="new_permission">
  <NewFeature />
</IfHasPermission>
```

## 🎯 **Best Practices**

1. **Always check permissions** before showing sensitive features
2. **Use specific permission hooks** for better organization
3. **Provide fallback UI** for unauthorized users
4. **Test with different roles** to ensure proper restrictions
5. **Document permission requirements** for new features
6. **Use role-based components** for cleaner code

## 🚨 **Security Notes**

- Frontend permissions are for UX only
- Backend must enforce all permissions
- Never trust client-side permission checks
- Always validate on the server side
- Log permission violations for security monitoring

---

This RBAC system provides a robust, scalable, and user-friendly way to manage access control in your pharmacy management system. 