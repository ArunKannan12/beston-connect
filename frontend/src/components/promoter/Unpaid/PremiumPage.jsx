import React, { useState, useEffect } from "react";
import BuyPremium from "./BuyPremium";
import axiosInstance from "../../../api/axiosinstance";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  CheckCircle2,
  Star,
  ShieldCheck,
  TrendingUp,
  Loader2,
  IndianRupee
} from "lucide-react";

const PremiumPage = () => {
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("monthly");
  const [settings, setSettings] = useState(null);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
  let interval = null;

  const fetchSettings = async () => {
    try {
      const res = await axiosInstance.get("promoter/premium-amount/");
      const data = res.data;
      setSettings(data);

      if (data.offer_active && data.offer_end) {
        interval = setInterval(() => {
          const now = new Date();
          const end = new Date(data.offer_end);
          const diff = end - now;

          if (diff <= 0) {
            clearInterval(interval);
            setTimeLeft("");
            return;
          }

          const totalSeconds = Math.floor(diff / 1000);
          const totalMinutes = Math.floor(totalSeconds / 60);
          const totalHours = Math.floor(totalMinutes / 60);
          const days = Math.floor(totalHours / 24);

          const hours = totalHours % 24;
          const minutes = totalMinutes % 60;
          const seconds = totalSeconds % 60;

          // 🔥 UI logic
          if (totalHours >= 12) {
            setTimeLeft(`${days} day${days !== 1 ? "s" : ""}`);
          } else if (totalHours >= 1) {
            setTimeLeft(`${hours}h ${minutes}m`);
          } else {
            setTimeLeft(`${minutes}m ${seconds}s`);
          }
        }, 1000);
      }
    } catch (err) {
      console.error("Failed to fetch premium settings:", err);
    }
  };

  fetchSettings();

  // ✅ proper cleanup
  return () => {
    if (interval) clearInterval(interval);
  };
}, []);


  const handleUpgrade = (planType) => {
    setSelectedPlan(planType);
    setShowPayment(true);
  };

  if (showPayment) return <BuyPremium selectedPlan={selectedPlan} />;

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans text-slate-800">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 skew-y-[-3deg] transform origin-top-left translate-y-[-50px] z-0" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-20">

        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16 text-white"
        >
          <div className="inline-flex items-center justify-center p-2 px-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6 text-sm font-medium tracking-wide">
            <Star className="w-4 h-4 text-yellow-300 mr-2 fill-yellow-300" />
            Upgrade to Premium Promoter
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            Unlock Your <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-amber-400">
              Premium Potential
            </span>
          </h1>
          <p className="text-lg md:text-xl text-indigo-100 max-w-2xl mx-auto leading-relaxed">
            Get higher commission rates, advanced analytics, and exclusive tools to accelerate your earning potential.
          </p>
        </motion.div>

        {/* Pricing Cards Container - Only Premium Plans */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 max-w-5xl mx-auto">

          {/* MONTHLY PREMIUM CARD */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => setSelectedPlan("monthly")}
            className={`group relative rounded-3xl p-1 bg-gradient-to-b from-blue-400 to-indigo-600 cursor-pointer shadow-2xl transition-all duration-300
              ${selectedPlan === "monthly" ? "scale-105 z-20 ring-4 ring-blue-100" : "scale-100 opacity-90 hover:opacity-100 hover:scale-[1.02]"}
            `}
          >
            <div className="bg-white rounded-[20px] p-8 h-full relative overflow-hidden">
              {/* Background glow inside card */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2" />

              <div className="text-center relative z-10 mb-6">
                <h3 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600">Premium Monthly</h3>
                <p className="mt-2 text-sm text-indigo-900/60 font-medium">Flexible monthly billing</p>
              </div>

              {/* Price Display */}
              <div className="text-center mb-8 relative z-10">
                {settings ? (
                  <div className="flex flex-col items-center justify-center h-20">
                    <div className="flex items-center gap-2">
                      <span className="text-5xl font-black text-slate-900 tracking-tight">
                        ₹{settings.current_monthly_amount}
                      </span>
                      <span className="text-slate-400 font-medium text-lg mt-4">/mo</span>
                    </div>
                    
                    {settings.offer_valid_now && settings.offer_monthly_amount && settings.offer_monthly_amount !== settings.current_monthly_amount && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-slate-400 line-through decoration-red-500 decoration-2 text-sm">₹{settings.monthly_amount}</span>
                        <span className="text-red-500 font-bold text-xs bg-red-50 px-2 py-0.5 rounded-full">
                          Save {Math.round(100 - (parseInt(settings.offer_monthly_amount) / parseInt(settings.monthly_amount)) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-20 flex items-center justify-center">
                    <div className="w-32 h-8 bg-slate-200 rounded animate-pulse" />
                  </div>
                )}
              </div>

              {/* Features List */}
              <div className="space-y-4 mb-10 relative z-10">
                {[
                  "Higher commission rates",
                  "Advanced analytics dashboard", 
                  "Priority support",
                  "Wallet & withdrawals",
                  "Promotional materials"
                ].map((item, i) => (
                  <div key={i} className="flex items-start text-sm text-slate-700 font-medium">
                    <div className="mt-0.5 mr-3 p-0.5 bg-blue-100 rounded-full">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    </div>
                    {item}
                  </div>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={(e) => { e.stopPropagation(); handleUpgrade("monthly"); }}
                disabled={!settings}
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-xl shadow-blue-200 transition-all
                  ${selectedPlan === "monthly" 
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white" 
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }
                `}
              >
                {settings ? (
                  <span className="flex items-center justify-center gap-2">
                    Choose Monthly <TrendingUp className="w-5 h-5" />
                  </span>
                ) : (
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                )}
              </motion.button>
            </div>
          </motion.div>

          {/* ANNUAL PREMIUM CARD */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => setSelectedPlan("annual")}
            className={`group relative rounded-3xl p-1 bg-gradient-to-b from-amber-300 to-purple-600 cursor-pointer shadow-2xl transition-all duration-300
              ${selectedPlan === "annual" ? "scale-105 z-20 ring-4 ring-purple-100" : "scale-100 opacity-90 hover:opacity-100 hover:scale-[1.02]"}
            `}
          >
            {/* Recommended Badge */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white font-extrabold px-6 py-1.5 rounded-full text-xs uppercase tracking-wider shadow-lg flex items-center gap-1 z-30">
              <Crown className="w-3 h-3 fill-white" /> Recommended
            </div>

            <div className="bg-white rounded-[20px] p-8 h-full relative overflow-hidden">
              {/* Background glow inside card */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-100 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2" />

              <div className="text-center relative z-10 mb-6">
                <h3 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-indigo-600">Premium Annual</h3>
                <p className="mt-2 text-sm text-indigo-900/60 font-medium">Best value - Save big</p>
              </div>

              {/* Price Display */}
              <div className="text-center mb-8 relative z-10">
                {settings ? (
                  <div className="flex flex-col items-center justify-center h-20">
                    <div className="flex items-center gap-2">
                      <span className="text-5xl font-black text-slate-900 tracking-tight">
                        ₹{settings.current_annual_amount}
                      </span>
                      <span className="text-slate-400 font-medium text-lg mt-4">/year</span>
                    </div>
                    
                    {settings.annual_savings && settings.annual_savings !== "0" && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-green-600 font-bold text-sm bg-green-50 px-2 py-0.5 rounded-full">
                          Save ₹{settings.annual_savings} vs monthly!
                        </span>
                      </div>
                    )}
                    
                    {settings.offer_valid_now && settings.offer_annual_amount && settings.offer_annual_amount !== settings.current_annual_amount && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-slate-400 line-through decoration-red-500 decoration-2 text-sm">₹{settings.annual_amount}</span>
                        <span className="text-red-500 font-bold text-xs bg-red-50 px-2 py-0.5 rounded-full">
                          Save {Math.round(100 - (parseInt(settings.offer_annual_amount) / parseInt(settings.annual_amount)) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-20 flex items-center justify-center">
                    <div className="w-32 h-8 bg-slate-200 rounded animate-pulse" />
                  </div>
                )}
              </div>

              {/* Countdown Timer Widget */}
              <AnimatePresence>
                {settings?.offer_valid_now && timeLeft && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-8"
                  >
                    <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-center">
                      <p className="text-red-600 text-xs font-bold uppercase tracking-wide mb-1">Offer Ends In</p>
                      <p className={`font-mono font-bold text-lg ${
                          timeLeft.includes("m") && !timeLeft.includes("h")
                            ? "text-red-600 animate-pulse"
                            : "text-slate-900"
                        }`}>
                          {timeLeft}
                        </p>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Features List */}
              <div className="space-y-4 mb-10 relative z-10">
                {[
                  "Everything in Monthly",
                  "Maximum commission rates",
                  "VIP support",
                  "Featured placement",
                  "Exclusive tools"
                ].map((item, i) => (
                  <div key={i} className="flex items-start text-sm text-slate-700 font-medium">
                    <div className="mt-0.5 mr-3 p-0.5 bg-yellow-100 rounded-full">
                      <CheckCircle2 className="w-4 h-4 text-amber-600" />
                    </div>
                    {item}
                  </div>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={(e) => { e.stopPropagation(); handleUpgrade("annual"); }}
                disabled={!settings}
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-xl shadow-purple-200 transition-all
                  ${selectedPlan === "annual" 
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white" 
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }
                `}
              >
                {settings ? (
                  <span className="flex items-center justify-center gap-2">
                    Choose Annual <TrendingUp className="w-5 h-5" />
                  </span>
                ) : (
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                )}
              </motion.button>
            </div>
          </motion.div>

        </div>

        {/* Info Grid Section */}
        <div className="mt-24 grid md:grid-cols-3 gap-8 text-center max-w-5xl mx-auto">
          <div className="p-6">
            <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h4 className="font-bold text-lg text-slate-800 mb-2">Secure Payments</h4>
            <p className="text-slate-500 text-sm">Automated monthly payouts directly to your bank account.</p>
          </div>
          <div className="p-6">
            <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-purple-600">
              <TrendingUp className="w-8 h-8" />
            </div>
            <h4 className="font-bold text-lg text-slate-800 mb-2">Real-Time Tracking</h4>
            <p className="text-slate-500 text-sm">Monitor clicks, conversions and earnings in real-time.</p>
          </div>
          <div className="p-6">
            <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-600">
              <Star className="w-8 h-8" />
            </div>
            <h4 className="font-bold text-lg text-slate-800 mb-2">Dedicated Support</h4>
            <p className="text-slate-500 text-sm">Our team is here to help you maximize your success.</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PremiumPage;
