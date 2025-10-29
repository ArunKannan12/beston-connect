import React, { useState, useEffect } from "react";
import BuyPremium from "./BuyPremium";
import axiosInstance from "../../../api/axiosinstance";

const PremiumPage = () => {
  const [showPayment, setShowPayment] = useState(false);
  const [settings, setSettings] = useState(null);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axiosInstance.get("promoter/premium-amount/");
        const data = res.data;
        setSettings(data);

        // Start countdown only if offer is active
        if (data.offer_active && data.offer_end) {
          const interval = setInterval(() => {
            const now = new Date();
            const end = new Date(data.offer_end);
            const diff = end - now;

            if (diff <= 0) {
              clearInterval(interval);
              setTimeLeft('');
            } else {
              const hours = Math.floor(diff / 1000 / 60 / 60);
              const minutes = Math.floor((diff / 1000 / 60) % 60);
              const seconds = Math.floor((diff / 1000) % 60);
              setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
            }
          }, 1000);

          return () => clearInterval(interval);
        }
      } catch (err) {
        console.error("Failed to fetch premium settings:", err);
      }
    };

    fetchSettings();
  }, []);

  if (showPayment) return <BuyPremium />;

  return (
    <section className="bg-white">
      <div className="py-8 px-4 mx-auto max-w-screen-xl lg:py-16 lg:px-6">
        {/* Header */}
        <div className="mx-auto max-w-screen-md text-center mb-8 lg:mb-12">
          <h2 className="mb-4 text-4xl tracking-tight font-extrabold text-gray-900">
            Upgrade to Premium Promoter 🚀
          </h2>
          <p className="mb-5 font-light text-gray-500 sm:text-xl">
            Get higher commission rates and exclusive benefits. Choose the plan that fits your needs.
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
          </div>

          {/* Paid Promoter */}
          <div className="flex flex-col p-8 mx-auto w-full max-w-md min-h-[550px] text-center text-gray-900 bg-white rounded-xl shadow-lg border-t-4 border-yellow-500 transform transition duration-300 hover:scale-105 hover:shadow-2xl">
            <h3 className="mb-4 text-4xl font-semibold">Premium Promoter</h3>
            <p className="font-light text-gray-500 sm:text-lg">
              Get higher commission rates and exclusive benefits.
            </p>

            <div className="flex flex-col justify-center items-center my-8 relative">
                {settings ? (
                    <>
                    <span className="mr-2 text-5xl font-extrabold">₹{settings.amount}</span>

                    {/* Show previous price only if there's an active offer */}
                    {settings.offer_active && settings.offer_amount && (
                        <span className="text-gray-500 line-through text-xl">₹{settings.offer_amount}</span>
                    )}

                    {/* Countdown removed completely if no active offer */}
                    {settings.offer_active && settings.offer_end && timeLeft && (
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
              <li className="flex items-center space-x-2">
                <span className="text-green-500">✔</span>
                <span>Featured product placement</span>
              </li>
            </ul>

            <button
              onClick={() => setShowPayment(true)}
              className="w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-white font-semibold rounded-xl px-6 py-3 text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg active:scale-95 focus:outline-none focus:ring-4 focus:ring-yellow-200"
            >
              Join Paid
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PremiumPage;
