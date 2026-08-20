import axios from 'axios';

// Create configured Axios instance
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, //  reasonable timeout for API requests
});

// Request Interceptor: Attach JWT Token to every outgoing request if available
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('transact_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Global error interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // If receiving 401 Unauthorized from protected routes (excluding login/register), broadcast session expired event
    if (error.response && error.response.status === 401) {
      const isAuthRoute = error.config.url?.includes('/auth/login') || error.config.url?.includes('/auth/register');
      if (!isAuthRoute) {
        localStorage.removeItem('transact_token');
        localStorage.removeItem('transact_user');
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
