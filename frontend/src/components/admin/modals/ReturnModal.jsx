import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import dayjs from "dayjs";
import axiosInstance from "../../../api/axiosinstance";
import { toast } from "react-toastify";
import { X, Package, Truck, CheckCircle, Clock, AlertCircle, DollarSign, MapPin, Phone, Calendar, ChevronRight, Loader2 } from "lucide-react";

const TRACKING_STEPS = [
  { key: "pending", label: "Requested", dateField: "created_at" },
  { key: "pickup_scheduled", label: "Pickup Scheduled", dateField: "pickup_date" },
  { key: "in_transit", label: "In Transit", dateField: "pickup_collected_at" },
  { key: "delivered_to_warehouse", label: "Delivered to Warehouse", dateField: "delivered_back_date" },
  { key: "refunded", label: "Refunded", dateField: "refunded_at" },
];

const ReturnModal = ({ isOpen, onClose, returnId, onUpdated }) => {
  const [returnData, setReturnData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!returnId) return;

    const fetchReturnDetail = async () => {
      setLoading(true);
      try {
        const { data } = await axiosInstance.get(`/admin/returns/${returnId}/`);
        setReturnData(data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch return details.");
      } finally {
        setLoading(false);
      }
    };

    fetchReturnDetail();
  }, [returnId]);

  const handleRefund = async () => {
    if (!returnData) return;
    setActionLoading(true);
    try {
      const { data } = await axiosInstance.post(
        `/admin/returns/${returnId}/process_refund/`
      );
      toast.success(data.message || "Refund processed successfully.");
      setReturnData(prev => ({ ...prev, ...data }));
      onUpdated?.();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.detail || "Refund failed");
    } finally {
      setActionLoading(false);
    }
  };

  // Refund eligibility
  const isRefunded = returnData?.status === "refunded" || !!returnData?.refunded_at;
  const canRefund = returnData?.status === "delivered_to_warehouse" && !isRefunded;

  // Steps
  const steps = returnData
    ? TRACKING_STEPS.map((step, idx) => {
        const statusOrder = TRACKING_STEPS.map(s => s.key);
        const currentIndex = statusOrder.indexOf(returnData.status);

        return {
          ...step,
          date: returnData[step.dateField]
            ? dayjs(returnData[step.dateField]).format("DD MMM, YYYY")
            : null,
          state:
            idx < currentIndex
              ? "completed"
              : idx === currentIndex
              ? "current"
              : "pending",
        };
      })
    : [];

  const getStepIcon = (step, state) => {
    const iconClass = "w-5 h-5";
    switch (step.key) {
      case "pending": return <Clock className={iconClass} />;
      case "pickup_scheduled": return <Truck className={iconClass} />;
      case "in_transit": return <Package className={iconClass} />;
      case "delivered_to_warehouse": return <Package className={iconClass} />;
      case "refunded": return <CheckCircle className={iconClass} />;
      default: return <AlertCircle className={iconClass} />;
    }
  };

  const getStepColor = (state) => {
    switch (state) {
      case "completed": return "bg-emerald-500 border-emerald-200 text-white";
      case "current": return "bg-blue-500 border-blue-200 text-white animate-pulse";
      default: return "bg-slate-200 border-slate-300 text-slate-500";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending": return "bg-amber-50 text-amber-700 border-amber-200";
      case "pickup_scheduled": return "bg-blue-50 text-blue-700 border-blue-200";
      case "in_transit": return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "delivered_to_warehouse": return "bg-purple-50 text-purple-700 border-purple-200";
      case "refunded": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "cancelled": return "bg-slate-50 text-slate-700 border-slate-200";
      case "rejected": return "bg-red-50 text-red-700 border-red-200";
      default: return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 sm:px-8 sm:py-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl sm:text-2xl font-bold text-white">Return #{returnData?.id}</h2>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(returnData?.status)}`}>
                      {returnData?.status?.replace('_', ' ').toUpperCase()}
                    </div>
                  </div>
                  <p className="text-slate-300 text-sm">Track and manage return request details</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                  <p className="text-slate-600">Loading return details...</p>
                </div>
              ) : returnData ? (
                <div className="p-6 sm:p-8 space-y-8">
                  {/* Product Images */}
                  {returnData.variant_images?.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">Product Images</h3>
                      <div className="flex gap-3 overflow-x-auto pb-2">
                        {returnData.variant_images.map((url, i) => (
                          <motion.img
                            key={i}
                            src={url}
                            alt={`${returnData.variant} ${i + 1}`}
                            className="w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 object-cover rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                            whileHover={{ scale: 1.05 }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Progress Tracker */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-6">Return Progress</h3>
                    <div className="relative">
                      {/* Desktop: Horizontal */}
                      <div className="hidden sm:block">
                        <div className="flex items-center justify-between">
                          {steps.map((step, idx) => (
                            <div key={idx} className="flex flex-col items-center relative flex-1">
                              <div className={`w-12 h-12 flex items-center justify-center rounded-full border-2 ${getStepColor(step.state)}`}>
                                {getStepIcon(step, step.state)}
                              </div>
                              <p className="mt-3 text-sm font-medium text-slate-900 text-center">{step.label}</p>
                              {step.date && (
                                <p className="mt-1 text-xs text-slate-500">{step.date}</p>
                              )}
                              {idx < steps.length - 1 && (
                                <div className={`absolute top-6 left-full w-full h-0.5 ${step.state === "completed" ? "bg-emerald-200" : "bg-slate-200"}`}></div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Mobile: Vertical */}
                      <div className="sm:hidden space-y-4">
                        {steps.map((step, idx) => (
                          <div key={idx} className="flex items-start gap-4">
                            <div className={`w-10 h-10 flex items-center justify-center rounded-full border-2 flex-shrink-0 ${getStepColor(step.state)}`}>
                              {getStepIcon(step, step.state)}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-900">{step.label}</p>
                              {step.date && (
                                <p className="text-xs text-slate-500 mt-1">{step.date}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-slate-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5 text-slate-600" />
                        Product Details
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Product</span>
                          <span className="text-sm font-medium text-slate-900">{returnData.product}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Variant</span>
                          <span className="text-sm font-medium text-slate-900">{returnData.variant}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Quantity</span>
                          <span className="text-sm font-medium text-slate-900">{returnData.order_item.quantity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Price</span>
                          <span className="text-sm font-medium text-slate-900">₹{returnData.order_item.price}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">Order Information</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Order ID</span>
                          <span className="text-sm font-medium text-slate-900">{returnData.order.order_number}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Status</span>
                          <span className="text-sm font-medium text-slate-900">{returnData.order.status}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Payment</span>
                          <span className="text-sm font-medium text-slate-900">{returnData.order.payment_method}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Total</span>
                          <span className="text-sm font-medium text-slate-900">₹{returnData.order.total}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Return Details */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-amber-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                        Return Details
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm text-slate-600">Reason</span>
                          <p className="text-sm font-medium text-slate-900 mt-1">{returnData.reason}</p>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Refund Amount</span>
                          <span className="text-sm font-bold text-emerald-700">₹{returnData.refund_amount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Days Remaining</span>
                          <span className="text-sm font-medium text-slate-900">{returnData.return_days_remaining}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-blue-600" />
                        Shipping Address
                      </h3>
                      <div className="space-y-2 text-sm">
                        <p className="font-medium text-slate-900">{returnData.shipping_address.full_name}</p>
                        <p className="text-slate-600">{returnData.shipping_address.address}, {returnData.shipping_address.locality}</p>
                        <p className="text-slate-600">{returnData.shipping_address.city} – {returnData.shipping_address.postal_code}</p>
                        <p className="text-slate-600">{returnData.shipping_address.state}, {returnData.shipping_address.country}</p>
                        <div className="flex items-center gap-2 pt-2">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-600">{returnData.shipping_address.phone_number}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Section */}
                  <div className="bg-slate-50 rounded-xl p-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-center sm:text-left">
                        <h3 className="text-lg font-semibold text-slate-900">Refund Processing</h3>
                        <p className="text-sm text-slate-600 mt-1">
                          {isRefunded 
                            ? "Refund has been processed successfully."
                            : canRefund 
                            ? "Product has reached warehouse. Ready for refund processing."
                            : "Product must reach warehouse before refund can be processed."
                          }
                        </p>
                      </div>
                      <button
                        onClick={handleRefund}
                        disabled={actionLoading || !canRefund}
                        className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                          canRefund 
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-xl" 
                            : "bg-slate-300 text-slate-500 cursor-not-allowed"
                        }`}
                      >
                        {actionLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing...
                          </>
                        ) : isRefunded ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Refunded
                          </>
                        ) : (
                          <>
                            <DollarSign className="w-4 h-4" />
                            Process Refund
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20">
                  <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
                  <p className="text-slate-600">No return details found</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReturnModal;