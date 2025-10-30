import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axiosinstance";
import { toast } from "react-toastify";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: "easeOut" },
  }),
};

const OrderItemsList = ({ items, orderNumber, orders, fetchOrder }) => {
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [loadingTrack, setLoadingTrack] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const handleTrack = async (itemId) => {
    setLoadingTrack(true);
    try {
      const res = await axiosInstance.get(`/orders/${orderNumber}/track/`);
      const data = res.data.tracking_items.find((t) => t.item_id === itemId);
      setTrackingData(data);
      setSelectedItem(itemId);
    } catch (err) {
      toast.error("Failed to fetch tracking info");
    } finally {
      setLoadingTrack(false);
    }
  };

  const handleCancel = async (itemId) => {
    if (!cancelReason.trim()) {
      toast.error("Please provide a reason for cancellation.");
      return;
    }
    setCancelLoading(true);
    try {
      await axiosInstance.post(`/orders/${orderNumber}/cancel/`, {
        cancel_reason: cancelReason,
        item_id: itemId, // backend will handle partial cancel if item_id provided
      });
      toast.success("Item cancelled successfully");
      fetchOrder();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to cancel item");
    } finally {
      setCancelLoading(false);
      setShowCancelModal(false);
      setCancelReason("");
    }
  };

  const handleProductClick = (slug) => navigate(`/products/${slug}`);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 text-center">
        🛍️ Order Items
      </h2>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.05 } },
        }}
        className="divide-y divide-gray-200"
      >
        {items.map((item, index) => {
          const variant = item.product_variant;
          const price = parseFloat(item.price || variant.final_price || 0);
          const imageUrl =
            variant.images?.[0]?.image_url ||
            variant.primary_image_url ||
            "/placeholder.png";

          return (
            <motion.div
              key={item.id}
              custom={index}
              variants={fadeUp}
              className="py-4 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4"
            >
              {/* Left: Image + Name */}
              <div className="flex items-center gap-4">
                <img
                  src={imageUrl}
                  alt={variant.product_name}
                  className="w-14 h-14 object-cover rounded-md cursor-pointer"
                  onClick={() => handleProductClick(variant.product_slug)}
                />
                <div
                  className="cursor-pointer"
                  onClick={() => handleProductClick(variant.product_slug)}
                >
                  <p className="font-medium text-gray-900">
                    {variant.product_name}
                    {variant.variant_name && (
                      <span className="text-sm text-gray-600">
                        {" "}
                        – {variant.variant_name}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">
                    Qty: {item.quantity} | Status:{" "}
                    <span className="capitalize font-medium">
                      {item.status}
                    </span>
                  </p>
                </div>
              </div>

              {/* Right: Actions + Price */}
              <div className="flex flex-col sm:items-end text-sm text-gray-700 gap-2">
                <div className="flex gap-3">
                  {item.status !== "cancelled" && (
                    <>
                      <button
                        onClick={() => handleTrack(item.id)}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        🚚 Track
                      </button>
                      {(item.status === "pending" ||
                        item.status === "processing") && (
                        <button
                          onClick={() => {
                            setSelectedItem(item.id);
                            setShowCancelModal(true);
                          }}
                          className="text-red-600 hover:text-red-800 underline"
                        >
                          ❌ Cancel
                        </button>
                      )}
                    </>
                  )}
                </div>
                <div className="font-bold text-gray-900">
                  ₹{(price * item.quantity).toFixed(2)}
                  <span className="block text-xs text-gray-500 font-normal">
                    ₹{price.toFixed(2)} × {item.quantity}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Tracking Modal */}
      {trackingData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md relative">
            <button
              onClick={() => setTrackingData(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
            >
              ✖
            </button>
            <h3 className="text-lg font-bold mb-2">📦 Tracking Details</h3>
            <p className="text-sm text-gray-600 mb-3">
              Waybill: {trackingData.waybill || "Not available"}
            </p>
            {loadingTrack ? (
              <p>Loading tracking info...</p>
            ) : trackingData.tracking ? (
              <div className="space-y-2">
                {trackingData.tracking.map((t, i) => (
                  <div
                    key={i}
                    className="border-l-2 border-blue-500 pl-3 text-sm"
                  >
                    <p className="font-medium">{t.status}</p>
                    <p className="text-gray-500 text-xs">{t.scanned_on}</p>
                    <p className="text-gray-600">{t.location}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">{trackingData.message}</p>
            )}
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white/80 backdrop-blur-md border border-gray-200 rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              Confirm Item Cancellation
            </h3>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              placeholder="Reason for cancellation..."
              className="w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-red-400"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                No
              </button>
              <button
                onClick={() => handleCancel(selectedItem)}
                disabled={cancelLoading}
                className={`px-4 py-2 rounded-lg text-white transition ${
                  cancelLoading
                    ? "bg-red-400 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {cancelLoading ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderItemsList;
