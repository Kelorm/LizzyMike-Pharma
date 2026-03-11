import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true,
});

// Track refresh attempts to prevent infinite loops
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('[Axios] Request with token:', config.url);
    } else {
      console.log('[Axios] Request without token:', config.url);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    console.log('[Axios] Response error:', error.response?.status, error.config?.url);
    
    // Only handle 401 errors for non-auth endpoints
    if (error.response?.status !== 401 || originalRequest.url?.includes('/token/')) {
      return Promise.reject(error);
    }
    
    // Avoid infinite loops
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    
    // If already refreshing, wait for the existing refresh
    if (isRefreshing && refreshPromise) {
      try {
        const newToken = await refreshPromise;
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }
    
    // Start refresh process
    isRefreshing = true;
    refreshPromise = refreshAccessToken();
    
    try {
      const newToken = await refreshPromise;
      originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      // Clear tokens and redirect to login
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      delete apiClient.defaults.headers.common['Authorization'];
      
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  }
);

// Separate function to handle token refresh
async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  
  const response = await axios.post(`${API_BASE_URL}/api/token/refresh/`, {
    refresh: refreshToken
  });
  
  const { access } = response.data;
  localStorage.setItem('access_token', access);
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${access}`;
  
  return access;
}

export default apiClient;