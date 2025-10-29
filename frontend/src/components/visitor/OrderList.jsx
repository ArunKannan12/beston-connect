import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axiosInstance from "../../api/axiosinstance";
import { useAuth } from "../../contexts/authContext";
import { motion } from "framer-motion";
import { CheckCircle, Clock, CreditCard, XCircle } from "lucide-react";
import OrderListShimmer from "../../shimmer/OrderListShimmer";

const OrderList = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/orders" } });
      return;
    }

    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get("orders/");
        const data = res.data.results || [];

        setOrders(data);

        
      } catch (error) {
        console.error("Failed to fetch orders:", error);
        toast.error(
          error.response?.data?.detail || "Failed to fetch your orders"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [authLoading, isAuthenticated, navigate]);

  if (loading || authLoading)
    return <OrderListShimmer/>;
  if (orders.length === 0)
    return <p className="p-6 text-center">You have no orders yet.</p>;

  // Helper function to pick a variant image safely
  const getVariantImageUrl = (variant) => {
    if (variant.images?.length > 0) {
      return variant.images[0].image_url || variant.images[0].image || variant.primary_image_url || "/placeholder.png";
    }
    return variant.primary_image_url || "/placeholder.png";
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
  <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold mb-6 text-gray-900 text-center sm:text-left">
    Your Orders
  </h1>

  <motion.ul
    className="space-y-6"
    initial="hidden"
    animate="show"
    variants={{
      hidden: { opacity: 0 },
      show: { opacity: 1, transition: { staggerChildren: 0.12 } },
    }}
  >
    {orders.map((order) => {
      const items = order.items || [];
      const totalItems = items.length;
      const firstItem = items[0]?.product_variant;
      const displayName = firstItem
        ? `${firstItem.product_name}${
            firstItem.variant_name ? " - " + firstItem.variant_name : ""
          }${totalItems > 1 ? ` +${totalItems - 1} more` : ""}`
        : "Order";

      const images = items.slice(0, 3).map((item) =>
        getVariantImageUrl(item.product_variant)
      );
      const totalAmount = parseFloat(order.total);

      return (
        <motion.li
          key={order.order_number}
          variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
          className="bg-white/80 backdrop-blur-md shadow-lg rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:shadow-2xl transition border border-gray-100"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full">
            {/* Product images */}
            <div className="flex -space-x-2 sm:-space-x-3">
              {images.map((img, idx) => (
                <motion.img
                  key={idx}
                  src={img}
                  alt="Product"
                  className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 object-cover rounded-lg border border-gray-200 shadow"
                  whileHover={{ scale: 1.05 }}
                />
              ))}
              {totalItems > 3 && (
                <span className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 flex items-center justify-center bg-gray-100 rounded-lg text-xs sm:text-sm lg:text-base font-medium text-gray-600 border border-gray-200">
                  +{totalItems - 3}
                </span>
              )}
            </div>

            {/* Order details */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm sm:text-base md:text-lg lg:text-xl text-gray-900 line-clamp-2">
                {displayName}
              </p>

              <p className="text-gray-500 text-xs sm:text-sm md:text-base">
                Ordered on:{" "}
                {new Date(order.created_at).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
              <p className="text-gray-600 text-sm sm:text-base md:text-lg font-medium">
                Total: ₹{totalAmount.toFixed(2)}
              </p>

              {/* Status Badge */}
              <div className="mt-2 flex flex-wrap gap-2 text-xs sm:text-sm md:text-base">
                {order.status === "delivered" ? (
                  <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                    <CheckCircle size={16} /> Delivered
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full font-medium">
                    <Clock size={16} /> {order.status || "Processing"}
                  </span>
                )}

                {order.is_paid ? (
                  <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                    <CreditCard size={16} /> Paid
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                    <XCircle size={16} /> Pending
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(`/orders/${order.order_number}`)}
            className="mt-4 sm:mt-0 px-4 py-2 text-sm sm:text-base md:text-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg shadow-lg hover:from-blue-700 hover:to-indigo-700 transition"
          >
            View Details
          </motion.button>
        </motion.li>
      );
    })}
  </motion.ul>
</div>


  );
};

export default OrderList;
