import React, { useState } from "react";

const CheckoutSummary = ({
  subtotal = 0,
  deliveryCharge = 0,
  totalAmount = 0,
  estimatedDeliveryDays = null,
  onPlaceOrder,
}) => {
  const [isPlacing, setIsPlacing] = useState(false);

  const safeSubtotal = Number(subtotal) || 0;
  const safeDelivery = Number(deliveryCharge) || 0;
  const safeTotal = Number(totalAmount) || 0;

  const handlePlaceOrder = async () => {
    if (isPlacing) return;
    setIsPlacing(true);
    try {
      await onPlaceOrder();
    } catch (error) {
      console.error(error);
    } finally {
      setIsPlacing(false);
    }
  };

  // 📦 Estimated delivery date
  const getEstimatedDateRange = (days) => {
    if (!days) return null;
    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + days);
    return `${start.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    })} - ${end.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    })}`;
  };

  return (
    <div className="mt-8 sm:mt-10">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8 transition-all hover:shadow-xl">
        <h2 className="text-2xl font-semibold text-gray-900 mb-5">
          Order Summary
        </h2>

        <div className="space-y-4">
          <div className="flex justify-between text-gray-700">
            <span>Subtotal</span>
            <span className="font-medium">₹{safeSubtotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-gray-700">
            <span>Delivery Charges</span>
            <span className="font-medium">₹{safeDelivery.toFixed(2)}</span>
          </div>

          {estimatedDeliveryDays && (
            <div className="flex justify-between text-gray-700 border-t border-gray-200 pt-4">
              <span>Estimated Delivery</span>
              <span className="text-green-600 font-medium">
                {getEstimatedDateRange(estimatedDeliveryDays)}
              </span>
            </div>
          )}

          <div className="border-t border-gray-300 pt-5 mt-3 flex justify-between text-lg">
            <span className="font-semibold text-gray-800">Total</span>
            <span className="font-bold text-gray-900">
              ₹{safeTotal.toFixed(2)}
            </span>
          </div>
        </div>

        <button
          onClick={handlePlaceOrder}
          disabled={isPlacing}
          className={`mt-6 w-full flex justify-center items-center gap-2 py-3 rounded-lg font-semibold text-white transition ${
            isPlacing
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg"
          }`}
        >
          {isPlacing && (
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          )}
          {isPlacing ? "Placing order..." : "Place Order"}
        </button>
      </div>
    </div>
  );
};

export default CheckoutSummary;
