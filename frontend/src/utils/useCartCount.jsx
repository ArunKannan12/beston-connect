import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../contexts/authContext";
import { useGetCartQuery } from "../contexts/cartSlice";

export const useCartCount = () => {
  const { isAuthenticated } = useAuth();
  const [guestCount, setGuestCount] = useState(0);

  // Always call the query hook; skip only fetching
  const { data: cartData } = useGetCartQuery(undefined, {
    skip: !isAuthenticated,
    refetchOnMountOrArgChange: true,
  });

  // Count for authenticated users
  const authCartCount = useMemo(() => {
    if (!isAuthenticated || !cartData) return 0;
    return cartData.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }, [cartData, isAuthenticated]);

  // Count for guest users
  useEffect(() => {
    const updateGuestCount = () => {
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      const total = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
      setGuestCount(total);
    };

    updateGuestCount(); // always call once on mount

    window.addEventListener("storage", updateGuestCount);
    window.addEventListener("cartUpdated", updateGuestCount);

    return () => {
      window.removeEventListener("storage", updateGuestCount);
      window.removeEventListener("cartUpdated", updateGuestCount);
    };
  }, []); // run once; no dependency on isAuthenticated

  return isAuthenticated ? authCartCount : guestCount;
};
