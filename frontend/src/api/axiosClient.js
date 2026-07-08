import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor — unwrap the backend wrapper
// Backend returns { status_code, message, data, timestamp }
// We extract .data so callers get the actual payload
axiosClient.interceptors.response.use(
  (response) => {
    // For 204 No Content responses, return null
    if (response.status === 204) return null;
    return response.data?.data ?? response.data;
  },
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';
    console.error('API Error:', message);
    return Promise.reject(new Error(message));
  }
);

export default axiosClient;
