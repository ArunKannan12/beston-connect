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
  }, [checkoutItems, buyNowItems.length,referralCode]);



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
  console.log(isBuyNowFlow,'is buy now flow');
  console.log(buyNowItems,'is buy now items');
  console.log(checkoutItems,'cart items');
  
  
  
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

  const {full_name,phone_number,address,city,postal_code,country,locality,district,state,region,
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
    console.log(referralCode,'ref code');
    console.log(itemsToUse,'item to use');
      
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


      console.log(payload,'checkout page');
      

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
          navigate(`/orders/${orderNumber}/`);
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
  if (loading || authLoading) return <CartShimmer/>;

  
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
      {checkoutItems.length === 0 ? (
        <p className="text-gray-600">Your cart is empty</p>
      ) : (
        <>
          <CartItemList cartItems={checkoutItems} />
          <ShippingAddressSelector
            selectedAddress={selectedAddress}
            setSelectedAddress={setSelectedAddress}
            onChange={(addr) => setSelectedAddress({ ...addr })}
          />

          <PaymentMethodSelector
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
          />
          {orderPreview ? (
            <CheckoutSummary
              subtotal={orderPreview.subtotal}
              deliveryCharge={orderPreview.delivery_charge}
              totalAmount={orderPreview.total}
              estimatedDeliveryDays={orderPreview.estimated_delivery_days} // ✅ pass it down
              onPlaceOrder={handlePlaceOrder}
            />
          ) : (
            <div className="text-center text-gray-500 mt-6">
              {selectedAddress?.postal_code
                ? "Loading order summary..."
                : "Please select an address to see your order summary."}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Checkout;
