import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import dayjs from "dayjs";
import axiosInstance from "../../../api/axiosinstance";
import { toast } from "react-toastify";

const ReturnModal = ({ isOpen, onClose, returnId, onUpdated }) => {
  const [returnData, setReturnData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!returnId) return;

    const fetchReturnDetail = async () => {
      setLoading(true);
      try {
        const { data } = await axiosInstance.get(
          `/admin/returns/${returnId}/`
        );
        setReturnData(data);
        console.log(data,data);
        
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
      const payload = {
        admin_decision: "approved",
        admin_comment: returnData.admin_comment || "",
        refund_amount: returnData.refund_amount,
        user_upi: returnData.user_upi || "",
      };
      const { data } = await axiosInstance.put(
        `/admin/returns/${returnId}/update/`,
        payload
      );
      toast.success("Refund processed successfully.");
      setReturnData(data);
      onUpdated?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.detail || "Refund failed");
    } finally {
      setActionLoading(false);
    }
  };

  // build stepper based on actual timestamps/statuses
  const steps = returnData
    ? [
        {
          label: "Requested",
          date: dayjs(returnData.created_at).format("DD MMM, YYYY"),
          completed: true,
        },
        {
          label: "Pickup",
          date: returnData.pickup_collected_at
            ? dayjs(returnData.pickup_collected_at).format("DD MMM, YYYY")
            : null,
          completed:
            returnData.pickup_status_display.toLowerCase() !== "pending",
        },
        {
          label: "Warehouse",
          date: returnData.warehouse_processed_at
            ? dayjs(returnData.warehouse_processed_at).format("DD MMM, YYYY")
            : null,
          completed:
            returnData.warehouse_status_display.toLowerCase() !== "pending",
        },
        {
          label: "Refunded",
          date: returnData.refunded_at_human,
          completed: returnData.is_refunded,
        },
      ]
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
        className="relative w-full max-w-xl md:max-w-4xl p-6 md:p-8 bg-white backdrop-blur-3xl border border-white/30 rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh]"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute  top-4 right-4 text-black hover:text-red-400 text-[50px] transition-colors text-3xl"
        >
          ×
        </button>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-pulse text-gray-300 text-lg">Loading return details…</div>
          </div>
        ) : returnData ? (
          <>
            {/* Header */}
            <header className="mb-6 text-center">
              <h2 className="text-2xl md:text-4xl font-bold text-white bg-gradient-to-r from-blue-400 to-purple-500 inline-block px-4 py-2 rounded-xl shadow-md">
                Return #{returnData.id}
              </h2>
              <p className="mt-2 text-sm text-gray-800">{returnData.status.toUpperCase()}</p>
              {returnData.return_days_remaining === 0 && (
                <span className="inline-flex items-center mt-1 text-xs text-red-400">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-4.75a.75.75 0 111.5 0v.5a.75.75 0 01-1.5 0v-.5zm.75-7a.75.75 0 00-.75.75v4.5a.75.75 0 001.5 0v-4.5A.75.75 0 0010 6.25z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Return period expired
                </span>
              )}
            </header>

            {/* Image Carousel with Dots */}
            <div className="mb-6 relative">
              <div className="flex overflow-x-auto gap-4 py-2 scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-transparent">
                {returnData.variant_images.map((url, i) => (
                  <motion.img
                    key={i}
                    src={url}
                    alt={`${returnData.variant} ${i + 1}`}
                    className="h-32 sm:h-40 w-32 sm:w-40 flex-shrink-0 object-cover rounded-xl shadow-lg border border-white/40 hover:scale-105 transition-transform"
                  />
                ))}
              </div>
              {/* Dots */}
              <div className="flex justify-center mt-2 gap-2">
                {returnData.variant_images.map((_, i) => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-white/50 hover:bg-white transition-colors"
                  />
                ))}
              </div>
            </div>

            {/* Step Tracker with Icons */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-center gap-4 relative">
              {steps.map((step, idx) => (
                <div key={idx} className="flex flex-col items-center relative">
                  <div
                    className={`w-10 h-10 flex items-center justify-center rounded-full z-10 text-white shadow-lg ${
                      step.completed
                        ? "bg-gradient-to-r from-green-400 to-green-600 shadow-xl"
                        : "bg-gray-500"
                    }`}
                  >
                    {/* Step Icon */}
                    {step.icon || idx + 1}
                  </div>
                  <p className="mt-2 text-xs text-gray-200 text-center">{step.label}</p>

                  {/* Connector */}
                  {idx < steps.length - 1 && (
                    <div className="absolute top-5 left-full sm:top-5 sm:left-10 w-16 h-1 bg-gradient-to-r from-green-400 to-gray-300 sm:block hidden"></div>
                  )}
                  {idx < steps.length - 1 && (
                    <div className="w-px h-6 bg-gray-500 sm:hidden mt-2"></div>
                  )}
                </div>
              ))}
            </div>

            {/* Product & Order Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner hover:shadow-xl transition-shadow">
                <p><strong>Product:</strong> {returnData.product}</p>
                <p><strong>Variant:</strong> {returnData.variant}</p>
                <p><strong>Qty:</strong> {returnData.order_item.quantity}</p>
                <p><strong>Price:</strong> ₹{returnData.order_item.price}</p>
              </div>
              <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner hover:shadow-xl transition-shadow">
                <p><strong>Order ID:</strong> {returnData.order.id}</p>
                <p><strong>Status:</strong> {returnData.order.status}</p>
                <p><strong>Payment:</strong> {returnData.order.payment_method}</p>
                <p><strong>Total:</strong> ₹{returnData.order.total}</p>
              </div>
            </div>

            {/* Delivery & Warehouse */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner hover:shadow-xl transition-shadow">
                <h3 className="font-medium text-white mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 12l2-2 4 4 8-8 4 4" />
                  </svg>
                  Deliveryman
                </h3>
                <p><strong>Status:</strong> {returnData.pickup_status_display}</p>
                <p><strong>Comment:</strong> {returnData.pickup_comment || "—"}</p>
                <p><strong>Verified By:</strong> {returnData.pickup_verified_by_name || "—"}</p>
              </div>
              <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner hover:shadow-xl transition-shadow">
                <h3 className="font-medium text-white mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4 4h16v16H4z" />
                  </svg>
                  Warehouse
                </h3>
                <p><strong>Decision:</strong> {returnData.warehouse_decision}</p>
                <p><strong>Comment:</strong> {returnData.warehouse_comment || "—"}</p>
                <p><strong>Status:</strong> {returnData.warehouse_status_display}</p>
              </div>
            </div>

            {/* Reason & Shipping */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner hover:shadow-xl transition-shadow">
                <p><strong>Reason:</strong> {returnData.reason}</p>
                <p><strong>Refund Amt:</strong> ₹{returnData.refund_amount}</p>
                <p><strong>Method:</strong> {returnData.refund_method_display}</p>
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

            {/* Sticky Action Button */}
            {returnData.warehouse_decision === "approved" && !returnData.is_refunded && (
              <div className="sticky bottom-4 flex justify-center mt-4">
                <button
                  onClick={handleRefund}
                  disabled={actionLoading}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl shadow-xl hover:scale-105 transition-transform disabled:opacity-50"
                >
                  {actionLoading ? "Processing…" : "Process Refund"}
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="text-center text-gray-300 py-10">No return details found.</p>
        )}
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>



  );
};

export default ReturnModal;