import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "https://home-fixr-updated-j2z4.vercel.app/api";

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add authorization token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("hf_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle authentication issues and global errors
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      // Clean up token and trigger redirect on unauthorized response
      if (error.response.status === 401) {
        localStorage.removeItem("hf_token");
        // Direct route redirect if needed or simple window reload / redirect
        if (!window.location.pathname.startsWith("/auth") && !window.location.pathname.startsWith("/admin/login") && window.location.pathname !== "/") {
          window.location.href = "/auth?mode=login";
        }
      }
      return Promise.reject(new Error(error.response.data?.error || "An error occurred"));
    }
    return Promise.reject(new Error(error.message || "Network error"));
  }
);
