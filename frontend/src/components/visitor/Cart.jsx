import React, { useEffect, useState,useRef } from "react";
import { toast } from "react-toastify";
import axiosInstance from "../../api/axiosinstance";
import {
  useGetCartQuery,
  useUpdateCartItemMutation,
  useRemoveCartItemMutation,
} from "../../contexts/cartSlice";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/authContext";
import CartShimmer from "../../shimmer/CartShimmer";
import ConfirmModal from "../helpers/ConfirmModal";

const Cart = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const updateTimeoutsRef = useRef({});

  const [guestCartItems, setGuestCartItems] = useState([]);
  const [guestLoading, setGuestLoading] = useState(false);

  const [loadingIds, setLoadingIds] = useState([]); // array of item IDs currently updating
  
  const { data: authCartData, isLoading: authLoading, refetch: refetchCart } =
    useGetCartQuery(undefined, { skip: !isAuthenticated });

  const [updateCartItem] = useUpdateCartItemMutation();
  const [removeCartItem] = useRemoveCartItemMutation();

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Load guest cart
  const loadGuestCart = async () => {
    setGuestLoading(true);
    const localCart = JSON.parse(localStorage.getItem("cart")) || [];
    if (!localCart.length) {
      setGuestCartItems([]);
      setGuestLoading(false);
      return;
    }

    try {
      const variantIds = localCart.map((item) => item.product_variant_id);
      const res = await axiosInstance.post("product-variants/bulk/", {
        variant_ids: variantIds,
      });

      const enriched = res.data.map((variant) => {
        const localItem = localCart.find((i) => i.product_variant_id === variant.id);
        const final_price =
          variant.offer_price && parseFloat(variant.offer_price) < parseFloat(variant.base_price)
            ? parseFloat(variant.offer_price)
            : parseFloat(variant.base_price);

        return {
          ...variant,
          quantity: localItem?.quantity || 1,
          final_price,
        };
      });

      setGuestCartItems(enriched);
    } catch {
      toast.error("Failed to load product details");
      setGuestCartItems(localCart);
    } finally {
      setGuestLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) loadGuestCart();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      const handleCartUpdate = () => loadGuestCart();
      window.addEventListener("cartUpdated", handleCartUpdate);
      return () => window.removeEventListener("cartUpdated", handleCartUpdate);
    }
  }, [isAuthenticated]);

  const cartItems = isAuthenticated ? authCartData || [] : guestCartItems;
  const loading = isAuthenticated ? authLoading : guestLoading;

  // 🟢 Helper: get image URL prioritizing variant images
  const getImageUrl = (item) => {
    if (item.images?.length > 0) return item.images[0]?.url || item.images[0]?.image;
    if (item.primary_image_url) return item.primary_image_url;
    return "/placeholder.png";
  };
 
  // Quantity update
  const handleUpdateQuantity = (itemId, newQty) => {
    if (newQty < 1) return;

    // Track loading for this item
    setLoadingIds((prev) => [...prev, itemId]);

    // Update guest cart UI immediately
    if (!isAuthenticated) {
      const updated = guestCartItems.map((item) =>
        item.id === itemId ? { ...item, quantity: newQty } : item
      );
      setGuestCartItems(updated);
    }

    // Update API after a short delay (optional debounce)
    if (updateTimeoutsRef.current[itemId]) clearTimeout(updateTimeoutsRef.current[itemId]);

    updateTimeoutsRef.current[itemId] = setTimeout(async () => {
      try {
        if (isAuthenticated) {
          const cartItem = cartItems.find((i) => i.id === itemId);
          if (!cartItem) return;

          await updateCartItem({ id: cartItem.id, quantity: newQty }).unwrap();
          refetchCart();
        } else {
          // Persist guest cart
          const updated = guestCartItems.map((item) =>
            item.id === itemId ? { ...item, quantity: newQty } : item
          );
          localStorage.setItem(
            "cart",
            JSON.stringify(updated.map((i) => ({ product_variant_id: i.id, quantity: i.quantity })))
          );
          setGuestCartItems(updated);
          window.dispatchEvent(new Event("cartUpdated"));
        }
      } catch {
        toast.error("Failed to update quantity");
        if (isAuthenticated) refetchCart();
      } finally {
        // Remove loading state
        setLoadingIds((prev) => prev.filter((id) => id !== itemId));
      }
    }, 700); // 700ms delay for debounce
  };


  // Delete confirmation
  const confirmRemoveItem = (item) => {
    setItemToDelete(item);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    setDeleting(true);

    try {
      if (isAuthenticated) {
        const cartItem = cartItems.find((i) => i.id === itemToDelete.id);
        if (cartItem) await removeCartItem(cartItem.id);
      } else {
        const updated = guestCartItems.filter((i) => i.id !== itemToDelete.id);
        localStorage.setItem(
          "cart",
          JSON.stringify(updated.map((i) => ({ product_variant_id: i.id, quantity: i.quantity })))
        );
        setGuestCartItems(updated);
        window.dispatchEvent(new Event("cartUpdated"));
      }

      toast.success("Item removed from cart");
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    } catch {
      toast.error("Failed to remove item");
    } finally {
      setDeleting(false);
    }
  };

  const cartTotal = cartItems.reduce(
    (acc, item) => acc + (parseFloat(item.final_price) || 0) * item.quantity,
    0
  );
 
  
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl sm:text-4xl font-extrabold mb-8 text-gray-900 tracking-tight">
        Your Cart
      </h1>

      {loading ? (
        <CartShimmer count={3} />
      ) : !cartItems.length ? (
        <p className="text-center text-gray-500 text-lg">No items in your cart</p>
      ) : (
        <div className="space-y-6">
          {cartItems.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-6 items-center border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition bg-white"
            >
              {/* Product Image */}
              <div 
              onClick={() => navigate(`/products/${item.product_slug || item.id}`)}
              className="w-full sm:w-32 md:w-28 lg:w-32 cursor-pointer">
                <img
                  src={getImageUrl(item)}
                  alt={item.product_name || "Product"}
                  className="w-full h-full object-cover rounded-2xl"
                />
              </div>

              {/* Product Info */}
              <div className="space-y-2">
               <h2
                  onClick={() => navigate(`/products/${item.product_slug || item.id}`)}
                  className="text-lg sm:text-xl font-semibold text-gray-900 capitalize truncate cursor-pointer max-w-[200px] md:max-w-[300px]"
                  title={`${item.product_name} - ${item.variant_name || "Default"}`}
                >
                  {item.product_name} - {item.variant_name || "Default"}
                </h2>
                <div className="flex flex-wrap items-center gap-3">
                  {item.offer_price && parseFloat(item.offer_price) < parseFloat(item.base_price) ? (
                    <>
                      <p className="text-xl font-bold text-green-600">₹{item.final_price}</p>
                      <p className="text-sm text-gray-400 line-through">₹{item.base_price}</p>
                      <p className="text-sm text-red-500 font-semibold">
                        {Math.round(((item.base_price - item.final_price) / item.base_price) * 100)}% OFF
                      </p>
                    </>
                  ) : (
                    <p className="text-xl font-bold text-gray-900">₹{item.final_price}</p>
                  )}
                </div>

                <p className="text-sm text-gray-600">
                  Subtotal: ₹{(item.final_price * item.quantity).toFixed(2)}
                </p>

                {item.stock < 5 && (
                  <p className="text-sm font-medium text-red-600">Only {item.stock} left in stock!</p>
                )}
              </div>

              {/* Quantity & Remove */}
              <div className="flex flex-col items-end gap-3">
                <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full">
                  <button
                    onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                    disabled={item.quantity <= 1 || loadingIds.includes(item.id)}
                    className="px-3 py-1 rounded-full bg-gray-200 hover:bg-gray-300 transition text-lg"
                  >
                    {loadingIds.includes(item.id) ? "..." : "−"}
                  </button>
                  <span className="font-medium text-gray-800 transition-transform duration-150 ease-in-out scale-105">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                    disabled={item.quantity >= item.stock || loadingIds.includes(item.id)}
                    className="px-3 py-1 rounded-full bg-gray-200 hover:bg-gray-300 transition text-lg"
                  >
                    {loadingIds.includes(item.id) ? "..." : "+"}
                  </button>
                </div>

                <button
                  onClick={() => confirmRemoveItem(item)}
                  className="px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition font-medium"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          {/* Cart Total & Checkout */}
          <div className="mt-10 border-t border-gray-200 pt-6 bg-white rounded-2xl shadow-md p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">
              Total: ₹{cartTotal.toFixed(2)}
            </p>
            <button
              disabled={cartItems.length === 0}
              onClick={() => {
                if (isAuthenticated) navigate("/checkout");
                else {
                  toast.info("Please log in as a customer to proceed to checkout");
                  navigate("/login", { state: { from: "/checkout" } });
                }
              }}
              className="px-8 py-3 bg-gradient-to-r from-[#155dfc] to-[#0f4bc4] text-white text-lg font-semibold rounded-2xl hover:opacity-90 transition"
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteItem}
        title="Confirm Delete"
        message={`Are you sure you want to remove "${itemToDelete?.product_name}" from your cart?`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        loading={deleting}
      />
    </div>
  );
};

export default Cart;
