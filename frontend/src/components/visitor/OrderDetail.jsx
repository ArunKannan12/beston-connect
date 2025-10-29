import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axiosInstance from "../../api/axiosinstance";
import { useAuth } from "../../contexts/authContext";
import OrderDetailShimmer from "../../shimmer/OrderDetailShimmer";
import OrderTracker from "./orderDetail/OrderTracker";
import OrderItemsList from "./orderDetail/OrderItemsList";
import OrderSummary from "./orderDetail/OrderSummary";
import ShippingInfo from "./orderDetail/ShippingInfo";

const OrderDetail = () => {
  const { order_number } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelLoading,setCancelLoading] = useState(false)
  const [paying, setPaying] = useState(false);
  const [showCancelModal,setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const { isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate("/login", { state: { from: `/orders/${order_number}` } });
    } else {
      fetchOrder();
    }
  }, [authLoading, isAuthenticated, order_number, navigate]);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`orders/${order_number}/`);
      setOrder(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to fetch order details");
      navigate("/orders");
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async () => {
  if (!window.Razorpay) {
    toast.error("Payment gateway not loaded. Please try again.");
    return;
  }

  setPaying(true);
  try {
    const res = await axiosInstance.post(`/orders/${order.order_number}/pay/`, {
      payment_method: "Razorpay",
    });

    const { order: orderData } = res.data;

    if (orderData.payment_method === "Cash on Delivery") {
      toast.success("Order confirmed with COD");
      fetchOrder();
      return;
    }

    if (orderData.payment_method === "Razorpay" && !orderData.is_paid) {
      const options = {
        key: res.data.razorpay_key, // from backend
        amount: res.data.amount, // from backend
        currency: res.data.currency, // from backend
        name: "Beston Connect",
        description: "Order Payment",
        order_id: res.data.razorpay_order_id, // razorpay order id from backend
        handler: async function (response) {
          try {
            await axiosInstance.post(`/orders/razorpay/verify/`, {
              order_number: orderData.order_number,
              ...response,
            });
            toast.success("Payment successful");
            fetchOrder();
          } catch (err) {
            toast.error("Payment verification failed");
          }
        },
        prefill: {
          name: orderData.shipping_address.full_name,
          email: orderData.user?.email,
          contact: orderData.shipping_address.phone_number,
        },
        theme: { color: "#3399cc" },
      };

      new window.Razorpay(options).open();
    }
  } catch (err) {
    console.log(err);
    toast.error(err.response?.data?.detail || "Payment failed");
  } finally {
    setPaying(false);
  }
};



  const handleCancel = async () => {
    if (!cancelReason.trim()) {
    toast.error("Please provide a reason for cancellation.");
    return;
  }
   setCancelLoading(true)
    try {
      await axiosInstance.post(`/orders/${order.order_number}/cancel/`,{cancel_reason:cancelReason});
      toast.success("Order cancelled successfully");
      fetchOrder();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to cancel order");
    }finally{
      setShowCancelModal(false)
      setCancelLoading(false)
      setCancelReason('')
    }
  };

  if (loading || authLoading) return <OrderDetailShimmer />;
  if (!order) return <p className="p-6 text-center text-gray-500">Order not found.</p>;

  return (
    <div className="w-full bg-gray-50 min-h-screen">
      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm sm:text-base text-gray-600">
          <button
            onClick={() => navigate("/orders")}
            className="flex items-center gap-1 px-3 py-1 bg-white rounded-full hover:bg-gray-100 font-medium transition"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Orders
          </button>
          <span className="text-gray-400">/</span>
          <span className="font-semibold text-gray-800">Order #{order.order_number}</span>
        </div>

        {/* Shipping Info */}
        <ShippingInfo address={order.shipping_address} orderNumber={order.id}/>

        {/* Order Items */}
        <OrderItemsList items={order.items}  orderNumber={order.order_number} orders={order}/>

        {/* Order Summary */}
        <OrderSummary 
        order={order} 
        fetchOrder={fetchOrder} 
        cancelLoading={cancelLoading}
        onTriggerCancelModal={()=>setShowCancelModal(true)} 
        onPayNow={handlePayNow}
        paying={paying}
        />
       

        {/* Order Tracker */}
        <div className="bg-white/60 backdrop-blur-md rounded-xl shadow-md border border-gray-200 p-6">
    
          <OrderTracker
            status={order.status}
            paymentMethod={order.payment_method}
            timestamps={{
              pending: order.created_at,
              processing: order.paid_at,
              packed: order.items[0]?.packed_at,
              shipped: order.items[0]?.shipped_at,
              out_for_delivery: order.items[0]?.out_for_delivery_at,
              delivered: order.items[0]?.delivered_at,
              cancelled: order.cancelled_at,
              refunded: order.refunded_at,
            }}
            cancel_info={
              order.cancelled_at && {
                cancel_reason: order.cancel_reason,
                cancelled_at: order.cancelled_at,
                cancelled_by_role: order.cancelled_by?.role || "User",
              }
            }
          />
        </div>

        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white/70 backdrop-blur-md border border-gray-200 rounded-2xl shadow-xl p-6 max-w-sm w-full animate-fadeIn scale-95 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xl">
                  ❗
                </div>
                <h3 className="text-lg font-bold text-gray-900">Confirm Cancellation</h3>
              </div>
              <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                Are you sure you want to cancel this order? This action cannot be undone and may affect your delivery timeline.
              </p>

              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                placeholder="Please provide a reason for cancellation..."
                className="w-full p-3 text-sm text-gray-800 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 transition-all"
              ></textarea>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelReason("");
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  No, Keep Order
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancelLoading}
                  className={`px-4 py-2 rounded-lg transition ${
                    cancelLoading
                      ? "bg-red-400 text-white cursor-not-allowed"
                      : "bg-red-600 text-white hover:bg-red-700"
                  }`}
                >
                  {cancelLoading ? "Cancelling..." : "Yes, Cancel"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetail;