import React from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { AdminOnly, PharmacistAndAdmin, StaffOnly } from './ConditionalRender';
import { 
  Users, 
  Package, 
  FileText, 
  ShoppingCart, 
  Settings, 
  BarChart3,
  Shield,
  Bell,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

interface RoleBasedDashboardProps {
  children: React.ReactNode;
}

const RoleBasedDashboard: React.FC<RoleBasedDashboardProps> = ({ children }) => {
  const { isAdmin, isPharmacist, isStaff, userRole } = usePermissions();

  return (
    <div className="space-y-6">
      {/* Role-based welcome message */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : 'User'}!
            </h1>
            <p className="text-gray-600">
              {isAdmin && "You have full access to all system features and administrative controls."}
              {isPharmacist && "You can manage prescriptions, inventory, and customer care."}
              {isStaff && "You can assist with sales, customer management, and basic operations."}
            </p>
          </div>
        </div>
      </div>

      {/* Role-specific quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminOnly>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="flex items-center space-x-3">
              <Users className="h-8 w-8 text-red-600" />
              <div>
                <h3 className="font-semibold text-gray-900">User Management</h3>
                <p className="text-sm text-gray-600">Manage system users and roles</p>
              </div>
            </div>
          </div>
        </AdminOnly>

        <PharmacistAndAdmin>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center space-x-3">
              <Package className="h-8 w-8 text-green-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Inventory Control</h3>
                <p className="text-sm text-gray-600">Manage medication stock</p>
              </div>
            </div>
          </div>
        </PharmacistAndAdmin>

        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-3">
            <ShoppingCart className="h-8 w-8 text-blue-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Sales</h3>
              <p className="text-sm text-gray-600">Process transactions</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-purple-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Prescriptions</h3>
              <p className="text-sm text-gray-600">Manage prescriptions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Role-specific alerts */}
      <AdminOnly>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <span className="font-medium text-yellow-800">System Alerts</span>
          </div>
          <p className="text-sm text-yellow-700 mt-1">
            As an administrator, you have access to system-wide alerts and notifications.
          </p>
        </div>
      </AdminOnly>

      <PharmacistAndAdmin>
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-indigo-600" />
            <span className="font-medium text-indigo-800">Professional Alerts</span>
          </div>
          <p className="text-sm text-indigo-700 mt-1">
            You can manage prescription alerts and inventory notifications.
          </p>
        </div>
      </PharmacistAndAdmin>

      <StaffOnly>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-800">Sales Focus</span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            Focus on customer service and sales operations.
          </p>
        </div>
      </StaffOnly>

      {/* Main content */}
      {children}
    </div>
  );
};

export default RoleBasedDashboard; 