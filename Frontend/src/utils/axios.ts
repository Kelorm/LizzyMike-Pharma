import axios from 'axios';

/**
 * Resolve API base URL.
 * In development, always use the *browser* hostname with the API port so
 * JWT cookies stay same-site (localhost ↔ LAN IP mismatch breaks login).
 * Production / nginx: leave REACT_APP_API_URL empty → same-origin `/api/v1`.
 */
function resolveApiBaseUrl(): string {
  const configured = (process.env.REACT_APP_API_URL || process.env.VITE_API_URL || '')
    .trim()
    .replace(/\/$/, '');

  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const apiPort = process.env.REACT_APP_API_PORT || '8000';
    let port = apiPort;
    let protocol = window.location.protocol || 'http:';
    if (configured) {
      try {
        const raw = configured.includes('://') ? configured : `http://${configured}`;
        const u = new URL(raw);
        protocol = u.protocol;
        port = u.port || apiPort;
      } catch {
        // keep defaults
      }
    }
    return `${protocol}//${window.location.hostname}:${port}/api/v1`;
  }

  if (!configured) {
    return '/api/v1';
  }
  return configured.includes('/api/v1') ? configured : `${configured}/api/v1`;
}

export const API_BASE_URL = resolveApiBaseUrl();

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

/** Ensure CSRF cookie exists for cookie-authenticated unsafe requests. */
export async function ensureCsrfCookie(): Promise<string | null> {
  try {
    const res = await axios.get(`${API_BASE_URL}/auth/csrf/`, { withCredentials: true });
    return res.data?.csrfToken || getCookie('csrftoken');
  } catch {
    return getCookie('csrftoken');
  }
}

apiClient.interceptors.request.use(
  async (config) => {
    const method = (config.method || 'get').toLowerCase();
    const url = String(config.url || '');
    const isAuthPath =
      url.includes('/token/') ||
      url.includes('/auth/csrf/') ||
      url.includes('/auth/logout/');

    if (!['get', 'head', 'options', 'trace'].includes(method)) {
      let csrf = getCookie('csrftoken');
      if (!csrf) {
        csrf = await ensureCsrfCookie();
      }
      if (csrf) {
        config.headers['X-CSRFToken'] = csrf;
      }
    }
    // Do not attach branch header on auth bootstrap — avoids CORS preflight
    // failures before login when a stale active_branch_id is in localStorage.
    if (!isAuthPath) {
      const branchId = localStorage.getItem('active_branch_id');
      if (branchId) {
        config.headers['X-Branch-Id'] = branchId;
      }
    } else if (config.headers) {
      delete config.headers['X-Branch-Id'];
      delete config.headers['x-branch-id'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!error.response || error.code === 'ERR_NETWORK') {
      return Promise.reject(error);
    }

    if (error.response?.status !== 401 || originalRequest.url?.includes('/token/')) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      return Promise.reject(error);
    }
    originalRequest._retry = true;

    if (isRefreshing && refreshPromise) {
      try {
        await refreshPromise;
        return apiClient(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    isRefreshing = true;
    refreshPromise = refreshSession();

    try {
      await refreshPromise;
      return apiClient(originalRequest);
    } catch (refreshError) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      delete apiClient.defaults.headers.common['Authorization'];
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

async function refreshSession(): Promise<void> {
  // Refresh cookie is sent automatically; body optional for Bearer clients
  await axios.post(
    `${API_BASE_URL}/token/refresh/`,
    {},
    { withCredentials: true }
  );
}

export default apiClient;
