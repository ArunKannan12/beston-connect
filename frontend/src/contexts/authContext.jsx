import { createContext, useContext, useState, useEffect } from "react";
import axiosInstance from "../api/axiosinstance";
import { useMergeGuestCartMutation } from "./cartSlice";
import { syncGuestcart } from "../utils/syncGuestCart";
import { toast } from "react-toastify";
import { getCookie } from "../utils/getCookie";


// Create context
export const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  loading: true,
  login: () => {},
  fetchProfile: ()=>{},
  logout: () => {},
  setUser: () => {},
  hasRole: () => false,
  isAdmin: () => false,
  isPromoter:()=>false,
  hasPromoterRole:()=>false,
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
  
  // 📌 Capture referral code from URL on ANY page load (even manual refresh)
useEffect(() => {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");

    if (ref) {
      console.log("Captured referral code:", ref);
      localStorage.setItem("referral_code", ref);
    }
  } catch (err) {
    console.error("Referral capture error:", err);
  }
}, []);


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
  const login = async (credentials = null, tokenData = null, redirectFrom = "/", navigate = null) => {
  console.log("🔍 LOGIN DEBUG:");
  console.log("redirectFrom =", redirectFrom);
  console.log("tokenData =", tokenData);

  setLoading(true);
  try {
    await ensureCsrfCookie();

    if (credentials) {
      await axiosInstance.post("auth/jwt/create/", credentials);
    }

    const user = await fetchProfile();

    if (!user) {
      setUser(null);
      setIsAuthenticated(false);
      return { success: false };
    }

    if (!user.is_active) {
      toast.info("Your account is inactive. Contact support.");
      setUser(null);
      setIsAuthenticated(false);
      return { success: false, reason: "inactive" };
    }

    if (!user.is_verified) {
      toast.info("Your account isn't verified yet. Please check your email.");
      setUser(user);
      setIsAuthenticated(false);
      return { success: false, reason: "unverified", email: user.email };
    }

    // User OK
    setUser(user);
    setIsAuthenticated(true);

    // --- Merge Guest Cart ---
    const buyNowMinimal = JSON.parse(sessionStorage.getItem("buyNowMinimal") || "null");
    if (buyNowMinimal) {
      sessionStorage.setItem("BUY_NOW_ACTIVE", "true");
    }

    const guestCart = JSON.parse(localStorage.getItem("cart") || "[]");
    if (guestCart.length > 0) {
      await syncGuestcart(mergeGuestCart, guestCart, null, navigate);
    }

    // -------------------------------------
    // ✅ REDIRECT LOGIC WITH FULL DEBUGGING
    // -------------------------------------

    let redirectPath = redirectFrom || "/";

    // Detect ONLY promoter referral login
    const isPromoterReferral =
      redirectFrom?.includes("ref") ||
      redirectFrom?.startsWith("/promoter");

    // Detect normal login (opened /login directly or no state)
    const isNormalLogin =
      redirectFrom === null ||
      redirectFrom === undefined ||
      redirectFrom === "" ||
      redirectFrom === "/login";

    console.log("isPromoterReferral:", isPromoterReferral);
    console.log("isNormalLogin:", isNormalLogin);
    console.log("user:", user);

    // -------------------------------------
    // 🚫 Show promoter message ONLY on normal login
    // -------------------------------------
    if (isNormalLogin && !isPromoterReferral) {
      const isPromoter = user.roles?.includes("promoter");

      if (isPromoter && user.active_role !== "promoter") {
        toast.info(
          "You’re already a promoter! Switch to the Promoter Dashboard to manage your account."
        );
      }
    }


    // -------------------------------------
    // 🛣️ Redirect logic
    // -------------------------------------

    if (user.roles?.includes("promoter") && user.active_role === "promoter") {
      redirectPath =
        user.promoter_type === "paid"
          ? "/promoter/dashboard/paid"
          : "/promoter/dashboard/unpaid";
    }

    if (user.role === "admin") {
      redirectPath = "/admin/dashboard";
    }

    // Final navigation
    if (navigate) {
      navigate(redirectPath, { replace: true });
    }

    return { success: true, from: redirectPath, user };

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
        return user.roles?.includes('promoter') && user.active_role === 'promoter';
      }
      return user.role === role || user.active_role === role;
    };

    const isAdmin = () =>
      hasRole("admin") || user?.is_staff;

    const isActivePromoter = () => user?.roles?.includes("promoter") && user.active_role === "promoter";
    const hasPromoterRole = () => user?.roles?.includes("promoter");
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
        isPromoter:isActivePromoter,
        hasPromoterRole,
        isCustomer,
        fetchProfile
      }}
    >
      {children}
    </AuthContext.Provider>

  );
};

export const useAuth = () => useContext(AuthContext);