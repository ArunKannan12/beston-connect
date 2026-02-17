import React, { useEffect, useState, useRef } from "react";
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50/50 to-blue-50/30 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-16 text-center">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h1 className="text-5xl sm:text-6xl font-black bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent tracking-tight">
              Shopping Cart
            </h1>
          </div>
          <p className="text-xl text-gray-500 font-medium max-w-2xl mx-auto">
            Review your selected items and proceed to secure checkout
          </p>
        </header>

        {loading ? (
          <CartShimmer count={3} />
        ) : !cartItems.length ? (
          <div className="text-center py-24 bg-white/80 backdrop-blur-xl rounded-[3rem] shadow-2xl border border-white/40 max-w-2xl mx-auto">
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="w-32 h-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-2xl animate-bounce">
                  😢
                </div>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Your cart feels empty...</h2>
            <p className="text-lg text-gray-500 mb-10 max-w-md mx-auto">
              Start shopping to add amazing products to your cart!
            </p>
            <button
              onClick={() => navigate("/")}
              className="px-12 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-3xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] font-bold text-lg"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Items List */}
            <div className="lg:col-span-8 space-y-8">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="group relative flex flex-col lg:flex-row gap-8 items-start bg-white/80 backdrop-blur-xl border border-gray-100/60 p-8 rounded-[3rem] shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-500"
                >
                  {/* Image Container */}
                  <div
                    onClick={() => navigate(`/products/${item.product_slug || item.id}`)}
                    className="relative w-full lg:w-48 h-48 cursor-pointer overflow-hidden rounded-3xl bg-gradient-to-br from-gray-50 to-gray-100 flex-shrink-0 shadow-inner group-hover:shadow-xl transition-all duration-500"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <img
                      src={getImageUrl(item)}
                      alt={item.product_name || "Product"}
                      className="w-full h-full object-contain group-hover:scale-110 transition duration-700 relative z-10"
                    />
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 flex flex-col justify-between h-full w-full py-2">
                    <div>
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <div className="flex-1">
                          <h2
                            onClick={() => navigate(`/products/${item.product_slug || item.id}`)}
                            className="text-2xl lg:text-3xl font-black text-gray-900 hover:text-blue-600 transition cursor-pointer mb-2 leading-tight"
                          >
                            {item.product_name}
                          </h2>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-200">
                              {item.variant_name || "Standard Edition"}
                            </div>
                            {item.stock < 5 && (
                              <div className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-semibold border border-red-200 animate-pulse">
                                Only {item.stock} left!
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => confirmRemoveItem(item)}
                          className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all duration-300 group"
                          title="Remove Item"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      <div className="flex items-center gap-4 mb-6">
                        {item.offer_price && parseFloat(item.offer_price) < parseFloat(item.base_price) ? (
                          <>
                            <div className="flex items-baseline gap-3">
                              <p className="text-3xl font-black text-gray-900">₹{item.final_price}</p>
                              <span className="text-lg line-through text-gray-400">₹{item.base_price}</span>
                            </div>
                            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg shadow-red-500/25">
                              {Math.round(((item.base_price - item.final_price) / item.base_price) * 100)}% OFF
                            </div>
                          </>
                        ) : (
                          <p className="text-3xl font-black text-gray-900">₹{item.final_price}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-8 flex flex-wrap items-center justify-between gap-6">
                      <div className="flex items-center bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-2 shadow-inner border border-gray-200">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1 || loadingIds.includes(item.id)}
                          className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-white hover:shadow-md disabled:opacity-30 transition-all duration-300 font-bold text-gray-600 text-lg"
                        >
                          {loadingIds.includes(item.id) ? (
                            <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                          ) : "−"}
                        </button>
                        <div className="w-16 text-center">
                          <span className="text-xl font-black text-gray-900">{item.quantity}</span>
                        </div>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.stock || loadingIds.includes(item.id)}
                          className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-white hover:shadow-md disabled:opacity-30 transition-all duration-300 font-bold text-gray-600 text-lg"
                        >
                          {loadingIds.includes(item.id) ? (
                            <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                          ) : "+"}
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">Item Total</p>
                        <p className="text-2xl lg:text-3xl font-black text-gray-900 leading-none">₹{(item.final_price * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Sticky Order Summary */}
            <div className="lg:col-span-4 lg:sticky lg:top-24 h-fit">
              <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-10 rounded-[3rem] shadow-2xl text-white border border-gray-700/50">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Order Summary</h3>
                    <p className="text-sm text-gray-400">{cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}</p>
                  </div>
                </div>

                <div className="space-y-6 mb-10">
                  <div className="flex justify-between text-gray-300 font-medium">
                    <span>Subtotal</span>
                    <span className="text-lg">₹{cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-300 font-medium">
                    <span>Shipping</span>
                    <span className="text-emerald-400 text-sm">Calculated at checkout</span>
                  </div>
                  <div className="pt-6 border-t border-gray-700">
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold text-gray-200">Total</span>
                      <div className="text-right">
                        <p className="text-4xl font-black text-white leading-none">₹{cartTotal.toFixed(2)}</p>
                        <p className="text-xs text-gray-500 uppercase mt-2 tracking-widest font-bold">Incl. GST</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <button
                    onClick={() => {
                      if (isAuthenticated) navigate("/checkout");
                      else {
                        toast.info("Please log in to continue");
                        navigate("/login", { state: { from: "/checkout" } });
                      }
                    }}
                    className="w-full py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-3xl font-black text-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden group"
                  >
                    <span className="relative z-10">Proceed to Checkout</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </button>
                  
                  <div className="flex items-center justify-center gap-3 text-center">
                    <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-xs text-gray-400 font-medium">
                      256-bit SSL encrypted • Secure payment gateway
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteItem}
        title="Remove item from cart?"
        message={`"${itemToDelete?.product_name}" will be removed from your bag.`}
        confirmText="Remove"
        cancelText="Discard"
        loading={deleting}
      />
    </div>
  );
};

export default Cart;
