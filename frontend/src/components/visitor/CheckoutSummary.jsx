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
    <div className="space-y-6 text-white font-sans">
      <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        Order Summary
      </h2>

      <div className="space-y-4">
        <div className="flex justify-between text-gray-400 font-medium tracking-tight">
          <span>Subtotal</span>
          <span className="text-white">₹{safeSubtotal.toFixed(2)}</span>
        </div>

        <div className="flex justify-between text-gray-400 font-medium tracking-tight">
          <span>Delivery Charges</span>
          <span className="text-emerald-400">
            {safeDelivery > 0 ? `₹${safeDelivery.toFixed(2)}` : "FREE"}
          </span>
        </div>

        {estimatedDeliveryDays && (
          <div className="pt-4 border-t border-gray-800">
            <div className="flex justify-between items-center bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="text-xs">
                <p className="text-gray-500 uppercase tracking-widest font-bold mb-1">Estimated Arrival</p>
                <p className="text-sm font-bold text-white">{getEstimatedDateRange(estimatedDeliveryDays)}</p>
              </div>
              <span className="text-2xl">📦</span>
            </div>
          </div>
        )}

        <div className="pt-6 mt-4 border-t border-gray-800 flex justify-between items-end">
          <div>
            <span className="text-sm text-gray-500 uppercase tracking-widest font-black">Total to pay</span>
            <p className="text-4xl font-black text-white leading-none mt-1">₹{safeTotal.toFixed(2)}</p>
          </div>
          <p className="text-[10px] text-gray-500 uppercase font-bold text-right tracking-tighter">Incl. all taxes</p>
        </div>
      </div>

      <button
        onClick={handlePlaceOrder}
        disabled={isPlacing}
        className="w-full mt-8 py-5 bg-white text-gray-900 rounded-3xl font-black text-lg hover:scale-[1.02] active:scale-[0.98] transition shadow-lg flex items-center justify-center gap-3 disabled:opacity-50"
      >
        {isPlacing ? (
          <>
            <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
            <span>Processing...</span>
          </>
        ) : (
          <>
            <span>Place Order Securely</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </>
        )}
      </button>
    </div>
  );
};

export default CheckoutSummary;
