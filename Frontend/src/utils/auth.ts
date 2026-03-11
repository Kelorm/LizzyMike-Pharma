import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

// Verify JWT token structure
export const isValidToken = (token: string): boolean => {
  try {
    const decoded: any = jwtDecode(token as string);
    return decoded && typeof decoded === 'object' && 'user_id' in decoded;
  } catch (e) {
    return false;
  }
};

// Auto-logout after inactivity
export const setupInactivityTimer = (logout: () => void) => {
  let timer: NodeJS.Timeout;
  
  const resetTimer = () => {
    clearTimeout(timer);
    timer = setTimeout(logout, 15 * 60 * 1000); // 15 minutes
  };

  window.addEventListener('load', resetTimer);
  window.addEventListener('mousemove', resetTimer);
  window.addEventListener('keypress', resetTimer);
  
  return () => {
    clearTimeout(timer);
    window.removeEventListener('load', resetTimer);
    window.removeEventListener('mousemove', resetTimer);
    window.removeEventListener('keypress', resetTimer);
  };
};

export const refreshToken = async (): Promise<boolean> => {
  try {
    const refresh = localStorage.getItem('refresh') || sessionStorage.getItem('refresh');
    
    if (!refresh) {
      console.warn('No refresh token found');
      return false;
    }

    if (!isValidToken(refresh)) {
      console.error('Invalid refresh token format');
      clearTokens();
      return false;
    }

    const res = await axios.post('http://127.0.0.1:8000/api/token/refresh/', 
      { refresh },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000, // 10 second timeout
      }
    );

    const { access } = res.data;
    
    if (!access || !isValidToken(access)) {
      console.error('Invalid access token received');
      return false;
    }

    // Store new access token in the same storage type as refresh token
    const storage = localStorage.getItem('refresh') ? localStorage : sessionStorage;
    storage.setItem('access', access);
    
    // Update axios default headers
    axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
    
    console.log('Token refreshed successfully');
    return true;
    
  } catch (err: any) {
    console.error('Token refresh failed:', err);
    
    // Handle specific error cases
    if (err.response?.status === 401) {
      console.log('Refresh token expired or invalid');
      clearTokens();
    } else if (err.code === 'ECONNABORTED') {
      console.log('Token refresh timeout');
    } else if (err.response?.status >= 500) {
      console.log('Server error during token refresh');
    }
    
    return false;
  }
};

// Helper function to clear all tokens
export const clearTokens = (): void => {
  localStorage.removeItem('access');
  localStorage.removeItem('refresh');
  sessionStorage.removeItem('access');
  sessionStorage.removeItem('refresh');
  delete axios.defaults.headers.common['Authorization'];
};

// Helper function to check if user is authenticated
export const isAuthenticated = (): boolean => {
  const accessToken = localStorage.getItem('access') || sessionStorage.getItem('access');
  return !!accessToken;
};

// Helper function to get current access token
export const getAccessToken = (): string | null => {
  return localStorage.getItem('access') || sessionStorage.getItem('access');
};

// Helper function to logout user
export const logout = (): void => {
  clearTokens();
  // Optionally redirect to login page
  window.location.href = '/login';
};