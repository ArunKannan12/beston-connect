import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import dayjs from "dayjs";
import axiosInstance from "../../../api/axiosinstance";
import { toast } from "react-toastify";

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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative w-full max-w-xl md:max-w-4xl p-6 md:p-8 bg-white/80 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh]"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-black hover:text-red-500 text-3xl"
            >
              ×
            </button>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-pulse text-gray-400 text-lg">
                  Loading return details…
                </div>
              </div>
            ) : returnData ? (
              <>
                {/* Header */}
                <header className="mb-6 text-center">
                  <h2 className="text-2xl md:text-4xl font-bold text-white bg-gradient-to-r from-blue-500 to-purple-600 inline-block px-4 py-2 rounded-xl shadow-md">
                    Return #{returnData.id}
                  </h2>
                  <p className="mt-2 text-sm text-gray-700">
                    {returnData.status.replace("_", " ").toUpperCase()}
                  </p>
                </header>

                {/* Image Carousel */}
                <div className="mb-6 relative">
                  <div className="flex overflow-x-auto gap-4 py-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
                    {returnData.variant_images.map((url, i) => (
                      <motion.img
                        key={i}
                        src={url}
                        alt={`${returnData.variant} ${i + 1}`}
                        className="h-32 sm:h-40 w-32 sm:w-40 flex-shrink-0 object-cover rounded-xl shadow-lg border border-white/30 hover:scale-105 transition-transform"
                      />
                    ))}
                  </div>
                </div>

                {/* Step Tracker */}
                <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  {steps.map((step, idx) => (
                    <div key={idx} className="flex flex-col items-center relative">
                      <div
                        className={`w-10 h-10 flex items-center justify-center rounded-full text-white shadow-lg ${
                          step.state === "completed"
                            ? "bg-green-500"
                            : step.state === "current"
                            ? "bg-blue-500 animate-pulse"
                            : "bg-gray-300"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <p className="mt-2 text-xs text-gray-700 text-center">{step.label}</p>
                      {step.date && <p className="text-xs text-gray-500">{step.date}</p>}

                      {idx < steps.length - 1 && (
                        <div
                          className={`absolute top-5 left-full w-16 h-1 ${
                            step.state === "completed"
                              ? "bg-green-400"
                              : step.state === "current"
                              ? "bg-blue-400"
                              : "bg-gray-300"
                          } sm:block hidden`}
                        ></div>
                      )}
                      {idx < steps.length - 1 && (
                        <div className="w-px h-6 bg-gray-300 sm:hidden mt-2"></div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Product & Order Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner hover:shadow-xl transition-shadow">
                    <p><strong>Product:</strong> {returnData.product}</p>
                    <p><strong>Variant:</strong> {returnData.variant}</p>
                    <p><strong>Qty:</strong> {returnData.order_item.quantity}</p>
                    <p><strong>Price:</strong> ₹{returnData.order_item.price}</p>
                  </div>
                  <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner hover:shadow-xl transition-shadow">
                    <p><strong>Order ID:</strong> {returnData.order.order_number}</p>
                    <p><strong>Status:</strong> {returnData.order.status}</p>
                    <p><strong>Payment:</strong> {returnData.order.payment_method}</p>
                    <p><strong>Total:</strong> ₹{returnData.order.total}</p>
                  </div>
                </div>

                {/* Reason & Shipping */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner hover:shadow-xl transition-shadow">
                    <p><strong>Reason:</strong> {returnData.reason}</p>
                    <p><strong>Refund Amt:</strong> ₹{returnData.refund_amount}</p>
                    <p><strong>Days Left:</strong> {returnData.return_days_remaining}</p>
                  </div>
                  <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner hover:shadow-xl transition-shadow">
                    <h3 className="font-medium text-white mb-2">Shipping Address</h3>
                    <p>{returnData.shipping_address.full_name}</p>
                    <p>{returnData.shipping_address.address}, {returnData.shipping_address.locality}</p>
                    <p>{returnData.shipping_address.city} – {returnData.shipping_address.postal_code}</p>
                    <p>{returnData.shipping_address.state}, {returnData.shipping_address.country}</p>
                    <p>📞 {returnData.shipping_address.phone_number}</p>
                  </div>
                </div>

                {/* Refund Button */}
                <div className="sticky bottom-4 flex flex-col items-center gap-2">
                  <button
                    onClick={handleRefund}
                    disabled={actionLoading || !canRefund}
                    className={`px-6 py-3 rounded-2xl shadow-xl text-white transition-transform
                      ${canRefund 
                        ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:scale-105" 
                        : "bg-gray-400 cursor-not-allowed"}
                    `}
                  >
                    {actionLoading ? "Processing…" : isRefunded ? "Refunded" : "Process Refund"}
                  </button>

                  {!canRefund && (
                    <p className={`text-sm ${isRefunded ? "text-green-500" : "text-red-500"}`}>
                      {isRefunded
                        ? "Refund processed successfully."
                        : "Product has not yet reached the warehouse. Refund cannot be processed."}
                    </p>
                  )}
                </div>

              </>
            ) : (
              <p className="text-center text-gray-400 py-10">
                No return details found.
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReturnModal;
