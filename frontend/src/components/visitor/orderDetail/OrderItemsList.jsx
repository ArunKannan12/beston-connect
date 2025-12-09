import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, NavLink } from "react-router-dom";
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

const OrderItemsList = ({ items, orderNumber, fetchOrder,orders }) => {
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const handleCancel = async (itemId) => {
    if (!cancelReason.trim()) {
      toast.error("Please provide a reason for cancellation.");
      return;
    }

    setCancelLoading(true);
    try {
      await axiosInstance.post(`/orders/${orderNumber}/cancel/`, {
        cancel_reason: cancelReason,
        item_id: itemId,
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
  const toSlug = (text) =>
    text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

  const handleProductClick = (variant) => {
    const productSlug = toSlug(variant.product_name);
    const variantSlug = toSlug(variant.variant_name);
    navigate(`/products/${productSlug}/?variant=${variantSlug}`);
  };

    
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
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
        className="flex flex-col gap-4"
      >
        {items.map((item, index) => {
          const variant = item.product_variant;
          const price = parseFloat(item.price || variant.final_price || 0);
          const imageUrl =
            variant.images?.[0]?.image_url || variant.primary_image_url || "/placeholder.png";

          // Determine eligibility
          const returnDaysLeft = item.return_remaining_days ?? variant.return_days ?? 0;
          const replacementDaysLeft =
            item.replacement_remaining_days ?? variant.replacement_days ?? 0;
          const returnEligible = variant.allow_return && returnDaysLeft > 0;
          const replacementEligible = variant.allow_replacement && replacementDaysLeft > 0;

          const itemReturnRequest = item.return_request;
          const itemReplacementRequest = item.replacement_request;
         
          return (
            <motion.div
              key={item.id}
              custom={index}
              variants={fadeUp}
              className="bg-white shadow-sm rounded-lg p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-md transition"
            >
              {/* Left: Image + Info */}
              <div className="flex items-start gap-4 w-full sm:w-2/3">
                <img
                  src={imageUrl}
                  alt={variant.product_name}
                  className="w-16 h-16 object-cover rounded-md cursor-pointer"
                  onClick={() => handleProductClick(variant)}
                />
                <div className="flex-1">
                  <p
                    className="font-medium text-gray-900 cursor-pointer"
                    onClick={() => handleProductClick(variant)}
                  >
                    {variant.product_name}
                    {variant.variant_name && (
                      <span className="text-sm text-gray-500"> – {variant.variant_name}</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Qty: {item.quantity} | Status:{" "}
                    <span className="capitalize font-medium">{item.status}</span>
                  </p>
                  {/* Dynamic Buttons */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {/* Cancel */}
                    {(item.status === "pending" || item.status === "processing") && (
                      <button
                        onClick={() => {
                          setSelectedItem(item.id);
                          setShowCancelModal(true);
                        }}
                        className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition"
                      >
                        ❌ Cancel
                      </button>
                    )}

                    {/* Return / Replacement */}
                    {item.status === "delivered" && (
                      <>
                        {/* Return */}
                        {itemReturnRequest ? (
                          <NavLink
                            to={`/returns/${itemReturnRequest.id}`}
                            className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition"
                          >
                            View Return
                          </NavLink>
                        ) : !itemReplacementRequest && returnEligible ? (
                          <NavLink
                            to={`/returns/create/${orderNumber}?item=${item.id}`}
                            className="px-3 py-1 bg-yellow-500 text-white rounded-lg text-sm hover:bg-yellow-600 transition"
                          >
                            Request Return
                          </NavLink>
                        ) : null}

                        {/* Replacement */}
                        {itemReplacementRequest ? (
                          <NavLink
                            to={`/replacements/${itemReplacementRequest.id}`}
                            className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
                          >
                            View Replacement
                          </NavLink>
                        ) : !itemReturnRequest && replacementEligible ? (
                          <NavLink
                            to={`/replacements/create/${orderNumber}?item=${item.id}`}
                            className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition"
                          >
                            Request Replacement
                          </NavLink>
                        ) : null}
                      </>
                    )}
                  </div>

                </div>
              </div>

              {/* Right: Price */}
              <div className="flex flex-col items-end mt-4 sm:mt-0">
                <span className="font-bold text-lg text-gray-900">
                  ₹{(price * item.quantity).toFixed(2)}
                </span>
                <span className="text-sm text-gray-500">
                  ₹{price.toFixed(2)} × {item.quantity}
                </span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white/90 border border-gray-200 rounded-2xl shadow-xl p-6 max-w-sm w-full">
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
                  cancelLoading ? "bg-red-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
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
