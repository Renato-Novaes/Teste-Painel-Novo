import axios from 'axios';

// Detect if running inside Capacitor (Android/iOS)
const isNative = typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();

function getBaseURL() {
  if (!isNative) return ''; // Web/Electron: same-origin
  // Mobile: read saved server URL
  const saved = localStorage.getItem('pallet_server_url');
  return saved || '';
}

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

// Allow changing base URL at runtime (from settings)
export function setServerUrl(url) {
  const clean = url.replace(/\/+$/, '');
  localStorage.setItem('pallet_server_url', clean);
  api.defaults.baseURL = clean;
}

export function getServerUrl() {
  return localStorage.getItem('pallet_server_url') || '';
}

export function needsServerConfig() {
  return isNative && !localStorage.getItem('pallet_server_url');
}

export { isNative };

// Attach token on every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('pallet_token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('pallet_token');
      delete api.defaults.headers.common['Authorization'];
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
