import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import axiosInstance from "../../../api/axiosinstance";
import { toast } from "react-toastify";

const OrderDrawer = ({ orderNumber, onClose }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orderNumber) return;

    const fetchOrderDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axiosInstance.get(`/admin/orders/${orderNumber}/`);
        setOrder(res.data);
      } catch (err) {
        const errMsg = err.response?.data?.detail || "Failed to load order";
        toast.error(errMsg);
        setError(errMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetail();
  }, [orderNumber]);

  if (!orderNumber) return null;

  const {
    order_number,
    status,
    user,
    is_paid,
    payment_method,
    tracking_number,
    created_at,
    shipped_at,
    delivered_at,
    subtotal,
    delivery_charge,
    total,
    shipping_address,
    items,
  } = order || {};

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 280, damping: 30 }}
      className="fixed inset-0 z-50 flex"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Drawer */}
      <div className="ml-auto w-full max-w-6xl bg-gradient-to-b from-white/80 to-gray-50/90 backdrop-blur-lg rounded-l-3xl shadow-2xl overflow-y-auto max-h-screen p-6 sm:p-10 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-700 hover:text-gray-900 text-3xl font-bold z-30"
        >
          &times;
        </button>

        {loading && (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-600 text-lg">Loading...</p>
          </div>
        )}

        {error && (
          <div className="flex justify-center items-center h-full">
            <p className="text-red-600 text-lg">{error}</p>
          </div>
        )}

        {order && (
          <>
            {/* Header */}
            <div className="mb-8 border-b pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-3xl sm:text-5xl font-extrabold text-gray-800">
                Order #{order_number}
              </h2>
              <span
                className={`px-4 py-2 rounded-full font-semibold text-sm shadow-md transition-all w-fit ${
                  status === "pending"
                    ? "bg-yellow-200 text-yellow-900 animate-pulse"
                    : status === "processing"
                    ? "bg-blue-200 text-blue-900"
                    : status === "shipped"
                    ? "bg-indigo-200 text-indigo-900"
                    : status === "delivered"
                    ? "bg-green-200 text-green-900"
                    : "bg-gray-200 text-gray-900"
                }`}
              >
                {status?.toUpperCase()}
              </span>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
              {/* User Info */}
              <div className="bg-white/70 rounded-2xl p-6 shadow-md hover:shadow-xl transition">
                <h3 className="text-xl font-bold mb-3 text-gray-800">
                  User Info
                </h3>
                <p className="text-sm sm:text-base text-gray-700">
                  <strong>Name:</strong> {user}
                </p>
                <p className="text-sm sm:text-base text-gray-700">
                  <strong>Payment:</strong>{" "}
                  {is_paid ? (
                    <span className="text-green-600 font-bold">Paid</span>
                  ) : (
                    <span className="text-red-600 font-bold">Unpaid</span>
                  )}{" "}
                  ({payment_method})
                </p>
                <p className="text-sm sm:text-base text-gray-700">
                  <strong>Tracking:</strong> {tracking_number || "—"}
                </p>
              </div>

              {/* Dates */}
              <div className="bg-white/70 rounded-2xl p-6 shadow-md hover:shadow-xl transition">
                <h3 className="text-xl font-bold mb-3 text-gray-800">Dates</h3>
                <p className="text-sm sm:text-base text-gray-700">
                  <strong>Created:</strong>{" "}
                  {created_at && new Date(created_at).toLocaleString()}
                </p>
                {shipped_at && (
                  <p className="text-sm sm:text-base text-gray-700">
                    <strong>Shipped:</strong>{" "}
                    {new Date(shipped_at).toLocaleString()}
                  </p>
                )}
                {delivered_at && (
                  <p className="text-sm sm:text-base text-gray-700">
                    <strong>Delivered:</strong>{" "}
                    {new Date(delivered_at).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Totals */}
              <div className="bg-white/70 rounded-2xl p-6 shadow-md hover:shadow-xl transition">
                <h3 className="text-xl font-bold mb-3 text-gray-800">Totals</h3>
                <p className="text-sm sm:text-base text-gray-700">
                  <strong>Subtotal:</strong> ₹{subtotal}
                </p>
                <p className="text-sm sm:text-base text-gray-700">
                  <strong>Delivery:</strong> ₹{delivery_charge}
                </p>
                <p className="text-xl sm:text-2xl font-extrabold text-gray-900 mt-4">
                  <strong>Total:</strong> ₹{total}
                </p>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="mb-10 bg-white/70 p-6 rounded-2xl shadow-md hover:shadow-xl transition">
              <h3 className="text-xl font-bold mb-3 text-gray-800">
                Shipping Address
              </h3>
              <p className="text-sm sm:text-base text-gray-700">
                {shipping_address?.full_name}
              </p>
              <p className="text-sm sm:text-base text-gray-700">
                {shipping_address?.address}, {shipping_address?.locality}
              </p>
              <p className="text-sm sm:text-base text-gray-700">
                {shipping_address?.city}, {shipping_address?.district},{" "}
                {shipping_address?.state} - {shipping_address?.postal_code}
              </p>
              <p className="text-sm sm:text-base text-gray-700">
                Phone: {shipping_address?.phone_number}
              </p>
            </div>

            {/* Items Section */}
            <div>
              <h3 className="text-2xl sm:text-4xl font-extrabold mb-6 text-gray-900">
                Items
              </h3>
              <div className="space-y-6">
                {items?.map((item) => {
                  const variant = item.product_variant;
                  return (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row gap-6 bg-white rounded-2xl p-5 shadow-md hover:shadow-xl transition transform hover:-translate-y-1"
                    >
                      <img
                        src={variant.primary_image_url}
                        alt={variant.variant_name}
                        className="w-full sm:w-32 h-32 object-cover rounded-xl border"
                      />
                      <div className="flex-1 text-gray-800">
                        <p className="text-lg font-bold">
                          {variant.product_name}{" "}
                          <span className="text-gray-500 font-medium">
                            ({variant.variant_name})
                          </span>
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3 text-sm sm:text-base text-gray-700">
                          <p>
                            <strong>SKU:</strong> {variant.sku}
                          </p>
                          <p>
                            <strong>Qty:</strong> {item.quantity}
                          </p>
                          <p>
                            <strong>Price:</strong> ₹{item.price}
                          </p>
                          <p>
                            <strong>Discount:</strong>{" "}
                            {variant.discount_percent}%
                          </p>
                          <p>
                            <strong>Returnable:</strong>{" "}
                            {variant.is_returnable ? "Yes" : "No"}
                          </p>
                          <p>
                            <strong>Replaceable:</strong>{" "}
                            {variant.is_replaceable ? "Yes" : "No"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default OrderDrawer;
