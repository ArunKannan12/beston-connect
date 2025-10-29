import React from "react";

const CartItemList = ({ cartItems }) => {
  
  
  if (!cartItems.length) return <p className="text-gray-500">Your cart is empty.</p>;
    
    
  const getImageUrl = (url) => {
    if (!url) return "/placeholder.png"; // fallback
    return url.startsWith("http") ? url : `http://localhost:8000${url}`;
  };

  return (
    <ul className="divide-y mb-6">
      {cartItems.map((item) => {
        const {
          id,
          quantity = 1,
          price = 0,
          productName = "Unknown Product",
          variantName = "",
          imageUrl = "",
        } = item;

        return (
          <li key={id || Math.random()} className="py-4 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <img
                src={getImageUrl(imageUrl)}
                alt={productName}
                className="w-20 h-20 object-cover rounded-md"
              />
              <div>
                <p className="font-semibold">
                  {productName} {variantName && `- ${variantName}`}
                </p>
                <p className="text-sm text-gray-500">Qty: {quantity}</p>
              </div>
            </div>
            <p className="text-gray-800 font-medium">₹{(price * quantity).toFixed(2)}</p>
          </li>
        );
      })}
    </ul>
  );
};

export default CartItemList;
