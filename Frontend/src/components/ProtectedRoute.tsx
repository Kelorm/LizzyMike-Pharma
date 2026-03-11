import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { hasPermission, Permission } from '../utils/permissions';
import { Shield, AlertTriangle, Lock } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
  requiredRole?: 'admin' | 'pharmacist' | 'staff';
  fallback?: React.ReactNode;
  redirectTo?: string;
}

const AccessDenied: React.FC<{ requiredPermission?: Permission; requiredRole?: string }> = ({ 
  requiredPermission, 
  requiredRole 
}) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
        <Lock className="h-6 w-6 text-red-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
      <p className="text-gray-600 mb-4">
        You don't have permission to access this page.
      </p>
      {requiredPermission && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <Shield className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-sm text-blue-800">
              Required permission: <strong>{requiredPermission}</strong>
            </span>
          </div>
        </div>
      )}
      {requiredRole && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
            <span className="text-sm text-yellow-800">
              Required role: <strong>{requiredRole}</strong>
            </span>
          </div>
        </div>
      )}
      <button
        onClick={() => window.history.back()}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Go Back
      </button>
    </div>
  </div>
);

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  requiredRole,
  fallback,
  redirectTo = '/login'
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check role requirement
  if (requiredRole && user.role !== requiredRole) {
    return <>{fallback || <AccessDenied requiredRole={requiredRole} />}</>;
  }

  // Check permission requirement
  if (requiredPermission && !hasPermission(user.role, requiredPermission)) {
    return <>{fallback || <AccessDenied requiredPermission={requiredPermission} />}</>;
  }

  // All checks passed, render children
  return <>{children}</>;
};

export default ProtectedRoute;