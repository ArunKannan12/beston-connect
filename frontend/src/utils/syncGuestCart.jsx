import { toast } from "react-toastify";

/**
 * Sync guest cart or Buy Now items into authenticated user's cart
 * @param {Function} mergeGuestCart - RTK mutation function
 * @param {Array|Object|null} itemsToMerge - optional array or single item to merge, otherwise reads from storage
 * @param {Function} refetchCart - optional function to refresh cart after merge
 * @param {Function} navigate - optional navigation function (e.g., from useNavigate)
 */
export const syncGuestcart = async (mergeGuestCart, itemsToMerge = null, refetchCart = null, navigate = null) => {
  console.log("[SyncGuestCart] Starting cart sync...");

  let cartItems = itemsToMerge;

  // Load from storage if not provided
  if (!cartItems) {
    const localCart = JSON.parse(localStorage.getItem("cart") || "[]");
    const buyNowItems = JSON.parse(sessionStorage.getItem("buyNowMinimal") || "[]");
    cartItems = [...localCart, ...buyNowItems];
    
  } else {
    console.log("[SyncGuestCart] Items provided for merge:", cartItems);
  }

  // Normalize to array
  if (!Array.isArray(cartItems)) {
    cartItems = [cartItems];
  }

  if (cartItems.length === 0) {
    console.log("[SyncGuestCart] No items to merge, exiting...");
    return true;
  }

  try {
    // Format payload for backend
    const formattedItems = cartItems.map((item) => ({
      product_variant_id: item.product_variant_id,
      quantity: item.quantity,
      source: item.source || "add_to_cart", // fallback
    }));

    const payload = { items: formattedItems };
    

    const response = await mergeGuestCart(payload).unwrap();
   

    // Clear storage
    localStorage.removeItem("cart");
    sessionStorage.removeItem("buyNowMinimal");
    

    const { merged_items = [], skipped_items = [], failed_items = [] } = response;

    if (merged_items.length > 0) {
      toast.success(`${merged_items.length} item(s) added to your cart`);
      console.log("[SyncGuestCart] Merged items:", merged_items);

      const allBuyNow = merged_items.every(item => item.source === "buy_now");
      if (allBuyNow && navigate) {
        toast.info("Redirecting to checkout...");
        navigate("/checkout");
      }
    }

    if (skipped_items.length > 0 || failed_items.length > 0) {
      toast.warn("Some items couldn't be added. Please review your cart.");
      console.log("[SyncGuestCart] Skipped items:", skipped_items, "Failed items:", failed_items);
    }

    if (refetchCart) {
      await refetchCart();
      console.log("[SyncGuestCart] Cart refetched after merge");
    }

    console.log("[SyncGuestCart] Cart sync completed successfully");
    return true;
  } catch (error) {
    console.error("[SyncGuestCart] Merge failed:", error);
    toast.error("Failed to sync cart. Please try again.");
    return false;
  }
};