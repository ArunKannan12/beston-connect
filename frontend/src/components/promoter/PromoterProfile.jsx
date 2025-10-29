import React, { useEffect, useState } from "react";
import axiosInstance from "../../api/axiosinstance.jsx";
import { toast } from "react-toastify";
import EditProfileModal from "../../components/promoter/EditProfileModal.jsx";
import { motion } from "framer-motion";
import { Wallet, Phone, CreditCard, Building2, Star, Edit3 } from "lucide-react";

const PromoterProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    phone_number: "",
    bank_account_number: "",
    ifsc_code: "",
    bank_name: "",
    account_holder_name: "",
  });

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("promoters/me/");
      setProfile(res.data);
      console.log(res.data,'data');
      
      const p = res.data.promoter_profile;
      setFormData({
        phone_number: p.phone_number || "",
        bank_account_number: p.bank_account_number || "",
        ifsc_code: p.ifsc_code || "",
        bank_name: p.bank_name || "",
        account_holder_name: p.account_holder_name || "",
      });
    } catch (error) {
      toast.error("Failed to fetch promoter profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    try {
      await axiosInstance.patch(
        `promoters/${profile.promoter_profile.id}/`,
        formData
      );
      toast.success("Profile updated successfully");
      fetchProfile();
      setIsModalOpen(false);
    } catch (error) {
      if (error.response && error.response.status === 400) {
      // Backend sent validation errors
      const backendErrors = error.response.data; // usually { field_name: ["error message"] }
      setErrors(backendErrors); // store to display inline
    } else {
      toast.error("Failed to update promoter profile");
    }
    } finally {
      setLoading(false);
    }
  };

  if (loading && !profile) return <div className="text-center py-20">Loading...</div>;
  if (!profile) return <div>No promoter profile found</div>;

  const promoter = profile.promoter_profile;

  const fadeIn = {
    hidden: { opacity: 0, y: 30 },
    visible: (i = 1) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.15, duration: 0.6, ease: "easeOut" },
    }),
  };

  return (
    <div className="min-h-[90vh] py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex justify-center items-start">
  {/* Soft glow background */}
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 0.25, scale: [1, 1.1, 1] }}
    transition={{ repeat: Infinity, duration: 6 }}
    className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/30 rounded-full blur-3xl"
  />

  {/* Profile Card */}
  <motion.div
    className="max-w-5xl w-full bg-white/20 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 p-8 sm:p-10 text-gray-900 relative z-10"
    initial={{ opacity: 0, y: 50 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8 }}
  >
    {/* Header */}
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
        <Star className="text-yellow-500" /> Promoter Profile
      </h1>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 font-semibold px-4 py-2 rounded-lg hover:shadow-lg transition"
      >
        <Edit3 size={18} /> Edit
      </motion.button>
    </div>

    {/* Profile Image & Name */}
    <div className="flex flex-col items-center mb-6 text-center">
      <img
        src={
          profile.user.social_auth_pro_pic
            ? profile.user.social_auth_pro_pic
            : profile.user.custom_user_profile
            ? profile.user.custom_user_profile
            : "https://cdn-icons-png.flaticon.com/512/149/149071.png"
        }
        alt="Profile"
        className="w-28 h-28 rounded-full border-4 border-yellow-400 shadow-md object-cover mb-4"
      />
      <h2 className="text-2xl font-bold text-gray-900">
        {profile.user.first_name} {profile.user.last_name}
      </h2>
      <p className="text-yellow-500 font-medium capitalize">{promoter.promoter_type} promoter</p>
      <p className="text-gray-700 text-sm">{profile.user.email}</p>
    </div>

    {/* Info Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* General Info */}
      <motion.div
        custom={1}
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className="bg-white/30 rounded-xl p-5 border border-white/20 hover:border-blue-400/50 transition-all"
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-yellow-500">
          <Phone /> General Info
        </h3>
        <ul className="space-y-2 text-gray-800">
          <li>
            <strong className="text-gray-900">Referral Code:</strong>{" "}
            <span className="font-mono text-yellow-500">{promoter.referral_code}</span>
          </li>
          <li>
            <strong className="text-gray-900">Promoter Type:</strong>{" "}
            <span className="capitalize">{promoter.promoter_type}</span>
          </li>
          <li>
            <strong className="text-gray-900">Phone:</strong> {promoter.phone_number || "N/A"}
          </li>
          <li>
            <strong className="text-gray-900">Premium:</strong>{" "}
            {promoter.premium_activated_at
              ? new Date(promoter.premium_activated_at).toLocaleDateString()
              : "Not Activated"}
          </li>
        </ul>
      </motion.div>

      {/* Wallet Info */}
      <motion.div
        custom={2}
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className="rounded-xl p-5 border border-white/20 bg-gradient-to-br from-blue-300 to-blue-400 hover:shadow-blue-300/50 hover:shadow-lg transition-all"
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-yellow-500">
          <Wallet /> Wallet Overview
        </h3>
        <ul className="space-y-2 text-gray-900">
          <li>
            <strong>Total Commission:</strong> ₹{promoter.total_commission_earned}
          </li>
          <li>
            <strong>Wallet Balance:</strong> ₹{promoter.wallet_balance}
          </li>
        </ul>
      </motion.div>
    </div>

    {/* Bank Info */}
    <motion.div
      custom={3}
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      className="mt-8 bg-white/30 rounded-xl p-6 border border-white/20 hover:border-blue-400/50 transition-all"
    >
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-yellow-500">
        <Building2 /> Bank Details
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-800">
        <p>
          <strong className="text-gray-900">Account Holder:</strong>{" "}
          {promoter.account_holder_name || "N/A"}
        </p>
        <p>
          <strong className="text-gray-900">Bank Name:</strong> {promoter.bank_name || "N/A"}
        </p>
        <p>
          <strong className="text-gray-900">Account Number:</strong> {promoter.bank_account_number || "N/A"}
        </p>
        <p>
          <strong className="text-gray-900">IFSC Code:</strong> {promoter.ifsc_code || "N/A"}
        </p>
      </div>
    </motion.div>
  </motion.div>

  {/* Edit Modal */}
  <EditProfileModal
    isOpen={isModalOpen}
    onClose={() => setIsModalOpen(false)}
    onSubmit={handleUpdate}
    formData={formData}
    onChange={handleChange}
    loading={loading}
    errors={errors}
  />
</div>

  );
};

export default PromoterProfile;
