import axiosInstance from "../api/axiosinstance";
import { toast } from "react-toastify";

/* ------------------------------
 * Load Razorpay SDK dynamically
 * ------------------------------ */
const loadRazorpayScript = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Razorpay SDK failed to load"));
    document.body.appendChild(script);
  });

/* ------------------------------
 * Cleanup Razorpay session
 * ------------------------------ */
const cleanupRazorpaySession = () => {
  try {
    const scripts = document.querySelectorAll(
      'script[src*="checkout.razorpay.com"]'
    );
    scripts.forEach((s) => s.parentNode?.removeChild(s));
    if (window.Razorpay) delete window.Razorpay;
  } catch (err) {
    console.warn("Failed to clean Razorpay session:", err);
  }
};

/* ------------------------------
 * Main Razorpay payment handler
 * ------------------------------ */
export const handleRazorpayPayment = async ({
  razorpay_order_id,
  amount,
  currency,
  razorpay_key,
  orderNumber,
  onSuccess,
  onClose,
}) => {
  if (!razorpay_order_id) throw new Error("Razorpay order ID is required");

  try {
    await loadRazorpayScript();

    return new Promise((resolve, reject) => {
      const options = {
        key: razorpay_key,
        amount: Math.round(amount),
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
              order_number: orderNumber,
            };

            // Verify payment with backend
            await axiosInstance.post("orders/razorpay/verify/", payload);

            toast.success("Payment successful & verified ✅");

            cleanupRazorpaySession();
            onSuccess?.(orderNumber);
            onClose?.();
            resolve(orderNumber);
          } catch (error) {
            toast.error(
              error.response?.data?.detail || "Payment verification failed ❌"
            );
            cleanupRazorpaySession();
            onClose?.();
            reject(error);
          }
        },

        modal: {
          ondismiss: () => {
            toast.info("Payment was cancelled 🕓");
            cleanupRazorpaySession();
            onClose?.();
            reject(new Error("Payment cancelled"));
          },
        },

        theme: { color: "#3399cc" },
      };

      // Initialize and open Razorpay checkout
      const rzp = new window.Razorpay(options);
      rzp.open();
    });
  } catch (err) {
    toast.error(err.message || "Failed to initiate Razorpay payment");
    cleanupRazorpaySession();
    onClose?.();
    throw err;
  }
};
