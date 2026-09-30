import axios from 'axios';

// Base API URL configuration:
// In development, Vite proxies '/api' to 'http://localhost:5000'.
// On Vercel, relative '/api' calls execute Vercel serverless functions on the same domain.
// If a custom separate backend is configured, VITE_API_URL can be set in environment variables.
const RAW_API_URL = import.meta.env.VITE_API_URL || '';
export const API_BASE_URL = RAW_API_URL.replace(/\/$/, '');

// Socket Server URL configuration:
// Defaults to VITE_SOCKET_URL if provided.
// In local dev, falls back to http://localhost:5000.
// In production on web, uses the current origin.
export const SOCKET_SERVER_URL = 
  import.meta.env.VITE_SOCKET_URL ||
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : (typeof window !== 'undefined' ? window.location.origin : ''));

// Create centralized Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach token automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401s and format clear errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // 401 Unauthorized (Token expired or revoked)
      if (error.response.status === 401) {
        const isAuthPage = 
          typeof window !== 'undefined' && 
          (window.location.pathname === '/login' || window.location.pathname === '/register');
        
        if (!isAuthPage) {
          console.warn('[API] Session expired or unauthorized. Logging out.');
          localStorage.removeItem('token');
          localStorage.removeItem('id');
          localStorage.removeItem('username');
          // Dispatch a custom event so React contexts can react without full page reload
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('chatera:unauthorized'));
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Format user-friendly error messages from API responses
 */
export function getErrorMessage(error, defaultMsg = 'An unexpected error occurred. Please try again.') {
  if (!error) return defaultMsg;
  if (error.response?.data?.msg) return error.response.data.msg;
  if (error.response?.data?.error) return error.response.data.error;
  if (error.message === 'Network Error') return 'Unable to reach the server. Please check your internet connection.';
  if (error.message) return error.message;
  return defaultMsg;
}

export default api;
