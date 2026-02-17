import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axiosInstance from "../../api/axiosinstance";
import { useGetCartQuery } from "../../contexts/cartSlice";
import CartItemList from "./CartItemList";
import ShippingAddressSelector from "./ShippingAddressSelector";
import PaymentMethodSelector from "./PaymentMethodSelector";
import CheckoutSummary from "./CheckoutSummary";
import { handleRazorpayPayment } from "../../utils/payment";
import { useAuth } from "../../contexts/authContext";
import CartShimmer from "../../shimmer/CartShimmer";

const BUY_NOW_KEY = "buyNowMinimal";

const Checkout = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [buyNowItems, setBuyNowItems] = useState([]);
  const [guestCartItems, setGuestCartItems] = useState([]);
  const [checkoutItems, setCheckoutItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [checkoutSessionId, setCheckoutSessionId] = useState(() => crypto.randomUUID());
  const [orderPreview, setOrderPreview] = useState({
    subtotal: 0,
    delivery_charge: 0,
    total: 0,
  });

  const { data: authCartData, refetch: refetchAuthCart } = useGetCartQuery(undefined, {
    skip: !isAuthenticated,
  });

  const referralCode = new URLSearchParams(location.search).get("ref") || sessionStorage.getItem("referral_code") || "";

  useEffect(() => {
    const urlRef = new URLSearchParams(location.search).get("ref");
    if (urlRef) sessionStorage.setItem("referral_code", urlRef);
  }, [location.search]);

  /** ------------------------
 *  LOAD BUY NOW ITEMS
 * ------------------------ */
  useEffect(() => {
    const enrichBuyNowItems = async () => {
      const isBuyNowActive = sessionStorage.getItem("BUY_NOW_ACTIVE") === "true";
      if (!isBuyNowActive) return; // <-- ignore old/stale Buy Now items

      const stored = sessionStorage.getItem(BUY_NOW_KEY);
      if (!stored) return;

      try {
        const minimalItems = JSON.parse(stored);
        const variantIds = minimalItems.map((i) => i.product_variant_id);
        const res = await axiosInstance.post("product-variants/bulk/", { variant_ids: variantIds });


        const enriched = res.data.map((variant) => {
          const localItem = minimalItems.find((i) => i.product_variant_id === variant.id);
          return {
            id: variant.id,
            product_variant_id: variant.id,
            quantity: localItem?.quantity || 1,
            price: Number(variant.final_price ?? variant.offer_price ?? variant.base_price ?? 0),
            productName: variant.product_name || "Product",
            variantName: variant.variant_name || "Default",
            imageUrl: variant.primary_image_url || "/placeholder.png",
          };
        });


        setBuyNowItems(enriched);
      } catch (err) {
        toast.error("Failed to load Buy Now items");
      }
    };

    enrichBuyNowItems();
  }, [isAuthenticated]);


  /** ------------------------
   *  LOAD GUEST CART
   * ------------------------ */
  useEffect(() => {
    const loadGuestCart = async () => {
      if (!isAuthenticated && !buyNowItems.length) {
        const localCart = JSON.parse(localStorage.getItem("cart") || "[]");
        if (!localCart.length) {
          setGuestCartItems([]);
          return;
        }

        try {
          const variantIds = localCart.map((i) => i.product_variant_id);
          const res = await axiosInstance.post("product-variants/bulk/", { variant_ids: variantIds });

          const enriched = res.data.map((variant) => {
            const localItem = localCart.find((i) => i.product_variant_id === variant.id);

            return {
              id: variant.id,
              product_variant_id: variant.id,
              quantity: localItem?.quantity || 1,
              price: Number(variant.final_price ?? variant.offer_price ?? variant.base_price ?? 0),
              productName: variant.product_name || "Product",
              variantName: variant.variant_name || "",
              imageUrl: variant.images?.[0]?.url || "/placeholder.png",
            };
          });

          setGuestCartItems(enriched);
        } catch (err) {
          toast.error(err?.response?.data?.detail || "Failed to load cart items");
        }
      }
    };
    if (authLoading) return

    setLoading(true);
    if (isAuthenticated) {
      refetchAuthCart().finally(() => setLoading(false));
    } else {
      loadGuestCart().finally(() => setLoading(false));
    }
  }, [isAuthenticated, refetchAuthCart, buyNowItems.length]);

  /** ------------------------
 *  COMPUTE CART ITEMS & FLOW
 * ------------------------ */
  useEffect(() => {
    const getVariantImage = (item) => {
      if (item.variant?.images?.length) return item.variant.images[0].url;
      if (item.images?.length) return item.images[0].url;
      if (item.product?.images?.length) return item.product.images[0].url;
      return item.imageUrl || "/placeholder.png";
    };

    // 🚨 If Buy Now is active → FORCE checkoutItems to Buy Now only
    if (buyNowItems.length > 0) {
      setCheckoutItems(
        buyNowItems.map((item) => ({
          id: item.product_variant_id,
          product_variant_id: item.product_variant_id,
          productName: item.productName,
          variantName: item.variantName,
          quantity: item.quantity,
          price: item.price,
          imageUrl: getVariantImage(item),
          source: "buy_now",
        }))
      );
      return; // 🚨 IMPORTANT: STOP HERE
    }

    // 🔹 Only run cart logic when not in Buy Now mode
    let items = [];

    if (isAuthenticated && authCartData?.length) {
      items = authCartData.map((item) => ({
        id: item.variant_id || item.id,
        product_variant_id: item.variant_id || item.id,
        productName: item.product_name || "Product",
        variantName: item.variant_name || "",
        quantity: item.quantity,
        price: Number(item.final_price ?? item.offer_price ?? item.base_price ?? 0),
        imageUrl: getVariantImage(item),
        source: "auth_cart",
      }));
    } else if (!isAuthenticated && guestCartItems?.length) {
      items = guestCartItems.map((item) => ({
        id: item.product_variant_id,
        product_variant_id: item.product_variant_id,
        productName: item.productName,
        variantName: item.variantName,
        quantity: item.quantity,
        price: Number(item.price),
        imageUrl: getVariantImage(item),
        source: "guest_cart",
      }));
    }

    setCheckoutItems(items);
  }, [buyNowItems, authCartData, guestCartItems, isAuthenticated]);


  // 🔥 INSERT HERE — Reset session ID for normal cart checkout
  useEffect(() => {
    // Only for normal cart checkout (NOT buy-now, NOT referral)
    const isCartFlow =
      !buyNowItems.length &&
      !referralCode &&
      checkoutItems.length > 0;

    if (isCartFlow) {
      const newId = crypto.randomUUID();

      setCheckoutSessionId(newId);
    }
  }, [checkoutItems, buyNowItems.length, referralCode]);



  /** ------------------------
   *  ORDER PREVIEW FETCH
   * ------------------------ */
  useEffect(() => {
    const fetchPreview = async () => {
      if (!checkoutItems.length || !selectedAddress?.postal_code) {

        return;
      }
      const payload = {
        items: checkoutItems.map((item) => ({
          product_variant_id: item.product_variant_id,
          quantity: item.quantity,
        })),
        postal_code: selectedAddress.postal_code,
      };
      try {
        const res = await axiosInstance.post("checkout/preview/", payload);
        setOrderPreview(res.data);

      } catch (error) {
        console.error("[Checkout] Preview failed", error.response?.data || error.message);
        toast.error(error.response?.data?.detail || "Failed to fetch order preview");
      }
    };

    fetchPreview();
  }, [checkoutItems, selectedAddress?.postal_code]);


  /** ------------------------
   *  PLACE ORDER
   * ------------------------ */
  const handlePlaceOrder = async () => {
    if (isPlacingOrder) {
      return;
    }

    setIsPlacingOrder(true);

    const isBuyNowFlow = buyNowItems?.length > 0;

    const itemsToUse = isBuyNowFlow ? buyNowItems : checkoutItems;


    if (!itemsToUse.length) {
      toast.error("Your cart is empty");
      setIsPlacingOrder(false);
      return;
    }
    if (!selectedAddress) {
      toast.error("Please select a shipping address");
      setIsPlacingOrder(false);
      return;
    }
    if (!paymentMethod) {
      toast.error("Please select a payment method");
      setIsPlacingOrder(false);
      return;
    }

    const { full_name, phone_number, address, city, postal_code, country, locality, district, state, region,
    } = selectedAddress;

    const cleanAddress = {
      full_name,
      phone_number,
      address,
      city,
      postal_code,
      country,
      locality: locality || "",
      district,
      state,
      region,
    };

    try {
      const endpoint = isBuyNowFlow ? "checkout/buy-now/" : "checkout/cart/";

      const referralCode = sessionStorage.getItem("purchase_referral_code") || "";
      console.log(referralCode, 'ref code');
      console.log(itemsToUse, 'item to use');

      const payload = {
        items: itemsToUse.map((i) => ({
          product_variant_id: i.product_variant_id,
          quantity: i.quantity,
          ...(referralCode ? { referral_code: referralCode } : {}),
        })),
        payment_method: paymentMethod,
        checkout_session_id: checkoutSessionId,
        ...(selectedAddress.id
          ? { shipping_address_id: selectedAddress.id }
          : { shipping_address: cleanAddress }),
      };


      console.log(payload, 'checkout page');


      const res = await axiosInstance.post(endpoint, payload);

      const orderNumber = res.data.order?.order_number || res.data.order?.id;


      // ✅ Razorpay
      if (paymentMethod === "Razorpay") {

        await handleRazorpayPayment({

          razorpay_order_id: res.data.razorpay_order_id,
          amount: res.data.amount,
          currency: res.data.currency,
          razorpay_key: res.data.razorpay_key,
          orderNumber,
          onSuccess: () => {

            setCheckoutSessionId(crypto.randomUUID());
            if (!isBuyNowFlow && isAuthenticated) refetchAuthCart();
            if (!isBuyNowFlow && !isAuthenticated) {
              localStorage.removeItem("cart");
              setGuestCartItems([]);
            }
            if (isBuyNowFlow) {
              sessionStorage.removeItem(BUY_NOW_KEY);
              sessionStorage.removeItem("BUY_NOW_ACTIVE");
              sessionStorage.removeItem('purchase_referral_code')
              setBuyNowItems([]);
            }
            navigate(`/order-details/${orderNumber}/`);
          },
          onClose: () => setIsPlacingOrder(false),
        });
        return;
      }
    } catch (error) {
      console.error("[Checkout] Error placing order:", error.response?.data || error.message);
      toast.error(error.response?.data?.detail || "Failed to place order");
    } finally {
      setIsPlacingOrder(false);
    }
  };



  /** ------------------------
   *  RENDER
   * ------------------------ */
  if (loading || authLoading) return <CartShimmer />;


  return (
    <div className="min-h-screen bg-gray-50/50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header & Back Button */}
        <header className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <button
              onClick={() => navigate("/cart")}
              className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-900 transition mb-2 group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Cart
            </button>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Checkout</h1>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-4 text-sm font-bold">
            <div className="flex items-center gap-2 text-blue-600">
              <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">1</span>
              <span>Bag</span>
            </div>
            <div className="w-8 h-px bg-gray-300"></div>
            <div className="flex items-center gap-2 text-blue-600">
              <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-200">2</span>
              <span>Details</span>
            </div>
            <div className="w-8 h-px bg-gray-300"></div>
            <div className="flex items-center gap-2 text-gray-400">
              <span className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">3</span>
              <span>Payment</span>
            </div>
          </div>
        </header>

        {checkoutItems.length === 0 ? (
          <div className="text-center py-20 bg-white/60 backdrop-blur-md rounded-[3rem] shadow-xl border border-white/40">
            <p className="text-2xl font-semibold text-gray-600 mb-8">Your checkout is lonely...</p>
            <button
              onClick={() => navigate("/")}
              className="px-10 py-4 bg-gray-900 text-white rounded-2xl hover:bg-gray-800 transition shadow-lg font-bold"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Left Column: Checkout Details */}
            <div className="lg:col-span-8 space-y-8">

              {/* Items Section */}
              <section className="bg-white/70 backdrop-blur-xl border border-white/40 p-8 rounded-[2.5rem] shadow-sm overflow-hidden text-sm sm:text-base">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gray-100 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Review Bag</h2>
                </div>
                <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  <CartItemList cartItems={checkoutItems} />
                </div>
              </section>

              {/* Address Section */}
              <section className="bg-white/70 backdrop-blur-xl border border-white/40 p-8 rounded-[2.5rem] shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gray-100 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Shipping Details</h2>
                </div>
                <ShippingAddressSelector
                  selectedAddress={selectedAddress}
                  setSelectedAddress={setSelectedAddress}
                  onChange={(addr) => setSelectedAddress({ ...addr })}
                />
              </section>

              {/* Payment Section */}
              <section className="bg-white/70 backdrop-blur-xl border border-white/40 p-8 rounded-[2.5rem] shadow-sm font-sans">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gray-100 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Payment Method</h2>
                </div>
                <PaymentMethodSelector
                  paymentMethod={paymentMethod}
                  setPaymentMethod={setPaymentMethod}
                />
              </section>
            </div>

            {/* Right Column: Sticky Summary */}
            <div className="lg:col-span-4 lg:sticky lg:top-24 h-fit">
              {orderPreview ? (
                <div className="bg-gray-900 p-8 rounded-[3rem] shadow-2xl text-white">
                  <CheckoutSummary
                    subtotal={orderPreview.subtotal}
                    deliveryCharge={orderPreview.delivery_charge}
                    totalAmount={orderPreview.total}
                    estimatedDeliveryDays={orderPreview.estimated_delivery_days}
                    onPlaceOrder={handlePlaceOrder}
                  />
                  <div className="mt-8 pt-6 border-t border-gray-800">
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-widest font-black justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      100% Safe & Secure Checkout
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white/60 backdrop-blur-md rounded-[3rem] p-10 text-center border border-white/40 shadow-xl">
                  <div className="animate-pulse flex flex-col items-center">
                    <div className="w-16 h-16 bg-gray-200 rounded-full mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <p className="mt-6 text-gray-500 font-bold text-sm uppercase tracking-wider">
                    {selectedAddress?.postal_code
                      ? "Calculating final total..."
                      : "Select an address to finish"}
                  </p>
                </div>
              )}

              {/* Why shop with us? */}
              <div className="mt-6 space-y-4 px-4">
                <div className="flex gap-4 items-center">
                  <span className="text-xl">🚚</span>
                  <p className="text-xs text-gray-500 font-medium">Fast & Reliable Delivery via Delhivery.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Checkout;
