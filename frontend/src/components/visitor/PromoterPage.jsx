import React, { useEffect, useState } from "react";
import axiosInstance from "../../api/axiosinstance.jsx";
import {useNavigate} from 'react-router-dom'

const BecomePromoterPage = () => {
  const [selectedPlan, setSelectedPlan] = useState("");
  const [showForm, setShowForm] = useState(false); // show form on click
  const [formData, setFormData] = useState({
    bank_account_number: "",
    ifsc_code: "",
    bank_name: "",
    account_holder_name: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [settings, setSettings] = useState(null);
  const [timeLeft, setTimeLeft] = useState("");
  const navigate = useNavigate();


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const fetchPremiumSettings = async () => {
      try {
        const res = await axiosInstance.get("promoter/premium-amount/");
        setSettings(res.data);
      } catch (error) {
        console.error("Error fetching premium settings:", error);
      }
    };
    fetchPremiumSettings();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!settings?.offer_end) return;

    const interval = setInterval(() => {
      const end = new Date(settings.offer_end);
      const now = new Date();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft("Offer expired");
        clearInterval(interval);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [settings]);

  const handlePlanClick = (plan) => {
    setSelectedPlan(plan);
    setShowForm(true);

    setTimeout(() => {
      const formSelection = document.getElementById('promoter-form-section');
      if (formSelection) {
        formSelection.scrollIntoView({behavior:'smooth',block:'start'})
      }
    }, 100);
  };

  const handleSubmit = async () => {
    if (!selectedPlan) {
      setMessage({ type: "error", text: "Please select a plan first!" });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      if (selectedPlan === "unpaid") {
        const res = await axiosInstance.post("/promoters/", formData);
       
        setMessage({
          type: "success",
          text: "You are now registered as a Free Promoter!",
        });

        navigate("/promoter/dashboard/unpaid");
      } else {
         const { data } = await axiosInstance.post("/promoter/become-premium/", formData);
       
        const options = {
          key: data.key,
          amount: data.amount,
          currency: data.currency,
          order_id: data.order_id,
          name: user ? `${user.first_name} ${user.last_name}` : formData.account_holder_name,
          description: "Premium Promoter Registration",
          handler: async (paymentResult) => {
            try {
              const verifyRes = await axiosInstance.post("/promoter/verify-premium-payment/", {
                payment_id: paymentResult.razorpay_payment_id,
                order_id: paymentResult.razorpay_order_id,
                signature: paymentResult.razorpay_signature,
              });
              
              setMessage({
                type: "success",
                text: "Premium Promoter registration successful!",
              });

              navigate("/promoter/dashboard/paid");
            } catch (verifyError) {
               setMessage({
                type: "error",
                text: "Payment verification failed. Please contact support.",
              });
            }
          },
           prefill: {
            name: formData.account_holder_name || `${user.first_name} ${user.last_name}`,
            contact: user?.phone_number || "",
          },
          theme: { color: "#2563eb" },
        };

         const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      
      let errorMessage = "Something went wrong.";

      if (err.response?.data) {
        const data = err.response.data;
         if (data.detail) {
          errorMessage = data.detail;
        } else if (typeof data === "object") {
          const firstError = Object.values(data)[0];
          if (Array.isArray(firstError)) {
            errorMessage = firstError[0];
          } else if (typeof firstError === "string") {
            errorMessage = firstError;
          }
        }
      }

      setMessage({
        type: "error",
        text: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };



  return (
    <section className="bg-white">
      <div className="py-8 px-4 mx-auto max-w-screen-xl lg:py-16 lg:px-6">
        {/* Header */}
        <div className="mx-auto max-w-screen-md text-center mb-8 lg:mb-12">
          <h2 className="mb-4 text-4xl tracking-tight font-extrabold text-gray-900">
            Become a Promoter
          </h2>
          <p className="mb-5 font-light text-gray-500 sm:text-xl">
            Join our promoter program and earn commissions by promoting our products. Choose the plan that fits your needs.
          </p>
        </div>

        {/* Promoter Options */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Free Promoter */}
          <div className="flex flex-col p-8 mx-auto w-full max-w-md min-h-[550px] text-center text-gray-900 bg-white rounded-xl shadow-lg border-t-4 border-green-500 transform transition duration-300 hover:scale-105 hover:shadow-2xl">
              <h3 className="mb-4 text-4xl font-semibold">Free Promoter</h3>
              <p className="font-light text-gray-500 sm:text-lg">
                Start promoting without any cost. Great for beginners.
              </p>

              <div className="flex justify-center items-baseline my-8">
                <span className="mr-2 text-5xl font-extrabold">₹0</span>
              </div>

              <ul role="list" className="mb-8 space-y-4 text-left text-gray-700">
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✔</span>
                  <span>Access to product links</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✔</span>
                  <span>Earn commission on sales</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✔</span>
                  <span>Basic support</span>
                </li>
              </ul>

              <button
                onClick={() => handlePlanClick("unpaid")}
                className="w-full bg-gradient-to-r from-green-400 to-green-600 text-white font-semibold rounded-xl px-6 py-3 text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg active:scale-95 focus:outline-none focus:ring-4 focus:ring-green-200"
              >
                Join Free
              </button>
            </div>


          {/* Paid Promoter */}
          <div className="flex flex-col p-8 mx-auto w-full max-w-md min-h-[550px] text-center text-gray-900 bg-white rounded-xl shadow-lg border-t-4 border-yellow-500 transform transition duration-300 hover:scale-105 hover:shadow-2xl">
            <h3 className="mb-4 text-4xl font-semibold">Paid Promoter</h3>
            <p className="font-light text-gray-500 sm:text-lg">
              Get higher commission rates and exclusive benefits.
            </p>

            <div className="flex flex-col justify-center items-center my-8 relative">
              {settings ? (
                <>
                  <span className="mr-2 text-5xl font-extrabold">₹{settings.amount}</span>
                  {settings.offer_active && settings.offer_amount && (
                    <span className="text-gray-500 line-through text-xl">₹{settings.offer_amount}</span>
                  )}
                  {settings.offer_active && settings.offer_end && (
                    <p className="mt-4 inline-block px-5 py-2 rounded-full bg-red-600 text-white font-bold text-lg animate-pulse shadow-lg">
                      Offer ends in: {timeLeft}
                    </p>
                  )}
                </>
              ) : (
                <span className="text-2xl font-semibold">Loading...</span>
              )}
            </div>

            <ul role="list" className="mb-8 space-y-4 text-left text-gray-700">
              <li className="flex items-center space-x-2">
                <span className="text-green-500">✔</span>
                <span>Higher commission rates</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-green-500">✔</span>
                <span>Priority support</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-green-500">✔</span>
                <span>Access to promotional materials</span>
              </li>
            </ul>

            <button
              onClick={() => handlePlanClick("paid")}
              className="w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-white font-semibold rounded-xl px-6 py-3 text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg active:scale-95 focus:outline-none focus:ring-4 focus:ring-yellow-200"
            >
              Join Paid
            </button>
          </div>

        </div>

        {/* Form Section */}
        {showForm && (
          <div id="promoter-form-section" className="mt-10 max-w-md mx-auto bg-white p-8 rounded-2xl shadow-2xl border border-gray-100">
            <h3 className="mb-6 text-3xl font-extrabold text-center text-gray-900">
              {selectedPlan === "unpaid" ? "Free Promoter Registration" : "Premium Promoter Registration"}
            </h3>

            {message.text && (
              <p className={`mb-6 text-center font-semibold ${
                message.type === "error" ? "text-red-600" : "text-green-600"
              }`}>
                {message.text}
              </p>
            )}

            <div className="space-y-5">
              <input
                type="text"
                name="account_holder_name"
                value={formData.account_holder_name}
                onChange={handleChange}
                placeholder="Account Holder Name"
                className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
              <input
                type="text"
                name="bank_account_number"
                value={formData.bank_account_number}
                onChange={handleChange}
                placeholder="Bank Account Number"
                className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
              <input
                type="text"
                name="ifsc_code"
                value={formData.ifsc_code}
                onChange={handleChange}
                placeholder="IFSC Code"
                className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
              <input
                type="text"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleChange}
                placeholder="Bank Name"
                className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>

            <button
              onClick={handleSubmit}
              className="mt-8 w-full bg-green-600 text-white from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600  font-semibold py-3 rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-primary-300"
              disabled={loading}
            >
              {loading ? "Processing..." : "Submit"}
            </button>
          </div>
        )}

      </div>
    </section>
  );
};

export default BecomePromoterPage;
