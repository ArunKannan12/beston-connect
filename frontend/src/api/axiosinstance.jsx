import axios from "axios";
import { getCsrfToken } from "../utils/csrf";

// const BASE_URL = "https://ecommerce-ml5v.onrender.com/api";
const BASE_URL = "http://localhost:8000/api"

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// ⏳ Request interceptor
axiosInstance.interceptors.request.use(
  async (config) => {
    let csrfToken = getCsrfToken();

    if (!csrfToken) {
      try {
        // ✅ raw axios to avoid recursion
        await axios.get(`${BASE_URL}/auth/csrf/`, { withCredentials: true });
        csrfToken = getCsrfToken();
      } catch (err) {
        console.error("❌ Failed to fetch CSRF token:", err);
      }
    }

    if (csrfToken) {
      config.headers["X-CSRFToken"] = csrfToken;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// 🔄 Response interceptor (auto-refresh JWT)
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip retry for signup/login endpoints
    const skipRetry = [
      "/auth/jwt/refresh/",
      "/auth/users/",        // signup
      "/auth/jwt/create/",   // login
    ].some((url) => originalRequest.url.includes(url));

    if (error.response?.status === 401 && !originalRequest._retry && !skipRetry) {
      originalRequest._retry = true;

      try {
        await axios.post(`${BASE_URL}/auth/jwt/refresh/`, {}, { withCredentials: true });
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        console.error("🔒 Token refresh failed:", refreshError);
        // optionally clear auth state here
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);


export default axiosInstance;
