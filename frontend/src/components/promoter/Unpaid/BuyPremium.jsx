import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axiosinstance";
import { toast } from "react-toastify";

const BuyPremium = ({ selectedPlan = "monthly" }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  useEffect(() => {
    const becomePremium = async () => {
      try {
        const res = await axiosInstance.post("promoter/become-premium/", {
          plan_type: selectedPlan
        });
        const { razorpay_order_id, amount, currency, plan_type } = res.data;

        const loaded = await loadRazorpayScript();
        if (!loaded) {
          toast.error("Razorpay SDK failed to load.");
          navigate("/promoter/dashboard");
          return;
        }

        // Delay to ensure overlay is visible
        setTimeout(() => {
          setLoading(false);

          const options = {
            key: import.meta.env.VITE_RAZORPAY_KEY_ID,
            amount: amount * 100,
            currency,
            name: "Beston Premium Membership",
            description: `Upgrade to Premium Promoter - ${plan_type === "annual" ? "Annual" : "Monthly"} Plan`,
            order_id: razorpay_order_id,
            handler: async (response) => {
              try {
                const verifyRes = await axiosInstance.post(
                  "promoter/verify-premium-payment/",
                  {
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_signature: response.razorpay_signature,
                    plan_type: plan_type,
                  }
                );

                toast.success(
                  verifyRes.data.detail ||
                    "Payment successful! You're now a premium promoter."
                );

                // ✅ Redirect to premium dashboard
                navigate("/promoter/dashboard/paid");
              } catch (err) {
                console.error(err);
                toast.error(
                  "Payment verification failed. Please contact support."
                );
                navigate("/promoter/dashboard");
              }
            },
            modal: {
              escape: true,
              ondismiss: () => {
                toast.warning("Payment cancelled");
                navigate("/promoter/dashboard");
              },
            },
            theme: { color: "#0D6EFD" },
          };

          const rzp = new window.Razorpay(options);
          window.rzp = rzp; // prevent garbage collection
          rzp.open();
        }, 400);
      } catch (error) {
        console.error(error);
        toast.error(error.response?.data?.detail || "Failed to create order.");
        navigate("/promoter/dashboard");
      }
    };

    becomePremium();
  }, [navigate, selectedPlan]);

  return (
    <>
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-2xl flex flex-col items-center animate-fade-in scale-95">
            <div className="w-14 h-14 mb-4 border-4 border-blue-500 border-t-transparent rounded-full animate-spinner-glow"></div>
            <p className="font-semibold text-gray-800 animate-text-fade">
              Preparing payment...
            </p>
          </div>
        </div>
      )}

      <style>
        {`
        @keyframes fade-in {
          0% { opacity: 0; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }

        @keyframes spinner-glow {
          0% { transform: rotate(0deg); box-shadow: 0 0 0px rgba(59,130,246,0.6); }
          50% { box-shadow: 0 0 10px rgba(59,130,246,0.8); }
          100% { transform: rotate(360deg); box-shadow: 0 0 0px rgba(59,130,246,0.6); }
        }
        .animate-spinner-glow {
          animation: spinner-glow 1.2s linear infinite;
        }

        @keyframes text-fade {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-text-fade {
          animation: text-fade 0.8s ease-out forwards;
        }
        `}
      </style>
    </>
  );
};

export default BuyPremium;
