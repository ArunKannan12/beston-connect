import React from "react";
import { format } from "date-fns";

const OrderSummary = ({
  order,
  canceling,
  onTriggerCancelModal,
  cancelLoading,
  onPayNow,
  paying,
}) => {
  const total = parseFloat(order.total || 0).toFixed(2);
  console.log(order,'od');
  
  // Format paid date nicely
  const paidDate = order.paid_at ? format(new Date(order.paid_at), "dd-MMM-yyyy hh:mm a") : null;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 text-center">📦 Order Summary</h2>

      <div className="space-y-3 text-sm sm:text-base">
        <div className="flex justify-between">
          <span className="text-gray-500">Subtotal</span>
          <span className="font-medium text-gray-900">₹{parseFloat(order.subtotal || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Delivery Charge</span>
          <span className="font-medium text-gray-900">₹{parseFloat(order.delivery_charge || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-t border-gray-200 pt-4 font-bold text-lg">
          <span className="text-gray-900">Total</span>
          <span className="text-gray-900">₹{total}</span>
        </div>

        {/* Payment Status Info Box */}
        <div
          className={`mt-4 p-4 rounded-lg text-center text-sm sm:text-base
          ${order.is_paid ? "bg-green-50 border border-green-200 text-green-800" : "bg-yellow-50 border border-yellow-200 text-yellow-800"}`}
        >
          {order.status === "cancelled" ? (
            <>This order has been cancelled.</>
          ) : order.is_paid ? (
            <>
              Payment of <strong>₹{total}</strong> received via <strong>{order.payment_method}</strong> on <strong>{paidDate}</strong>.
            </>
          ) : order.payment_method === "Cash on Delivery" ? (
            <>
              Your order is confirmed with <strong>Cash on Delivery</strong>.
              <button
                onClick={onPayNow}
                disabled={paying}
                className="ml-2 font-semibold text-yellow-900 underline hover:text-yellow-700"
              >
                {paying ? "Processing..." : "Pay Now"}
              </button>
            </>
          ) : (
            <>
              Payment via <strong>{order.payment_method}</strong> is pending.
            </>
          )}
        </div>


      </div>

      {/* Cancel Button */}
      {order.cancelable && !order.cancelled_at && (
        <div className="mt-4 text-center">
          <button
            disabled={canceling}
            onClick={onTriggerCancelModal}
            className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition"
          >
            {cancelLoading ? "Cancelling..." : order.is_paid ? "Request Cancellation" : "Cancel Order"}
          </button>
        </div>
      )}

    </div>
  );
};

export default OrderSummary;
