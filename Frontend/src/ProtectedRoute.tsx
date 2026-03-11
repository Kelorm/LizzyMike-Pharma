// src/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

type Props = {
  children: React.ReactNode;
};

const ProtectedRoute = ({ children }: Props) => {
  // ✅ Change 'loading' to 'isLoading' to match your AuthContext
  const { user, isLoading } = useAuth();

  // ✅ Change 'loading' to 'isLoading'
  if (isLoading) return <div className="p-8 text-gray-500">Loading user info...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>; 
};

export default ProtectedRoute;