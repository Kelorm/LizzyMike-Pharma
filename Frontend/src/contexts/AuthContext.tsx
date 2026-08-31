import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient, { ensureCsrfCookie } from '../utils/axios';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'pharmacist' | 'staff';
  full_name: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const mapUser = (data: {
  id: string;
  username: string;
  email: string;
  role: User['role'];
  full_name?: string;
}): User => ({
  id: data.id,
  username: data.username,
  email: data.email,
  role: data.role,
  full_name: data.full_name || '',
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearAuthState = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    delete apiClient.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const fetchProfile = useCallback(async (): Promise<User | null> => {
    try {
      const response = await apiClient.get('/profile/');
      const mapped = mapUser(response.data);
      setUser(mapped);
      return mapped;
    } catch {
      clearAuthState();
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureCsrfCookie();
      try {
        const response = await apiClient.get('/profile/');
        if (!cancelled) {
          setUser(mapUser(response.data));
        }
      } catch {
        if (!cancelled) {
          clearAuthState();
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (): Promise<User> => {
    setIsLoading(true);
    try {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      const profile = await fetchProfile();
      if (!profile) {
        throw new Error('Could not load profile after login');
      }
      return profile;
    } finally {
      setIsLoading(false);
    }
  }, [fetchProfile]);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout/', {});
    } catch {
      // ignore
    }
    clearAuthState();
    window.location.href = '/login';
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useRequireAuth = () => {
  const { isAuthenticated, isLoading } = useAuth();
  return { isAuthenticated, isLoading };
};
