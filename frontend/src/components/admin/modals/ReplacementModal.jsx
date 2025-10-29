import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import dayjs from "dayjs";
import axiosInstance from "../../../api/axiosinstance";
import { toast } from "react-toastify";

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
        admin_decision: decision.toLowerCase(),
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

  // Step tracker
  const steps = replacementData
    ? [
        {
          label: "Requested",
          completed: true,
        },
        {
          label: "Pickup",
          completed: replacementData.pickup_status_display.toLowerCase() !== "pending",
        },
        {
          label: "Warehouse",
          completed: replacementData.warehouse_status_display.toLowerCase() === "approved",
        },
        {
          label: "Admin",
          completed: replacementData.admin_status_display.toLowerCase() === "approved",
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
            className="relative w-full max-w-5xl p-6 bg-white rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh]"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-700 hover:text-red-500 text-3xl"
            >
              ×
            </button>

            {loading ? (
              <div className="flex justify-center py-20 text-gray-400 animate-pulse">
                Loading replacement details…
              </div>
            ) : replacementData ? (
              <>
                {/* Header */}
                <div className="text-center mb-6">
                  <h2 className="text-3xl font-bold">{replacementData.product} Replacement</h2>
                  <p className="text-sm text-gray-600">Status: {replacementData.admin_status_display}</p>
                </div>

                {/* Step Tracker */}
                <div className="flex flex-col md:flex-row items-center w-full">
  {steps.map((step, idx) => (
    <div key={idx} className="flex flex-col md:flex-1 items-center relative">
      {/* Step Circle */}
      <div
        className={`w-10 h-10 flex items-center justify-center rounded-full text-white z-10 ${
          step.completed ? "bg-green-500" : "bg-gray-300"
        }`}
      >
        {step.completed ? "✓" : idx + 1}
      </div>

      {/* Step Label */}
      <span className="mt-2 text-xs text-gray-700 text-center">{step.label}</span>

      {/* Line connecting to next step */}
      {idx < steps.length - 1 && (
        <>
          {/* Horizontal line for desktop */}
          <div
            className={`hidden md:block absolute top-5 left-full w-full h-1 ${
              steps[idx + 1].completed ? "bg-green-500" : "bg-gray-300"
            }`}
          />
          {/* Vertical line for mobile */}
          <div
            className={`md:hidden w-1 h-12 bg-gray-300 ${
              steps[idx + 1].completed ? "bg-green-500" : "bg-gray-300"
            }`}
          />
        </>
      )}
    </div>
  ))}
</div>


                {/* Images */}
                <div className="flex overflow-x-auto gap-4 mb-6">
                  {replacementData.variant_images.map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt={`${replacementData.variant} ${i + 1}`}
                      className="w-32 h-32 sm:w-40 sm:h-40 rounded-lg object-cover"
                    />
                  ))}
                </div>

                {/* Product & Order Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-gray-50 rounded-xl shadow-inner">
                    <p><strong>Product:</strong> {replacementData.product}</p>
                    <p><strong>Variant:</strong> {replacementData.variant}</p>
                    <p><strong>Qty:</strong> {replacementData.order_item.quantity}</p>
                    <p><strong>Price:</strong> ₹{replacementData.order_item.price}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl shadow-inner">
                    <p><strong>Order ID:</strong> {replacementData.order.id}</p>
                    <p><strong>Status:</strong> {replacementData.order.status}</p>
                    <p><strong>Payment:</strong> {replacementData.order.payment_method}</p>
                    <p><strong>Total:</strong> ₹{replacementData.order.total}</p>
                  </div>
                </div>

                {/* Deliveryman & Warehouse */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-gray-50 rounded-xl shadow-inner">
                    <h3 className="font-medium mb-2">Deliveryman</h3>
                    <p><strong>Status:</strong> {replacementData.pickup_status_display}</p>
                    <p><strong>Comment:</strong> {replacementData.pickup_comment || "—"}</p>
                    <p><strong>Verified By:</strong> {replacementData.pickup_verified_by_name || "—"}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl shadow-inner">
                    <h3 className="font-medium mb-2">Warehouse</h3>
                    <p><strong>Decision:</strong> {replacementData.warehouse_decision}</p>
                    <p><strong>Comment:</strong> {replacementData.warehouse_comment || "—"}</p>
                    <p><strong>Status:</strong> {replacementData.warehouse_status_display}</p>
                  </div>
                </div>

                {/* Shipping Info */}
                <div className="p-4 bg-gray-50 rounded-xl shadow-inner mb-6">
                  <h3 className="font-medium mb-2">Shipping Address</h3>
                  <p>{replacementData.shipping_address.full_name}</p>
                  <p>{replacementData.shipping_address.address}, {replacementData.shipping_address.locality}</p>
                  <p>{replacementData.shipping_address.city} – {replacementData.shipping_address.postal_code}</p>
                  <p>{replacementData.shipping_address.state}, {replacementData.shipping_address.country}</p>
                  <p>📞 {replacementData.shipping_address.phone_number}</p>
                </div>

                {/* Admin Action - moved to bottom */}
                {replacementData.warehouse_decision === "approved" &&
                  replacementData.admin_status_display.toLowerCase() === "pending" && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl shadow-inner">
                    <h3 className="font-medium mb-2 text-blue-700">Admin Action</h3>
                    <textarea
                      value={adminComment}
                      onChange={(e) => setAdminComment(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 mb-2 focus:outline-none focus:ring focus:ring-blue-400"
                      placeholder="Enter admin comment"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAdminDecision("approved")}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleAdminDecision("rejected")}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-10 text-gray-400">No replacement details found.</div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReplacementModal;
