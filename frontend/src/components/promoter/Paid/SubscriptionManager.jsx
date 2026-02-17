import { useEffect, useState } from "react";
import axiosInstance from "../../../api/axiosinstance";
import { useAuth } from "../../../contexts/authContext";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import {
    CreditCard,
    Calendar,
    Clock,
    CheckCircle2,
    AlertTriangle,
    Loader2,
    RefreshCcw,
    ShieldCheck,
    TrendingUp,
    Crown
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const SubscriptionManager = () => {
    const { user, fetchProfile } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [pricing, setPricing] = useState(null);
    const [subscription, setSubscription] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState("annual"); // 'monthly' | 'annual'

    // Fetch Subscription & Pricing Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [pricingRes, profileRes] = await Promise.all([
                    axiosInstance.get("/promoter/premium-amount/"),
                    axiosInstance.get("/promoters/me/")
                ]);

                setPricing(pricingRes.data);
                console.log(profileRes.data);

                setSubscription(profileRes.data.subscription);
            } catch (error) {
                console.log(error);
                toast.error("Failed to load subscription details.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Handle Renewal Payment
    const handleRenew = async () => {
        try {
            setSubmitting(true);

            const { data } = await axiosInstance.post("promoter/manage-subscription/", {
                plan_type: selectedPlan,
            });

            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: Number(data.amount) * 100,
                currency: "INR",
                order_id: data.razorpay_order_id,
                name: "BestOn",
                description: `Renew Premium (${selectedPlan === 'monthly' ? 'Monthly' : 'Annual'})`,
                image: "/logo.png",
                handler: async (res) => {
                    try {
                        await axiosInstance.post("/promoter/verify-subscription-payment/", {
                            razorpay_payment_id: res.razorpay_payment_id,
                            razorpay_order_id: res.razorpay_order_id,
                            razorpay_signature: res.razorpay_signature,
                            plan_type: selectedPlan,
                        });

                        toast.success("Subscription Renewed Successfully! 🎉");
                        await fetchProfile();
                        // Refresh local state
                        const profileRes = await axiosInstance.get("/promoters/me/");
                        setSubscription(profileRes.data.subscription);

                    } catch (err) {
                        console.error(err);
                        toast.error("Renewal verification failed. Please contact support.");
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
                toast.error(response.error.description || "Renewal cancelled");
            });

        } catch (err) {
            console.error(err);
            const detail = err.response?.data?.detail || "Could not initiate renewal.";
            toast.error(detail);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Loader2 className="h-10 w-10 text-purple-600 animate-spin" />
        </div>
    );

    if (!subscription) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
            Subscription data not found.
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                            <CreditCard className="w-8 h-8 text-indigo-600" />
                            Subscription Manager
                        </h1>
                        <p className="text-slate-500 mt-1">View your current plan details and manage renewals.</p>
                    </div>
                    <button
                        onClick={() => navigate('/promoter/dashboard')}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-4 py-2 rounded-lg transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </div>

                {/* Current Plan Status Card */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 relative overflow-hidden"
                >
                    {/* Background Glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100 rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/2" />

                    <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
                        <div className="space-y-6 flex-1">
                            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                {subscription.is_paid ? 'Active Premium' : 'Inactive'}
                            </div>

                            <div>
                                <p className="text-sm text-slate-500 font-semibold uppercase tracking-wider mb-1">Current Plan</p>
                                <h2 className="text-4xl font-extrabold text-slate-900 capitalize flex items-center gap-2">
                                    {subscription.plan_type} Plan
                                    <Crown className="w-6 h-6 text-amber-500 fill-amber-500" />
                                </h2>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                                        <Calendar className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase">Expires On</span>
                                    </div>
                                    <p className="text-lg font-semibold text-slate-900">
                                        {new Date(subscription.expires_at).toLocaleDateString(undefined, {
                                            year: 'numeric', month: 'long', day: 'numeric'
                                        })}
                                    </p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                                        <Clock className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase">Remaining</span>
                                    </div>
                                    <p className={`text-lg font-bold ${subscription.days_remaining < 7 ? 'text-red-600' : 'text-indigo-600'}`}>
                                        {subscription.days_remaining} Days
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Stats / Info Side */}
                        <div className="flex-1 md:border-l border-slate-100 md:pl-8 flex flex-col justify-center space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600">
                                    <ShieldCheck className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800">Secured Benefits</h4>
                                    <p className="text-sm text-slate-500 leading-relaxed">
                                        You have unlocked exclusive tracking, higher commissions, and priority support.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="bg-amber-100 p-3 rounded-xl text-amber-600">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800">Performance</h4>
                                    <p className="text-sm text-slate-500 leading-relaxed">
                                        Your referral links are active and tracking conversions in real-time.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Renewal Section */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-3xl p-8 shadow-lg border border-slate-100"
                >
                    <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <RefreshCcw className="w-6 h-6 text-slate-400" />
                        Extend Your Subscription
                    </h3>

                    {pricing ? (
                        <div className="grid md:grid-cols-2 gap-8 items-center">
                            <div className="space-y-6">
                                <p className="text-slate-600">
                                    Choose a duration to extend your current plan. The new duration will be added to your existing expiry date.
                                </p>

                                {/* Plan Toggle */}
                                <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                                    <button
                                        onClick={() => setSelectedPlan('monthly')}
                                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${selectedPlan === 'monthly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Monthly
                                    </button>
                                    <button
                                        onClick={() => setSelectedPlan('annual')}
                                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${selectedPlan === 'annual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Annual
                                        <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full">Save Big</span>
                                    </button>
                                </div>

                                <ul className="space-y-3">
                                    <li className="flex items-center text-sm text-slate-600">
                                        <CheckCircle2 className="w-5 h-5 text-green-500 mr-2" />
                                        Uninterrupted access to premium features
                                    </li>
                                    <li className="flex items-center text-sm text-slate-600">
                                        <CheckCircle2 className="w-5 h-5 text-green-500 mr-2" />
                                        Keep your existing commission rates
                                    </li>
                                </ul>
                            </div>

                            {/* Checkout Preview */}
                            <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-slate-500 font-medium">Total Amount</span>
                                    <div className="text-right">
                                        <span className="text-3xl font-black text-slate-900">
                                            ₹{selectedPlan === 'annual'
                                                ? (pricing.offer_valid_now ? pricing.offer_annual_amount : pricing.annual_amount)
                                                : (pricing.offer_valid_now ? pricing.offer_monthly_amount : pricing.monthly_amount)
                                            }
                                        </span>
                                        <p className="text-xs text-slate-500">Inclusive of taxes</p>
                                    </div>
                                </div>

                                <div className="h-px bg-indigo-200 my-4" />

                                {!subscription.is_paid && (
                                    <p className="text-[10px] text-indigo-500 mb-4 bg-indigo-100/50 px-3 py-2 rounded-lg leading-tight">
                                        💡 Tip: Once you renew, all pending commissions earned during your inactive period will be automatically credited to your wallet!
                                    </p>
                                )}

                                <button
                                    onClick={handleRenew}
                                    disabled={submitting || subscription.is_paid}
                                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2 ${(submitting || subscription.is_paid)
                                        ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                                        : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200"
                                        }`}
                                >
                                    {submitting ? <Loader2 className="animate-spin" /> : subscription.is_paid ? "Subscription Active" : "Renew Now"}
                                </button>

                                {subscription.is_paid && (
                                    <p className="text-xs text-center text-amber-600 mt-4 flex items-center justify-center gap-1 font-medium bg-amber-50 py-2 rounded-lg">
                                        <AlertTriangle className="w-3 h-3" /> You can renew once your current plan expires.
                                    </p>
                                )}

                                <p className="text-xs text-center text-indigo-400 mt-4 flex items-center justify-center gap-1">
                                    <ShieldCheck className="w-3 h-3" /> Secure Payment via Razorpay
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="h-40 flex items-center justify-center">
                            <Loader2 className="animate-spin text-slate-400" />
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default SubscriptionManager;
