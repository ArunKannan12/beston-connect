import { createContext, useContext, useState, useEffect } from "react";
import axiosInstance from "../api/axiosinstance";
import { useMergeGuestCartMutation } from "./cartSlice";
import { syncGuestcart } from "../utils/syncGuestCart";
import { toast } from "react-toastify";
import { getCookie } from "../utils/getCookie";
import { useNavigate } from "react-router-dom";

// Create context
export const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  loading: true,
  login: () => {},
  logout: () => {},
  setUser: () => {},
  hasRole: () => false,
  isAdmin: () => false,
  isPromoter:()=>false,
  isWarehouseStaff: () => false,
});

// CSRF setup
const ensureCsrfCookie = async () => {
  try {
    await axiosInstance.get("auth/csrf/");
  } catch (err) {
    console.error("CSRF cookie setup failed:", err);
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mergeGuestCart] = useMergeGuestCartMutation();


  // ✅ Fetch logged-in user
  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("auth/profile/");
      setUser(res.data);
          
      setIsAuthenticated(true);
      return res.data;
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // ✅ Initial load: setup CSRF + fetch user
  useEffect(() => {
    ensureCsrfCookie().then(fetchProfile);
  }, []);

  // ✅ Login (email/password or OAuth)
  const login = async (credentials = null, tokenData = null, redirectFrom = "/") => {
    setLoading(true);
    try {
      await ensureCsrfCookie();

      if (credentials) {
        await axiosInstance.post("auth/jwt/create/", credentials);
      }

      const user = await fetchProfile(); // fetch fresh profile from backend

      if (!user) {
        // Login failed, no user returned
        setUser(null);
        setIsAuthenticated(false);
        return { success: false };
      }

      if (!user.is_active) {
        // User is inactive (blocked)
        toast.info("Your account is inactive. Contact support.");
        setUser(null);
        setIsAuthenticated(false);
        return { success: false, reason: "inactive" };
      }

      if (!user.is_verified) {
        // User is unverified
        toast.info("Your account isn't verified yet. Please check your email.");
        setUser(user);
        setIsAuthenticated(false);
        return { success: false, reason: "unverified", email: user.email };
      }

      // ✅ User is active and verified
      setUser(user);
      setIsAuthenticated(true);

      // Merge guest cart if any
      const buyNowMinimal = JSON.parse(sessionStorage.getItem("buyNowMinimal") || "null");
      if (buyNowMinimal) {
        const itemsToMerge = Array.isArray(buyNowMinimal) ? buyNowMinimal : [buyNowMinimal];
        await syncGuestcart(mergeGuestCart, itemsToMerge);
      }

      const guestCart = JSON.parse(localStorage.getItem("cart") || "[]");
      if (guestCart.length > 0) {
        await syncGuestcart(mergeGuestCart, guestCart);
      }

      let redirectPath = redirectFrom || '/';
      if (user.role === "admin") {
        redirectPath = "/admin/dashboard";
      } else if (user.roles?.includes("promoter") && user.active_role === 'promoter') {
        redirectPath=user.promoter_type === 'paid'
        ? '/promoter/dashboard/paid'
        : '/promoter/dashboard/unpaid'
      }else if(user.role === 'customer'){
        redirectPath='/'
      }
      return { success: true, from: redirectPath ,user};
    } catch (err) {
      console.error("Login failed", err);
      toast.error("Login failed. Please check your credentials.");
      setUser(null);
      setIsAuthenticated(false);
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };


  // ✅ Logout
  const logout = async () => {
    setLoading(true);
    try {
      await axiosInstance.post("auth/jwt/logout/");
    } catch (error) {
      console.warn("Logout error", error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
    }
  };

    // ✅ Role-based access
    const hasRole = (role) => {
      if (!user) return false;
      if (role === 'promoter'){
        return user.roles?.included('promoter') && user.active_role === 'promoter';
      }
      return user.role === role || user.active_role === role;
    };

    const isAdmin = () =>
      hasRole("admin") || user?.is_staff;

    const isPromoter = () =>
        user?.roles?.includes('promoter') && user.active_role === 'promoter';

    const isCustomer = () => user?.active_role === "customer";
    

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        login,
        logout,
        setUser,
        hasRole,
        isAdmin,
        isPromoter,
    
      }}
    >
      {children}
    </AuthContext.Provider>

  );
};

export const useAuth = () => useContext(AuthContext);