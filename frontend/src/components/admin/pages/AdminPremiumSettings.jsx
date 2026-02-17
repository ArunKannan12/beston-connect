import React, { useEffect, useState } from "react";
import axiosInstance from "../../../api/axiosinstance";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiEdit,
  FiDollarSign,
  FiCalendar,
  FiPercent,
  FiSave,
  FiX,
  FiCheck,
  FiAlertCircle,
  FiTrendingUp,
  FiClock,
  FiTag
} from "react-icons/fi";

const AdminPremiumSettings = () => {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({
    monthly_amount: "",
    annual_amount: "",
    monthly_offer: "",
    annual_offer: "",
    offer_active: false,
    offer_start: "",
    offer_end: "",
  });

  const [editModal, setEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const today = new Date().toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM

  // ---------------------------
  // FETCH SETTINGS
  // ---------------------------
  const fetchSettings = async () => {
    setLoading(true);
    setErrors({});
    try {
      const res = await axiosInstance.get("premium-settings/");
      setData(res.data || null);
      setForm({
        monthly_amount: res.data?.monthly_amount || "",
        annual_amount: res.data?.annual_amount || "",
        monthly_offer: res.data?.monthly_offer || "",
        annual_offer: res.data?.annual_offer || "",
        offer_active: res.data?.offer_active || false,
        offer_start: res.data?.offer_start ? res.data.offer_start.slice(0, 16) : "",
        offer_end: res.data?.offer_end ? res.data.offer_end.slice(0, 16) : "",
      });
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to fetch premium settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // ---------------------------
  // INPUT CHANGE
  // ---------------------------
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  // ---------------------------
  // VALIDATION
  // ---------------------------
  const validateForm = () => {
    const newErrors = {};

    // Validate required fields
    if (!form.monthly_amount || parseFloat(form.monthly_amount) <= 0) {
      newErrors.monthly_amount = "Monthly amount is required and must be greater than 0";
    }

    if (!form.annual_amount || parseFloat(form.annual_amount) <= 0) {
      newErrors.annual_amount = "Annual amount is required and must be greater than 0";
    }

    // Validate offer logic
    if (form.offer_active) {
      if (!form.offer_start) {
        newErrors.offer_start = "Offer start time is required when offer is active";
      }
      if (!form.offer_end) {
        newErrors.offer_end = "Offer end time is required when offer is active";
      }
      if (form.offer_start && form.offer_end && form.offer_start >= form.offer_end) {
        newErrors.offer_end = "Offer end time must be after start time";
      }
    }

    // Validate offer prices
    if (form.monthly_offer && parseFloat(form.monthly_offer) >= parseFloat(form.monthly_amount)) {
      newErrors.monthly_offer = "Monthly offer must be less than regular monthly amount";
    }

    if (form.annual_offer && parseFloat(form.annual_offer) >= parseFloat(form.annual_amount)) {
      newErrors.annual_offer = "Annual offer must be less than regular annual amount";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ---------------------------
  // CREATE / UPDATE
  // ---------------------------
  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error("Please fix the validation errors");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        monthly_amount: parseFloat(form.monthly_amount),
        annual_amount: parseFloat(form.annual_amount),
        offer_active: form.offer_active,
        monthly_offer: form.monthly_offer ? parseFloat(form.monthly_offer) : null,
        annual_offer: form.annual_offer ? parseFloat(form.annual_offer) : null,
        offer_start: form.offer_active ? form.offer_start : null,
        offer_end: form.offer_active ? form.offer_end : null,
      };

      await axiosInstance.patch("premium-settings/", payload);
      toast.success("Premium settings saved successfully!");

      setEditModal(false);
      fetchSettings();
    } catch (error) {
      console.error(error);
      let msg = "Something went wrong";
      if (error.response?.data) {
        const data = error.response.data;
        if (typeof data === "string") msg = data;
        else if (data.detail) msg = data.detail;
        else if (typeof data === "object") {
          // Handle field-specific errors from API
          setErrors(data);
          msg = Object.values(data).flat().join(" ");
        }
      }
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };




  // ---------------------------
  // VIEW MODE
  // ---------------------------
  if (!editModal && data) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-white via-slate-50 to-white rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <FiDollarSign className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Premium Settings</h2>
                  <p className="text-blue-100 text-sm mt-1">Manage subscription pricing and offers</p>
                </div>
              </div>
              <motion.button
                onClick={() => setEditModal(true)}
                className="bg-white/20 hover:bg-white/30 text-white p-3 rounded-xl backdrop-blur-sm transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FiEdit size={20} />
              </motion.button>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Monthly Pricing */}
              <motion.div
                className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200/50"
                whileHover={{ y: -2 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <FiCalendar className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Monthly Plan</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Regular Price</p>
                    <p className="text-2xl font-bold text-gray-900">₹{data.monthly_amount}</p>
                  </div>
                  {data.current_monthly !== data.monthly_amount && (
                    <div>
                      <p className="text-sm text-gray-600">Current Price</p>
                      <p className="text-2xl font-bold text-green-600">₹{data.current_monthly}</p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Annual Pricing */}
              <motion.div
                className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200/50"
                whileHover={{ y: -2 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <FiTrendingUp className="w-6 h-6 text-emerald-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Annual Plan</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Regular Price</p>
                    <p className="text-2xl font-bold text-gray-900">₹{data.annual_amount}</p>
                  </div>
                  {data.current_annual !== data.annual_amount && (
                    <div>
                      <p className="text-sm text-gray-600">Current Price</p>
                      <p className="text-2xl font-bold text-green-600">₹{data.current_annual}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Offer Status */}
            <motion.div
              className={`rounded-2xl p-6 border ${
                data.offer_active
                  ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200/50'
                  : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200/50'
              }`}
              whileHover={{ y: -2 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${
                    data.offer_active ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <FiTag className={`w-5 h-5 ${
                      data.offer_active ? 'text-green-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Offer Status</h3>
                    <p className={`text-sm ${
                      data.offer_active ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {data.offer_active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
                {data.offer_active && (
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Offer Period</p>
                    <p className="text-sm font-medium text-gray-800">
                      {new Date(data.offer_start).toLocaleDateString()} - {new Date(data.offer_end).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ---------------------------
  // EDIT / CREATE MODAL
  // ---------------------------
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-slate-900/20 to-slate-800/20 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="relative w-full max-w-2xl bg-gradient-to-br from-white via-slate-50 to-white rounded-2xl shadow-2xl border border-slate-200/50 overflow-hidden max-h-[90vh]"
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-white">
            <button
              onClick={() => setEditModal(false)}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <FiX className="w-6 h-6" />
            </button>
            
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <FiDollarSign className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Premium Settings</h2>
                <p className="text-blue-100 text-sm mt-1">Configure subscription pricing and offers</p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* Pricing Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                <FiDollarSign className="w-5 h-5 text-blue-600" />
                Pricing Configuration
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Monthly Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monthly Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                    <input
                      type="number"
                      name="monthly_amount"
                      value={form.monthly_amount}
                      onChange={handleChange}
                      className={`w-full pl-8 pr-3 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        errors.monthly_amount ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="199"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  {errors.monthly_amount && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <FiAlertCircle className="w-4 h-4" />
                      {errors.monthly_amount}
                    </p>
                  )}
                </div>

                {/* Annual Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Annual Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                    <input
                      type="number"
                      name="annual_amount"
                      value={form.annual_amount}
                      onChange={handleChange}
                      className={`w-full pl-8 pr-3 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        errors.annual_amount ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="1999"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  {errors.annual_amount && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <FiAlertCircle className="w-4 h-4" />
                      {errors.annual_amount}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Offer Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <FiTag className="w-5 h-5 text-green-600" />
                  Offer Configuration
                </h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="offer_active"
                    checked={form.offer_active}
                    onChange={handleChange}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Activate Offer</span>
                </label>
              </div>

              {form.offer_active && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Monthly Offer */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Monthly Offer Price
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                        <input
                          type="number"
                          name="monthly_offer"
                          value={form.monthly_offer}
                          onChange={handleChange}
                          className={`w-full pl-8 pr-3 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                            errors.monthly_offer ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="149"
                          step="0.01"
                          min="0"
                        />
                      </div>
                      {errors.monthly_offer && (
                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <FiAlertCircle className="w-4 h-4" />
                          {errors.monthly_offer}
                        </p>
                      )}
                    </div>

                    {/* Annual Offer */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Annual Offer Price
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                        <input
                          type="number"
                          name="annual_offer"
                          value={form.annual_offer}
                          onChange={handleChange}
                          className={`w-full pl-8 pr-3 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                            errors.annual_offer ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="1499"
                          step="0.01"
                          min="0"
                        />
                      </div>
                      {errors.annual_offer && (
                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <FiAlertCircle className="w-4 h-4" />
                          {errors.annual_offer}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Offer Dates */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Offer Start */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Offer Start <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="datetime-local"
                          name="offer_start"
                          value={form.offer_start || today}
                          onChange={handleChange}
                          className={`w-full pl-10 pr-3 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                            errors.offer_start ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      {errors.offer_start && (
                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <FiAlertCircle className="w-4 h-4" />
                          {errors.offer_start}
                        </p>
                      )}
                    </div>

                    {/* Offer End */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Offer End <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="datetime-local"
                          name="offer_end"
                          value={form.offer_end || today}
                          onChange={handleChange}
                          className={`w-full pl-10 pr-3 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                            errors.offer_end ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      {errors.offer_end && (
                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <FiAlertCircle className="w-4 h-4" />
                          {errors.offer_end}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-8">
              <motion.button
                onClick={() => setEditModal(false)}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
              <motion.button
                onClick={handleSubmit}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <FiSave className="w-5 h-5" />
                    Save Settings
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AdminPremiumSettings;
