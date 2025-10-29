import axiosInstance from "../api/axiosinstance";
import { toast } from "react-toastify";

// Load Razorpay SDK dynamically
const loadRazorpayScript = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(true);

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Razorpay SDK failed to load"));
    document.body.appendChild(script);
  });

export const handleRazorpayPayment = async ({
  razorpay_order_id,
  amount,
  currency,
  razorpay_key,
  orderNumber,
  onSuccess,
}) => {
  try {
    await loadRazorpayScript();

    if (!razorpay_order_id) throw new Error("Razorpay order ID is required");

    return new Promise((resolve, reject) => {
      const options = {
        key: razorpay_key,
        amount:Math.round(amount),
        currency,
        name: "Beston Connect",
        description: `Payment for order ${orderNumber}`,
        order_id: razorpay_order_id,
        handler: async (response) => {
          try {
            const payload = {
              razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              order_number: orderNumber, // backend expects order_number
            };

            await axiosInstance.post("orders/razorpay/verify/", payload);
            toast.success("Payment successful & verified");
            if (onSuccess) onSuccess(orderNumber);
            resolve(orderNumber);
          } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.detail || "Payment verification failed");
            reject(error);
          }
        },
        modal: {
          ondismiss: () => {
            toast.info("Payment was cancelled");
            reject(new Error("Payment cancelled"));
          },
        },
        theme: { color: "#3399cc" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    });
  } catch (err) {
    console.error(err);
    toast.error(err.message || "Failed to initiate Razorpay payment");
    throw err;
  }
};
