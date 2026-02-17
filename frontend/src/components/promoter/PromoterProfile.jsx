import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axiosinstance.jsx";
import { toast } from "react-toastify";
import EditProfileModal from "../../components/promoter/EditProfileModal.jsx";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Wallet,
  Phone,
  CreditCard,
  Building2,
  Star,
  Edit3,
  Clipboard,
  Check,
  ChevronRight,
  TrendingUp,
  Award,
  RefreshCcw,
  Crown,
  Share2,
  Mail,
  Calendar,
  ExternalLink,
  ShieldCheck
} from "lucide-react";

const PromoterProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [bankAccount, setBankAccount] = useState(null);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    phone_number: "",
    bank_account_number: "",
    ifsc_code: "",
    bank_name: "",
    account_holder_name: "",
  });
  const navigate = useNavigate();
  const [hasBankAccount, setHasBankAccount] = useState(false);
  const [bankId, setBankId] = useState(null);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("promoters/me/");
      setProfile(res.data);
      setFormData(prev => ({
        ...prev,
        phone_number: res.data.promoter_profile.phone_number || ""
      }));
    } catch (error) {
      toast.error("Failed to fetch promoter profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchBankAccount = async () => {
    try {
      const bankRes = await axiosInstance.get("promoter/bank-account/detail/");
      setHasBankAccount(true);
      setBankId(bankRes.data.id);
      setBankAccount(bankRes.data);
      setFormData({
        account_holder_name: bankRes.data.account_holder_name || "",
        bank_account_number: bankRes.data.account_number || "",
        ifsc_code: bankRes.data.ifsc_code || "",
        bank_name: bankRes.data.bank_name || ""
      });
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setHasBankAccount(false);
        setBankAccount(null);
      } else {
        toast.error("Failed to fetch bank account");
      }
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchBankAccount();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    setErrors({});

    try {
      if (formData.phone_number !== profile.promoter_profile.phone_number) {
        await axiosInstance.patch(
          `promoters/${profile.promoter_profile.id}/`,
          { phone_number: formData.phone_number }
        );
      }

      const bankData = {
        account_holder_name: formData.account_holder_name,
        account_number: formData.bank_account_number,
        ifsc_code: formData.ifsc_code,
        bank_name: formData.bank_name
      };

      const hasBankData = Object.values(bankData).some(val => val && val.trim() !== "");

      if (hasBankData) {
        if (hasBankAccount) {
          await axiosInstance.patch("promoter/bank-account/detail/", bankData);
        } else {
          await axiosInstance.post("promoter/bank-account/", bankData);
        }
      }

      toast.success("Profile updated successfully");
      fetchProfile();
      fetchBankAccount();
      setIsModalOpen(false);
    } catch (error) {
      if (error.response && error.response.status === 400) {
        setErrors(error.response.data);
      } else {
        toast.error("Failed to update promoter profile");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(profile.promoter_profile.referral_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && !profile) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!profile) return null;

  const promoter = profile.promoter_profile;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      className="p-4 md:p-8 pt-24 min-h-screen bg-gray-50/50 pb-20"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg">
              <User size={24} />
            </span>
            Account Settings
          </h1>
          <p className="text-gray-500 mt-1">Manage your professional profile and banking preferences</p>
        </div>
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-white border border-gray-200 px-5 py-2.5 rounded-2xl shadow-sm font-bold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all"
        >
          <Edit3 size={18} />
          Edit Profile
        </motion.button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Identity Card */}
        <motion.div variants={itemVariants} className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm text-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-16 -mt-16 blur-3xl" />

            <div className="relative mx-auto w-32 h-32 mb-6">
              <div className="w-32 h-32 rounded-[2rem] p-1 bg-gradient-to-tr from-indigo-600 to-indigo-400 shadow-xl overflow-hidden">
                <img
                  src={profile.user.social_auth_pro_pic || profile.user.custom_user_profile || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                  alt="Profile"
                  className="w-full h-full rounded-[1.8rem] object-cover border-4 border-white bg-white"
                />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 w-8 h-8 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white">
                <ShieldCheck size={14} fill="currentColor" />
              </div>
            </div>

            <h2 className="text-2xl font-black text-gray-900 leading-tight">
              {profile.user.first_name} {profile.user.last_name}
            </h2>
            <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${promoter.subscription?.is_paid ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
              }`}>
              {promoter.subscription?.is_paid ? <Crown size={12} fill="currentColor" /> : <Star size={12} />}
              {promoter.promoter_type} Member
            </div>

            <div className="mt-8 space-y-4 text-left">
              <ProfileMeta icon={<Mail size={16} />} label="Email Address" value={profile.user.email} />
              <ProfileMeta icon={<Phone size={16} />} label="Contact Number" value={promoter.phone_number || "Not provided"} />
              <ProfileMeta icon={<Calendar size={16} />} label="Joined Date" value={new Date(profile.user.date_joined).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })} />
            </div>
          </div>

          {/* Referral Glance */}
          <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-200">
            <div className="flex items-center gap-2 text-indigo-200 text-xs font-bold uppercase tracking-widest mb-4">
              <Share2 size={16} /> Link Sharing
            </div>
            <p className="text-sm font-medium text-indigo-100 mb-4 opacity-80">Share your link to track referrals automatically.</p>
            <div className="flex items-center bg-white/10 rounded-2xl p-2 pl-4 border border-white/20">
              <p className="text-sm font-bold truncate flex-1 opacity-90">{promoter.referral_code}</p>
              <button
                onClick={handleCopy}
                className={`p-2 rounded-xl transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-white text-indigo-600 hover:bg-gray-100'}`}
              >
                {copied ? <Check size={18} /> : <Clipboard size={18} />}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Right: Detailed Panels */}
        <div className="lg:col-span-8 space-y-8">

          {/* Subscription Panel */}
          <motion.div variants={itemVariants} className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <Star size={24} fill="currentColor" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Subscription status</h3>
                  <p className="text-sm text-gray-500">System access level and billing</p>
                </div>
              </div>
              <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${profile.subscription?.is_paid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                {profile.subscription?.is_paid ? 'Activated' : 'Expired'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <DataBlock label="Current Plan" value={profile.subscription?.plan_type || "N/A"} subValue="Billed monthly" />
              <DataBlock label="Expires On" value={profile.subscription?.expires_at ? new Date(profile.subscription.expires_at).toLocaleDateString() : 'N/A'} subValue={profile.subscription?.days_remaining ? `${profile.subscription.days_remaining} days left` : 'Expired'} />
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate(promoter.promoter_type === 'paid' ? '/promoter/subscription-manager' : '/promoter/become-premium-promoter')}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200"
              >
                {promoter.promoter_type === 'paid' ? <><RefreshCcw size={18} /> Manage Plan</> : <><Crown size={18} fill="white" /> Upgrade to Premium</>}
              </button>
            </div>
          </motion.div>

          {/* Banking Panel */}
          <motion.div variants={itemVariants} className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Building2 size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Banking details</h3>
                <p className="text-sm text-gray-500">Destination for your earned commissions</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
              <BankItem label="Account Holder" value={bankAccount?.account_holder_name} />
              <BankItem label="Bank Name" value={bankAccount?.bank_name} />
              <BankItem label="Account Number" value={bankAccount?.account_number ? '•••• ' + bankAccount.account_number.slice(-4) : null} />
              <BankItem label="IFSC Code" value={bankAccount?.ifsc_code} />
            </div>

            {!hasBankAccount && (
              <div className="mt-8 p-6 border border-dashed border-indigo-200 bg-indigo-50/50 rounded-3xl text-center">
                <p className="text-sm text-indigo-600 font-medium mb-3">No bank account linked yet.</p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="text-indigo-600 font-bold text-sm bg-white border border-indigo-200 px-6 py-2 rounded-xl shadow-sm hover:bg-indigo-600 hover:text-white transition-all"
                >
                  Configure Now
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <EditProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleUpdate}
        formData={formData}
        onChange={handleChange}
        loading={loading}
        errors={errors}
      />
    </motion.div>
  );
};

const ProfileMeta = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 group">
    <div className="p-2 bg-gray-50 text-gray-400 rounded-xl group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
      {icon}
    </div>
    <div className="overflow-hidden">
      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-bold text-gray-900 truncate">{value}</p>
    </div>
  </div>
);

const DataBlock = ({ label, value, subValue }) => (
  <div className="p-4 bg-gray-50/50 rounded-3xl border border-gray-100">
    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
    <p className="text-lg font-bold text-gray-900">{value}</p>
    <p className="text-xs text-indigo-600 font-bold mt-1">{subValue}</p>
  </div>
);

const BankItem = ({ label, value }) => (
  <div className="relative group">
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
    <p className={`text-base font-bold ${value ? 'text-gray-900' : 'text-gray-300 italic'}`}>
      {value || 'Not configured'}
    </p>
    <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-0 bg-indigo-600 rounded-full group-hover:h-8 transition-all duration-300" />
  </div>
);

export default PromoterProfile;
