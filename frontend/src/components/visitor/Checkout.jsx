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

  const [buyNowItems, setBuyNowItems] = useState([]);
  const [guestCartItems, setGuestCartItems] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [pendingorderNumber, setPendingorderNumber] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const location = useLocation()
 
  const [orderPreview, setOrderPreview] = useState({
    subtotal: 0,
    delivery_charge: 0,
    total: 0,
  });

  const { data: authCartData, refetch: refetchAuthCart } = useGetCartQuery(undefined, {
    skip: !isAuthenticated,
  });

  const params = new URLSearchParams(location.search);
  const ref =params.get('ref')
 
  
  /** ------------------------
   *  LOAD BUY NOW ITEMS
   * ------------------------ */
  useEffect(() => {
    const enrichBuyNowItems = async () => {
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
            // ✅ pick offer_price/final_price
            price: Number(variant.final_price ?? variant.offer_price ?? variant.base_price ?? 0),
            productName: variant.product_name || "Product",
            variantName: variant.variant_name || "Default",
            // ✅ ensure safe fallback image
            imageUrl: variant.images?.length > 0 ? variant.images[0].url : "/placeholder.png",
          };
        });

        setBuyNowItems(enriched);
      } catch (err) {
        toast.error("Failed to load Buy Now items");
      }
    };

    enrichBuyNowItems();
  }, []);

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
   *  COMPUTE CART ITEMS
   * ------------------------ */
  useEffect(() => {
    const getVariantImage = (item) => {
      
      
      if (item.variant?.images?.length) return item.variant.images[0].url || "/placeholder.png";
      if (item.images?.length) return item.images[0].url || "/placeholder.png";
      if (item.product?.images?.length) return item.product.images[0].url || "/placeholder.png";
      return item.imageUrl || "/placeholder.png";
    };

    let items = [];

    if (buyNowItems.length) {
      items = buyNowItems.map((item) => ({     
        id: item.variant?.id || item.product_variant_id || item.id,
        product_variant_id: item.variant?.id || item.product_variant_id || item.id,
        productName: item.productName || item.product?.name || "Product",
        variantName: item.variantName || item.variant?.variant_name || "",
        quantity: item.quantity || 1,
        price: item.price,
        imageUrl: getVariantImage(item),
      }));
    } else if (isAuthenticated && authCartData?.length) {
      items = authCartData.map((item) => ({
        id: item.variant_id || item.id,
        product_variant_id: item.variant_id || item.id,
        productName: item.product_name || "Product",
        variantName: item.variant_name || "",
        quantity: item.quantity || 1,
        price: Number(item.final_price ?? item.offer_price ?? item.base_price ?? 0),
        imageUrl: getVariantImage(item),
      }));
    } else {
      items = guestCartItems.map((item) => ({
        id: item.variant?.id || item.product_variant_id || item.id,
        product_variant_id: item.variant?.id || item.product_variant_id || item.id,
        productName: item.productName || item.product?.name || "Product",
        variantName: item.variantName || item.variant?.variant_name || "",
        quantity: item.quantity || 1,
        price: Number(
            item.final_price ??
            item.offer_price ??
            item.base_price ??
            item.price ??
            0
          ),
        imageUrl: getVariantImage(item),
      }));
    }

    setCartItems(items);
  }, [buyNowItems, authCartData, guestCartItems, isAuthenticated]);

  /** ------------------------
   *  ORDER PREVIEW FETCH
   * ------------------------ */
  useEffect(() => {
    const fetchPreview = async () => {
      if (!cartItems.length || !selectedAddress?.postal_code) {
        
        return;
      }
      const payload = {
        items: cartItems.map((item) => ({
          product_variant_id: item.product_variant_id,
          quantity: item.quantity,
        })),
        postal_code: selectedAddress.postal_code,
      };
      try {
        const res = await axiosInstance.post("checkout/preview/", payload);
        setOrderPreview(res.data);
        console.log(res.data,'checkout preview');
        
      } catch (error) {
        console.error("[Checkout] Preview failed", error.response?.data || error.message);
        toast.error(error.response?.data?.detail || "Failed to fetch order preview");
      }
    };

    fetchPreview();
  }, [cartItems, selectedAddress?.postal_code]);


  /** ------------------------
   *  PLACE ORDER
   * ------------------------ */
  const handlePlaceOrder = async () => {
    const isBuyNowFlow = buyNowItems?.length > 0;
    const itemsToUse = isBuyNowFlow ? buyNowItems : cartItems;

    if (!itemsToUse.length) return toast.error("Your cart is empty");
    if (!selectedAddress) return toast.error("Please select a shipping address");
    if (!paymentMethod) return toast.error("Please select a payment method");

    const {
      full_name,
      phone_number,
      address,
      city,
      postal_code,
      country,
      locality,
      district,
      state,
      region,
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
      let endpoint = "checkout/cart/";

      // ✅ handle referral + buy-now + normal cart
      if (isBuyNowFlow && ref) {
        endpoint = `checkout/referral/?ref=${ref}`; // referral flow
      } else if (isBuyNowFlow) {
        endpoint = "checkout/buy-now/";
      }

      const payload = {
        items: itemsToUse.map((i) => ({
          product_variant_id: i.product_variant_id,
          quantity: i.quantity,
        })),
        payment_method: paymentMethod,
        ...(selectedAddress.id
          ? { shipping_address_id: selectedAddress.id }
          : { shipping_address: cleanAddress }),
          ...(ref ? {referral_code:ref }: {}),
      };

      const res = await axiosInstance.post(endpoint, payload);
      const orderNumber = res.data.order?.order_number || res.data.order?.id;

      // COD case
      if (paymentMethod === "Cash on Delivery") {
        toast.success("Order placed successfully with COD");

        // Cleanup
        if (!isBuyNowFlow && isAuthenticated) await refetchAuthCart();
        if (!isBuyNowFlow && !isAuthenticated) {
          localStorage.removeItem("cart");
          setGuestCartItems([]);
        }
        if (isBuyNowFlow) {
          sessionStorage.removeItem(BUY_NOW_KEY);
          setBuyNowItems([]);
        }

        navigate(`/orders/${orderNumber}/`);
        return; // ✅ Prevent running rest of the code
      }

      // Razorpay case
      if (paymentMethod === "Razorpay") {
        await handleRazorpayPayment({
          razorpay_order_id: res.data.razorpay_order_id,
          amount: res.data.amount,
          currency: res.data.currency,
          razorpay_key: res.data.razorpay_key,
          orderNumber,
          onSuccess: () => {
            // Cleanup after successful payment
            if (!isBuyNowFlow && isAuthenticated) refetchAuthCart();
            if (!isBuyNowFlow && !isAuthenticated) {
              localStorage.removeItem("cart");
              setGuestCartItems([]);
            }
            if (isBuyNowFlow) {
              sessionStorage.removeItem(BUY_NOW_KEY);
              setBuyNowItems([]);
            }
            navigate(`/orders/${orderNumber}/`);
          },
        });
        return;
      }

    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.detail || "Failed to place order");
    }
  };



  /** ------------------------
   *  RENDER
   * ------------------------ */
  if (loading || authLoading) return <CartShimmer/>;

  
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
      {cartItems.length === 0 ? (
        <p className="text-gray-600">Your cart is empty</p>
      ) : (
        <>
          <CartItemList cartItems={cartItems} />
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
