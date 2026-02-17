import React from "react";

const CartItemList = ({ cartItems }) => {



  if (!cartItems.length) return <p className="text-gray-500">Your cart is empty.</p>;


  const getImageUrl = (url) => {
    if (!url) return "/placeholder.png"; // fallback
    return url.startsWith("http") ? url : `http://localhost:8000${url}`;
  };
  // console.log(cartItems,'cartitems');

  return (
    <ul className="divide-y divide-gray-100 font-sans">
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
          <li key={id || Math.random()} className="py-6 flex justify-between items-center group">
            <div className="flex items-center space-x-6">
              <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-50 border border-gray-100 group-hover:shadow-sm transition">
                <img
                  src={getImageUrl(imageUrl)}
                  alt={productName}
                  className="w-full h-full object-contain group-hover:scale-105 transition duration-300"
                />
              </div>
              <div>
                <p className="font-bold text-gray-900 group-hover:text-blue-600 transition">
                  {productName}
                </p>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                  {variantName || "Standard Edition"}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-bold">QTY: {quantity}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-gray-900">₹{(price * quantity).toFixed(2)}</p>
              <p className="text-[10px] text-gray-400 font-medium">₹{Number(price).toFixed(2)} / unit</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default CartItemList;
