import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getHomePathForRole,
  hasPermission,
  Permission,
  UserRole,
} from '../utils/permissions';
import { Shield, AlertTriangle, Lock } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
  /** Exact role match (e.g. admin-only). */
  requiredRole?: UserRole;
  /** Pass if user.role is any of these (e.g. pharmacist + admin). */
  allowedRoles?: UserRole[];
  fallback?: React.ReactNode;
  redirectTo?: string;
}

const AccessDenied: React.FC<{
  requiredPermission?: Permission;
  requiredRole?: string;
  allowedRoles?: UserRole[];
}> = ({ requiredPermission, requiredRole, allowedRoles }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const home = getHomePathForRole(user?.role);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
          <Lock className="h-6 w-6 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600 mb-4">
          You don&apos;t have permission to access this page.
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
        {(requiredRole || allowedRoles) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
              <span className="text-sm text-yellow-800">
                Required role:{' '}
                <strong>
                  {requiredRole || (allowedRoles || []).join(' or ')}
                </strong>
              </span>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => navigate(home, { replace: true })}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go to Home
        </button>
      </div>
    </div>
  );
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  requiredRole,
  allowedRoles,
  fallback,
  redirectTo = '/login',
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return (
      <>
        {fallback || (
          <AccessDenied requiredRole={requiredRole} />
        )}
      </>
    );
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <>
        {fallback || <AccessDenied allowedRoles={allowedRoles} />}
      </>
    );
  }

  if (requiredPermission && !hasPermission(user.role, requiredPermission)) {
    return (
      <>
        {fallback || (
          <AccessDenied requiredPermission={requiredPermission} />
        )}
      </>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
