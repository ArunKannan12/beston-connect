// hooks/useRazorpayCheckout.js
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../api/axiosinstance';

export const useRazorpayCheckout = () => {
  const navigate = useNavigate();

  const triggerRazorpay = async ({ items, address, isBuyNowFlow }) => {
    try {
      const payload = {
        items: items.map(item => ({
          product_variant_id: item.variant?.id || item.product_variant_id,
          quantity: item.quantity,
          source: isBuyNowFlow ? "buy_now" : "cart"
        })),
        shipping_address: address,
        payment_method: "Razorpay"
      };

      const endpoint = isBuyNowFlow ? "/checkout/buy-now/" : "/checkout/cart/";
      const res = await axiosInstance.post(endpoint, payload);
      const { razorpay_order, id: orderId } = res.data;

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: razorpay_order.amount,
        currency: "INR",
        order_id: razorpay_order.id,
        name: "Your Store",
        description: "Order Payment",
        handler: async function (response) {
          try {
            await axiosInstance.post("/orders/verify-payment/", {
              order_id: orderId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            toast.success("Payment successful");
            navigate(`/orders/${orderId}/`);
          } catch (err) {
            toast.error("Payment verification failed");
          }
        },
        prefill: {
          name: address.full_name,
          email: "customer@example.com",
          contact: address.phone_number
        },
        theme: {
          color: "#3399cc"
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
      return orderId;
    } catch (error) {
      console.error("Razorpay initiation failed", error.response?.data || error.message);
      toast.error("Failed to initiate Razorpay payment");
      throw error;
    }
  };

  return { triggerRazorpay };
};