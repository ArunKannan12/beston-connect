import React, { useEffect } from "react";

const PaymentMethodSelector = ({ paymentMethod, setPaymentMethod }) => {
  const methods = ["Razorpay"];

  useEffect(() => {
    if (!paymentMethod) {
      setPaymentMethod("Razorpay");
    }
  }, [paymentMethod, setPaymentMethod]);

  return (
    <div className="mb-4">
      <h2 className="font-semibold mb-2">Payment Method</h2>

      {methods.map((method) => (
        <label key={method} className="flex items-center space-x-2 mb-1">
          <input
            type="radio"
            name="paymentMethod"
            value={method}
            checked={paymentMethod === method}
            onChange={(e) => setPaymentMethod(e.target.value)}
          />
          <span>{method}</span>
        </label>
      ))}
    </div>
  );
};

export default PaymentMethodSelector;
