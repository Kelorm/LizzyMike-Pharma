import React from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { Permission } from '../utils/permissions';

interface ConditionalRenderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface PermissionBasedRenderProps extends ConditionalRenderProps {
  permission: Permission;
}

interface RoleBasedRenderProps extends ConditionalRenderProps {
  role: 'admin' | 'pharmacist' | 'staff';
}

interface FeatureBasedRenderProps extends ConditionalRenderProps {
  feature: string;
}

// Render based on specific permission
export const IfHasPermission: React.FC<PermissionBasedRenderProps> = ({ 
  children, 
  permission, 
  fallback = null 
}) => {
  const { hasPermission } = usePermissions();
  
  if (hasPermission(permission)) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
};

// Render based on user role
export const IfHasRole: React.FC<RoleBasedRenderProps> = ({ 
  children, 
  role, 
  fallback = null 
}) => {
  const { userRole } = usePermissions();
  
  if (userRole === role) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
};

// Render based on feature access
export const IfCanAccessFeature: React.FC<FeatureBasedRenderProps> = ({ 
  children, 
  feature, 
  fallback = null 
}) => {
  const { canAccessFeature } = usePermissions();
  
  if (canAccessFeature(feature)) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
};

// Render for admin only
export const AdminOnly: React.FC<ConditionalRenderProps> = ({ children, fallback = null }) => {
  const { isAdmin } = usePermissions();
  
  if (isAdmin) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
};

// Render for pharmacist and admin
export const PharmacistAndAdmin: React.FC<ConditionalRenderProps> = ({ children, fallback = null }) => {
  const { isAdmin, isPharmacist } = usePermissions();
  
  if (isAdmin || isPharmacist) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
};

// Render for staff only
export const StaffOnly: React.FC<ConditionalRenderProps> = ({ children, fallback = null }) => {
  const { isStaff } = usePermissions();
  
  if (isStaff) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
};

// Higher-order component for permission-based rendering
export const withPermission = <P extends object>(
  Component: React.ComponentType<P>,
  permission: Permission,
  FallbackComponent?: React.ComponentType<P>
) => {
  return (props: P) => {
    const { hasPermission } = usePermissions();
    
    if (hasPermission(permission)) {
      return <Component {...props} />;
    }
    
    return FallbackComponent ? <FallbackComponent {...props} /> : null;
  };
};

// Higher-order component for role-based rendering
export const withRole = <P extends object>(
  Component: React.ComponentType<P>,
  role: 'admin' | 'pharmacist' | 'staff',
  FallbackComponent?: React.ComponentType<P>
) => {
  return (props: P) => {
    const { userRole } = usePermissions();
    
    if (userRole === role) {
      return <Component {...props} />;
    }
    
    return FallbackComponent ? <FallbackComponent {...props} /> : null;
  };
}; 