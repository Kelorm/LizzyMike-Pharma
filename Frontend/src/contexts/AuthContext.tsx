import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../utils/axios';

interface User {
  id: string; // Changed to string to handle UUID
  username: string;
  email: string;
  role: 'admin' | 'pharmacist' | 'staff';
  full_name: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (access: string, refresh: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);

  // Move clearAuthState outside of useCallback to prevent dependency issues
  const clearAuthState = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    delete apiClient.defaults.headers.common['Authorization'];
    console.log('[AuthContext] Auth state cleared');
  };

  // Remove fetchProfile from useCallback dependencies to prevent infinite loop
  const fetchProfile = useCallback(async (): Promise<void> => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setIsLoading(false);
      return;
    }
    
    // Prevent multiple simultaneous calls
    if (isFetchingProfile) {
      return;
    }
    
    setIsFetchingProfile(true);
    console.log('[AuthContext] fetchProfile called');
    try {
      const response = await apiClient.get('/profile/');
      const userData = {
        id: response.data.id,
        username: response.data.username,
        email: response.data.email,
        role: response.data.role,
        full_name: response.data.full_name || ''
      };
      setUser(userData);
      console.log('[AuthContext] Profile fetched:', userData);
    } catch (error) {
      console.log('[AuthContext] fetchProfile error:', error);
      clearAuthState();
    } finally {
      setIsLoading(false);
      setIsFetchingProfile(false);
    }
  }, [isFetchingProfile]); // Add isFetchingProfile to dependencies

  // Initial auth check - remove fetchProfile from dependency array
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    console.log('[AuthContext] Initial auth check, token exists:', !!token);
    if (token) {
      fetchProfile();
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Debug effect to track user state changes
  useEffect(() => {
    console.log('[AuthContext] User state changed:', user ? `User: ${user.username}` : 'No user');
  }, [user]);

  // Debug effect to track loading state changes
  useEffect(() => {
    console.log('[AuthContext] Loading state changed:', isLoading);
  }, [isLoading]);

  const login = useCallback(async (access: string, refresh: string): Promise<void> => {
    console.log('[AuthContext] Login function called');
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    console.log('[AuthContext] login: tokens set');
    // Set the token in axios defaults immediately
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${access}`;
    
    // Immediately fetch the user profile after setting tokens
    try {
      setIsLoading(true);
      console.log('[AuthContext] Fetching profile during login...');
      const response = await apiClient.get('/profile/');
      const userData = {
        id: response.data.id,
        username: response.data.username,
        email: response.data.email,
        role: response.data.role,
        full_name: response.data.full_name || ''
      };
      setUser(userData);
      console.log('[AuthContext] Profile fetched during login:', userData);
    } catch (error) {
      console.log('[AuthContext] Login profile fetch error:', error);
      clearAuthState();
      throw error; // Re-throw to let the login component handle the error
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    console.log('[AuthContext] Logout called');
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
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('User not authenticated');
    }
  }, [isAuthenticated, isLoading]);

  return { isAuthenticated, isLoading };
};