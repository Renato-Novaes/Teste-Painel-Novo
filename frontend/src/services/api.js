import axios from 'axios';
import { localApi } from './localApi';

// Detect if running inside Capacitor (Android/iOS)
const isNative = typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();

let apiInstance;

if (isNative) {
  // Native mobile: use local SQLite database — no server needed
  apiInstance = localApi;
} else {
  // Web / Electron: use axios to call backend server
  apiInstance = axios.create({
    baseURL: '',
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' }
  });

  // Attach token on every request
  apiInstance.interceptors.request.use(config => {
    const token = localStorage.getItem('pallet_token');
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    return config;
  });

  // Handle 401 globally
  apiInstance.interceptors.response.use(
    response => response,
    error => {
      if (error.response?.status === 401) {
        localStorage.removeItem('pallet_token');
        delete apiInstance.defaults.headers.common['Authorization'];
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );
}

export { isNative };
export default apiInstance;
