import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import dayjs from "dayjs";
import axiosInstance from "../../../api/axiosinstance";
import { toast } from "react-toastify";
import {
  Package,
  Truck,
  Warehouse,
  UserCheck,
  MapPin,
  Phone,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  X,
  ChevronRight,
  FileText,
  DollarSign,
  Home,
  User,
  Shield,
  Activity
} from "lucide-react";

const ReplacementModal = ({ isOpen, onClose, replacementId, onUpdated }) => {
  const [replacementData, setReplacementData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminComment, setAdminComment] = useState("");

  useEffect(() => {
    if (!replacementId) return;

    const fetchReplacementDetail = async () => {
      setLoading(true);
      try {
        const { data } = await axiosInstance.get(
          `/admin/replacements/${replacementId}/`
        );
        setReplacementData(data);
        setAdminComment(data.admin_comment || "");
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch replacement details.");
      } finally {
        setLoading(false);
      }
    };

    fetchReplacementDetail();
  }, [replacementId]);

  const handleAdminDecision = async (decision) => {
    if (!replacementData) return;
    if (!adminComment.trim()) {
      toast.error("Admin comment is required.");
      return;
    }
    setActionLoading(true);
    try {
      const payload = {
        admin_decision: decision,
        admin_comment: adminComment,
      };
      await axiosInstance.patch(
        `/admin/replacements/${replacementData.id}/update/`,
        payload
      );
      toast.success(`Replacement ${decision} successfully.`);
      onUpdated?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.detail || "Failed to update replacement.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryShipment = async () => {
    if (!replacementData) return;
    if (!adminComment.trim()) {
      toast.error("Admin comment is required for retry.");
      return;
    }
    setActionLoading(true);
    try {
      const payload = {
        retry_shipment: true,
        admin_comment: adminComment,
      };
      await axiosInstance.patch(
        `/admin/replacements/${replacementData.id}/update/`,
        payload
      );
      toast.success("Shipment retry initiated successfully.");
      onUpdated?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.detail || "Failed to retry shipment.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRerunRecovery = async () => {
    if (!replacementData) return;
    if (!adminComment.trim()) {
      toast.error("Admin comment is required for recovery rerun.");
      return;
    }
    setActionLoading(true);
    try {
      const payload = {
        rerun_recovery: true,
        admin_comment: adminComment,
      };
      await axiosInstance.patch(
        `/admin/replacements/${replacementData.id}/update/`,
        payload
      );
      toast.success("Recovery rerun completed successfully.");
      onUpdated?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.detail || "Failed to rerun recovery.");
    } finally {
      setActionLoading(false);
    }
  };

  // Helper functions for status icons and colors
  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'in_transit':
        return <Truck className="w-5 h-5 text-blue-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_transit':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Step tracker
  const steps = replacementData
    ? [
        {
          label: "Requested",
          icon: <FileText className="w-5 h-5" />,
          completed: true,
          current: true,
        },
        {
          label: "Admin Review",
          icon: <UserCheck className="w-5 h-5" />,
          completed: replacementData.admin_decision?.toLowerCase() !== "pending",
          current: replacementData.admin_decision?.toLowerCase() !== "pending" && replacementData.status === "pending",
        },
        {
          label: "Shipment",
          icon: <Truck className="w-5 h-5" />,
          completed: ["approved", "scheduled", "in_transit", "completed"].includes(replacementData.status?.toLowerCase()),
          current: ["approved", "scheduled", "in_transit"].includes(replacementData.status?.toLowerCase()),
        },
        {
          label: "Completed",
          icon: <CheckCircle className="w-5 h-5" />,
          completed: replacementData.status?.toLowerCase() === "completed",
          current: replacementData.status?.toLowerCase() === "completed",
        },
      ]
    : [];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-slate-900/20 to-slate-800/20 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative w-full max-w-6xl bg-gradient-to-br from-white via-slate-50 to-white rounded-3xl shadow-2xl border border-slate-200/50 overflow-hidden max-h-[90vh]"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
          >
            {/* Header */}
            <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-white">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Package className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white">Replacement Details</h2>
                  <p className="text-blue-100 text-sm mt-1">
                    Request ID: #{replacementData?.id} • {replacementData?.product}
                  </p>
                </div>
                <div className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${getStatusColor(replacementData?.status)}`}>
                  {getStatusIcon(replacementData?.status)}
                  {replacementData?.status}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-500 animate-pulse">Loading replacement details...</p>
              </div>
            ) : replacementData ? (
              <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
                {/* Step Tracker */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    Replacement Progress
                  </h3>
                  <div className="relative">
                    <div className="absolute top-8 left-8 right-8 h-1 bg-gray-200 rounded-full"></div>
                    <div 
                      className="absolute top-8 left-8 h-1 bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500"
                      style={{ width: `${(steps.filter(s => s.completed).length / steps.length) * 100}%` }}
                    ></div>
                    <div className="relative flex justify-between">
                      {steps.map((step, idx) => (
                        <div key={idx} className="flex flex-col items-center">
                          <motion.div
                            className={`w-16 h-16 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${
                              step.completed 
                                ? 'bg-gradient-to-br from-green-400 to-green-600 border-green-200 shadow-lg' 
                                : step.current
                                ? 'bg-gradient-to-br from-blue-400 to-blue-600 border-blue-200 shadow-lg animate-pulse'
                                : 'bg-gray-100 border-gray-200'
                            }`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <div className={step.completed || step.current ? 'text-white' : 'text-gray-400'}>
                              {step.icon}
                            </div>
                          </motion.div>
                          <span className="mt-3 text-sm font-medium text-gray-700 text-center">{step.label}</span>
                          {step.completed && (
                            <CheckCircle className="w-4 h-4 text-green-500 mt-1" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Image Carousel */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    Product Images
                  </h3>
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {replacementData.variant_images?.map((img, i) => (
                      <motion.div
                        key={i}
                        className="flex-shrink-0 relative group"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <img
                          src={img}
                          alt={`${replacementData.variant} ${i + 1}`}
                          className="w-32 h-32 sm:w-40 sm:h-40 rounded-xl object-cover border-2 border-gray-200 group:border-blue-400 transition-colors shadow-lg"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-xl transition-colors"></div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Info Cards Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {/* Product Info Card */}
                  <motion.div
                    className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200/50 shadow-lg"
                    whileHover={{ y: -2 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Package className="w-5 h-5 text-blue-600" />
                      Product Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Product</span>
                        <span className="font-medium text-gray-900">{replacementData.product}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Variant</span>
                        <span className="font-medium text-gray-900">{replacementData.variant}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Quantity</span>
                        <span className="font-medium text-gray-900">{replacementData.order_item?.quantity}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Price</span>
                        <span className="font-medium text-gray-900">₹{replacementData.order_item?.price}</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Order Info Card */}
                  <motion.div
                    className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200/50 shadow-lg"
                    whileHover={{ y: -2 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-emerald-600" />
                      Order Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Order ID</span>
                        <span className="font-medium text-gray-900">#{replacementData.order?.id}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Status</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(replacementData.order?.status)}`}>
                          {replacementData.order?.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Payment</span>
                        <span className="font-medium text-gray-900">{replacementData.order?.payment_method}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total</span>
                        <span className="font-medium text-gray-900">₹{replacementData.order?.total}</span>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Replacement Status Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {/* Admin Decision Card */}
                  <motion.div
                    className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200/50 shadow-lg"
                    whileHover={{ y: -2 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-purple-600" />
                      Admin Decision
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(replacementData.admin_decision)}
                        <span className="font-medium text-gray-900">{replacementData.admin_decision || "Pending"}</span>
                      </div>
                      {replacementData.admin_comment && (
                        <div className="text-sm text-gray-600">
                          <p><strong>Comment:</strong> {replacementData.admin_comment}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* Shipment Status Card */}
                  <motion.div
                    className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-200/50 shadow-lg"
                    whileHover={{ y: -2 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Truck className="w-5 h-5 text-orange-600" />
                      Shipment Status
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(replacementData.status)}
                        <span className="font-medium text-gray-900">{replacementData.status}</span>
                      </div>
                      {replacementData.waybill && (
                        <div className="text-sm text-gray-600">
                          <p><strong>Waybill:</strong> {replacementData.waybill}</p>
                        </div>
                      )}
                      {replacementData.delhivery_status && (
                        <div className="text-sm text-gray-600">
                          <p><strong>Carrier Status:</strong> {replacementData.delhivery_status}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* Additional Information */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {/* Request Details */}
                  <motion.div
                    className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl p-6 border border-slate-200/50 shadow-lg"
                    whileHover={{ y: -2 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-slate-600" />
                      Request Details
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Created</span>
                        <span className="font-medium text-gray-900">{dayjs(replacementData.created_at).format("MMM DD, YYYY")}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Last Updated</span>
                        <span className="font-medium text-gray-900">{dayjs(replacementData.updated_at).format("MMM DD, YYYY")}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Days Remaining</span>
                        <span className="font-medium text-gray-900">{replacementData.replacement_days_remaining || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Eligible</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          replacementData.is_replacement_eligible 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {replacementData.is_replacement_eligible ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Policy Information */}
                  <motion.div
                    className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-6 border border-teal-200/50 shadow-lg"
                    whileHover={{ y: -2 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-teal-600" />
                      Policy Information
                    </h3>
                    <div className="space-y-3">
                      {replacementData.variant_policy_snapshot && (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Replacement Allowed</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              replacementData.variant_policy_snapshot.allow_replacement 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {replacementData.variant_policy_snapshot.allow_replacement ? 'Yes' : 'No'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Replacement Days</span>
                            <span className="font-medium text-gray-900">{replacementData.variant_policy_snapshot.replacement_days || 0}</span>
                          </div>
                        </>
                      )}
                      {replacementData.replacement_charge && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Replacement Charge</span>
                          <span className="font-medium text-gray-900">₹{replacementData.replacement_charge}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* Shipping Address */}
                <motion.div
                  className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl p-6 border border-slate-200/50 shadow-lg mb-8"
                  whileHover={{ y: -2 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-slate-600" />
                    Shipping Address
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-gray-700">
                        <User className="w-4 h-4" />
                        <span className="font-medium">{replacementData.shipping_address?.full_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <Home className="w-4 h-4" />
                        <span>{replacementData.shipping_address?.address}, {replacementData.shipping_address?.locality}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-gray-700">
                        <MapPin className="w-4 h-4" />
                        <span>{replacementData.shipping_address?.city} – {replacementData.shipping_address?.postal_code}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <Phone className="w-4 h-4" />
                        <span>{replacementData.shipping_address?.phone_number}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Admin Action Section */}
                {replacementData.admin_decision?.toLowerCase() === "pending" && (
                  <motion.div
                    className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200 shadow-lg"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-blue-600" />
                      Admin Action Required
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Admin Comment <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={adminComment}
                          onChange={(e) => setAdminComment(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
                          placeholder="Enter your admin comment..."
                          rows={4}
                        />
                      </div>
                      <div className="flex gap-3">
                        <motion.button
                          onClick={() => handleAdminDecision("approved")}
                          disabled={actionLoading}
                          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {actionLoading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          ) : (
                            <>
                              <CheckCircle className="w-5 h-5" />
                              Approve Replacement
                            </>
                          )}
                        </motion.button>
                        <motion.button
                          onClick={() => handleAdminDecision("rejected")}
                          disabled={actionLoading}
                          className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 text-white px-6 py-3 rounded-xl font-medium hover:from-red-600 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {actionLoading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          ) : (
                            <>
                              <XCircle className="w-5 h-5" />
                              Reject Replacement
                            </>
                          )}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Additional Actions Section */}
                {replacementData.admin_decision?.toLowerCase() === "approved" && (
                  <motion.div
                    className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border-2 border-amber-200 shadow-lg"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-amber-600" />
                      Additional Actions
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Admin Comment <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={adminComment}
                          onChange={(e) => setAdminComment(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none transition-all"
                          placeholder="Enter your admin comment..."
                          rows={3}
                        />
                      </div>
                      
                      {/* Retry Shipment Button */}
                      {replacementData.status?.toLowerCase() === "failed" && (
                        <motion.button
                          onClick={handleRetryShipment}
                          disabled={actionLoading}
                          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {actionLoading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          ) : (
                            <>
                              <Truck className="w-5 h-5" />
                              Retry Failed Shipment
                            </>
                          )}
                        </motion.button>
                      )}

                      {/* Rerun Recovery Button */}
                      {replacementData.status?.toLowerCase() === "approved" && replacementData.new_order && (
                        <motion.button
                          onClick={handleRerunRecovery}
                          disabled={actionLoading}
                          className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {actionLoading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          ) : (
                            <>
                              <DollarSign className="w-5 h-5" />
                              Rerun Recovery
                            </>
                          )}
                        </motion.button>
                      )}

                      {/* Status Info */}
                      <div className="text-sm text-gray-600 bg-white/50 rounded-lg p-3">
                        <p className="font-medium mb-1">Available Actions:</p>
                        <ul className="space-y-1 text-xs">
                          {replacementData.status?.toLowerCase() === "failed" && (
                            <li>• <strong>Retry Shipment:</strong> Create new Delhivery shipment for failed replacement</li>
                          )}
                          {replacementData.status?.toLowerCase() === "approved" && replacementData.new_order && (
                            <li>• <strong>Rerun Recovery:</strong> Recalculate and update recovery account charges</li>
                          )}
                          {replacementData.status?.toLowerCase() === "approved" && !replacementData.new_order && (
                            <li>• <strong>No Recovery:</strong> Replacement order not yet created</li>
                          )}
                          {["completed", "cancelled"].includes(replacementData.status?.toLowerCase()) && (
                            <li>• <strong>No Actions:</strong> Replacement is {replacementData.status?.toLowerCase()}</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <AlertCircle className="w-16 h-16 mb-4 text-gray-300" />
                <p className="text-lg font-medium">No replacement details found</p>
                <p className="text-sm mt-2">Please check the replacement ID and try again</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReplacementModal;
