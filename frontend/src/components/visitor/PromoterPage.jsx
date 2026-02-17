import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axiosInstance from "../../api/axiosinstance";
import { useAuth } from "../../contexts/authContext";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  Crown,
  Zap,
  IndianRupee,
  Loader2,
  CheckCircle2,
  Star,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

const BecomePromoterPage = () => {
  const { user, fetchProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  const [tier, setTier] = useState("paid"); // Default to paid for conversion emphasis
  const [plan, setPlan] = useState("annual"); // Default to annual
  const [pricing, setPricing] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  const isBlocked =
    user?.role === "admin" || user?.roles?.includes("promoter");

  /* ---------------- Referral ---------------- */
  useEffect(() => {
    const ref = new URLSearchParams(location.search).get("ref");
    if (ref) localStorage.setItem("referral_code", ref);
  }, [location]);

  /* ---------------- Pricing ---------------- */
  useEffect(() => {
    const loadPricing = async () => {
      try {
        const res = await axiosInstance.get("/promoter/premium-amount/");
        setPricing(res.data);
      } catch {
        toast.error("Failed to load pricing");
      } finally {
        setLoading(false);
      }
    };
    loadPricing();
  }, []);

  /* ---------------- Offer countdown ---------------- */
  useEffect(() => {
    if (!pricing?.offer_valid_now || !pricing?.offer_end) {
      setTimeLeft(null);
      return;
    }

    const end = new Date(pricing.offer_end).getTime();
    const updateTime = () => {
      const diff = end - Date.now();
      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };

    const i = setInterval(updateTime, 1000);
    updateTime();

    return () => clearInterval(i);
  }, [pricing]);

  /* ---------------- Actions ---------------- */
  const joinFree = async () => {
    try {
      setSubmitting(true);
      const referral_code = localStorage.getItem("referral_code");
      await axiosInstance.post("/promoters/", referral_code ? { referral_code } : {});
      toast.success("Welcome aboard! Registered as Free Promoter");
      localStorage.removeItem("referral_code");
      await fetchProfile();
      navigate("/promoter/dashboard");
    } catch {
      toast.error("Failed to join. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const joinPremium = async () => {
    try {
      setProcessingPayment(true);
      const referral_code = localStorage.getItem("referral_code");

      const { data } = await axiosInstance.post("/promoter/become-premium/", {
        plan_type: plan,
        referral_code,
      });

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: Number(data.amount) * 100,
        currency: "INR",
        order_id: data.razorpay_order_id,
        name: "BestOn",
        description: `Premium Promoter Membership (${plan === 'monthly' ? 'Monthly' : 'Annual'})`,
        image: "/logo.png", // Ensure you have a logo path if available
        handler: async (res) => {
          try {
            await axiosInstance.post("/promoter/verify-premium-payment/", {
              razorpay_payment_id: res.razorpay_payment_id,
              razorpay_order_id: res.razorpay_order_id,
              razorpay_signature: res.razorpay_signature,
              plan_type: plan,
              referral_code,
              amount: data.amount,
            });

            toast.success("🎉 Payment Successful! Welcome to Premium.");
            localStorage.removeItem("referral_code");
            await fetchProfile();
            navigate("/promoter/dashboard");
          } catch (err) {
            console.error(err);
            toast.error("Verification failed. Contact support if amount deducted.");
          }
        },
        prefill: {
          name: `${user.first_name} ${user.last_name}`,
          email: user.email,
          contact: user.phone_number
        },
        theme: { color: "#7c3aed" },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
      razorpay.on('payment.failed', function (response) {
        toast.error(response.error.description || "Payment cancelled");
      });

    } catch (err) {
      console.error(err);
      toast.error("Could not initiate payment.");
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading || isBlocked) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="h-10 w-10 text-purple-600 animate-spin" />
    </div>
  );

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
            Join the Elite Promoter Network
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            Turn Your Influence <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-amber-400">
              Into Real Earnings
            </span>
          </h1>
          <p className="text-lg md:text-xl text-indigo-100 max-w-2xl mx-auto leading-relaxed">
            Promote world-class products and earn unmatched commissions.
            Choose the plan that fits your ambition.
          </p>
        </motion.div>

        {/* Pricing Cards Container */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 max-w-5xl mx-auto">

          {/* FREE TIER CARD */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => setTier("unpaid")}
            className={`group relative rounded-3xl p-8 cursor-pointer transition-all duration-300 border-2 bg-white shadow-xl
              ${tier === "unpaid"
                ? "border-slate-300 ring-4 ring-slate-200 scale-100 md:scale-[0.98] lg:scale-100 z-10"
                : "border-transparent opacity-80 hover:opacity-100 hover:scale-[1.01]"}
            `}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-100 border border-slate-200 text-slate-500 font-bold px-4 py-1 rounded-full text-xs uppercase tracking-wider shadow-sm">
              Starter
            </div>

            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-slate-700">Free Partner</h3>
              <div className="mt-4 flex items-center justify-center gap-1 text-slate-900">
                <span className="text-4xl font-bold">₹0</span>
                <span className="text-slate-400 font-medium">/ lifetime</span>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                Perfect for those just starting out.
              </p>
            </div>

            <div className="space-y-4 mb-8">
              {[
                "Limited product selection",
                "Standard commission rates",
                "Basic analytics dashboard",
                "Community support"
              ].map((item, i) => (
                <div key={i} className="flex items-center text-sm text-slate-600">
                  <CheckCircle2 className="w-5 h-5 text-indigo-500 mr-3 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); setTier("unpaid"); joinFree(); }}
              disabled={submitting}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all
                  ${tier === "unpaid" ? "bg-slate-900 text-white hover:bg-slate-800 shadow-lg" : "bg-slate-100 text-slate-600"}
                `}
            >
              {submitting ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "Join for Free"}
            </button>
          </motion.div>


          {/* PREMIUM TIER CARD */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => setTier("paid")}
            className={`group relative rounded-3xl p-1 bg-gradient-to-b from-amber-300 to-purple-600 cursor-pointer shadow-2xl transition-all duration-300
              ${tier === "paid" ? "scale-105 z-20 ring-4 ring-purple-100" : "scale-100 opacity-90 hover:opacity-100 hover:scale-[1.02]"}
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
                <h3 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-indigo-600">Premium Pro</h3>
                <p className="mt-2 text-sm text-indigo-900/60 font-medium">Unlock Unlimited Potential</p>
              </div>

              {/* Pricing Toggle */}
              {pricing && (
                <div className="bg-slate-100 p-1 rounded-xl flex mb-8 relative z-10">
                  <button
                    onClick={(e) => { e.stopPropagation(); setPlan("monthly"); }}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${plan === "monthly" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setPlan("annual"); }}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${plan === "annual" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    Annual
                    <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full">Save Big</span>
                  </button>
                </div>
              )}

              {/* Dynamic Price Display */}
              <div className="text-center mb-8 relative z-10">
                {pricing ? (
                  <div className="flex flex-col items-center justify-center h-20">
                    {(() => {
                      const isAnnual = plan === "annual";
                      const basePrice = isAnnual ? pricing.annual_amount : pricing.monthly_amount;
                      const offerPrice = isAnnual ? pricing.offer_annual_amount : pricing.offer_monthly_amount;
                      const showOffer = pricing.offer_valid_now && offerPrice;

                      return (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-5xl font-black text-slate-900 tracking-tight">
                              ₹
                              {showOffer ? String(offerPrice).split('.')[0] : String(basePrice).split('.')[0]}
                            </span>
                            <span className="text-slate-400 font-medium text-lg mt-4">/{isAnnual ? 'year' : 'mo'}</span>
                          </div>

                          {showOffer ? (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-slate-400 line-through decoration-red-500 decoration-2 text-sm">₹{basePrice}</span>
                              <span className="text-red-500 font-bold text-xs bg-red-50 px-2 py-0.5 rounded-full">Save {(100 - (offerPrice / basePrice) * 100).toFixed(0)}%</span>
                            </div>
                          ) : (
                            isAnnual && pricing.main_annual_savings > 0 && (
                              <span className="text-green-600 font-bold text-sm bg-green-50 px-2 py-0.5 rounded-full mt-1">
                                Active Annual Savings
                              </span>
                            )
                          )}
                        </>
                      )
                    })()}
                  </div>
                ) : (
                  <div className="h-20 flex items-center justify-center">
                    <div className="w-32 h-8 bg-slate-200 rounded animate-pulse" />
                  </div>
                )}
              </div>

              {/* Countdown Timer Widget */}
              <AnimatePresence>
                {pricing?.offer_valid_now && timeLeft && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-8"
                  >
                    <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-center">
                      <p className="text-red-600 text-xs font-bold uppercase tracking-wide mb-1">Offer Ends In</p>
                      <p className="text-slate-900 font-mono font-bold text-lg">{timeLeft}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Features List */}
              <div className="space-y-4 mb-10 relative z-10">
                {[
                  "Unlimited Access to All Products",
                  "Highest Commission Tiers (Up to 15%)",
                  "Priority 24/7 Support",
                  "Early Access to New Launches",
                  "Smart Analytics & Insights"
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
                onClick={(e) => { e.stopPropagation(); setTier("paid"); joinPremium(); }}
                disabled={processingPayment}
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-xl shadow-purple-200 transition-all text-white
                        bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700
                    `}
              >
                {processingPayment ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Processing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Get Started Now <TrendingUp className="w-5 h-5" />
                  </span>
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

export default BecomePromoterPage;
