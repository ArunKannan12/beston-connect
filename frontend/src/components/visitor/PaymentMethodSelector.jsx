import React, { useEffect } from "react";

const PaymentMethodSelector = ({ paymentMethod, setPaymentMethod }) => {
  const methods = ["Razorpay"];

  useEffect(() => {
    if (!paymentMethod) {
      setPaymentMethod("Razorpay");
    }
  }, [paymentMethod, setPaymentMethod]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {methods.map((method) => (
        <label
          key={method}
          className={`relative flex items-center gap-4 p-5 rounded-3xl border-2 cursor-pointer transition-all duration-300 ${paymentMethod === method
              ? "border-blue-600 bg-blue-50/50 shadow-md ring-4 ring-blue-500/10"
              : "border-gray-100 bg-white/50 hover:border-gray-200"
            }`}
        >
          <input
            type="radio"
            name="paymentMethod"
            value={method}
            checked={paymentMethod === method}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="hidden"
          />
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${paymentMethod === method ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400"
            }`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className={`font-black tracking-tight ${paymentMethod === method ? "text-blue-900" : "text-gray-900"}`}>
              {method}
            </p>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Secure Online Payment</p>
          </div>
          {paymentMethod === method && (
            <div className="absolute top-4 right-4 text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </label>
      ))}
    </div>
  );
};

export default PaymentMethodSelector;
