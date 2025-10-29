import React, { useState } from "react";

const CheckoutSummary = ({ subtotal = 0, deliveryCharge = 0, totalAmount = 0, onPlaceOrder }) => {
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

  return (
    <div className="mt-8 border-t pt-6 px-4 pb-8 sm:px-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-3">Order Summary</h2>

      <div className="flex justify-between items-center mb-4">
        <span className="text-gray-600 text-sm">Subtotal</span>
        <span className="text-gray-800 font-medium text-sm">₹{safeSubtotal.toFixed(2)}</span>
      </div>

      <div className="flex justify-between items-center mb-4">
        <span className="text-gray-600 text-sm">Delivery</span>
        <span className="text-gray-800 font-medium text-sm">₹{safeDelivery.toFixed(2)}</span>
      </div>

      <div className="flex justify-between items-center border-t pt-4 mb-6">
        <span className="text-lg font-semibold text-gray-700">Total</span>
        <span className="text-lg font-bold text-gray-900">₹{safeTotal.toFixed(2)}</span>
      </div>

      <button
        onClick={handlePlaceOrder}
        disabled={isPlacing}
        className={`w-full flex justify-center items-center gap-2 text-white font-semibold py-3 rounded transition ${
          isPlacing ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
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
  );
};

export default CheckoutSummary;
