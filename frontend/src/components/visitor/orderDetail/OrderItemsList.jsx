import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: "easeOut" },
  }),
};

const OrderItemsList = ({ items, orderNumber,orders }) => {
  const navigate = useNavigate();

  const handleProductClick = (slug) => navigate(`/products/${slug}`);
  console.log(items,'i');
  
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 text-center">
        🛍️ Order Items
      </h2>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.05 } },
        }}
        className="divide-y divide-gray-200"
      >
        {items.map((item, index) => {
          const { product_variant: variant, quantity = 1, price: rawPrice } = item;
          const price = parseFloat(rawPrice || variant.final_price || 0);
          const imageUrl = variant.images?.[0]?.image_url || variant.primary_image_url || "/placeholder.png";

          const returnEligible = variant.allow_return && item.return_remaining_days > 0;
          const replacementEligible = variant.allow_replacement && item.replacement_remaining_days > 0;

          return (
            <motion.div
              key={item.id}
              custom={index}
              variants={fadeUp}
              className="py-4 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4"
            >
              {/* Left: Image + Name */}
              <div className="flex items-center gap-4">
                <img
                  src={imageUrl}
                  alt={variant.product_name}
                  className="w-14 h-14 object-cover rounded-md cursor-pointer"
                  onClick={() => handleProductClick(variant.product_slug)}
                />
                <div className="cursor-pointer" onClick={() => handleProductClick(variant.product_slug)}>
                  <p className="font-medium text-gray-900">
                    {variant.product_name}
                    {variant.variant_name && (
                      <span className="text-sm text-gray-600"> – {variant.variant_name}</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">Qty: {quantity}</p>
                </div>
              </div>

              {/* Right: Status + Return/Replacement + Price */}
              <div className="flex flex-col sm:items-end text-sm text-gray-700 gap-1">
                {/* Return */}
                <div>
                  {item.return_request ? (
                    <span
                      className="text-yellow-700 underline cursor-pointer"
                      onClick={() => navigate(`/returns/${item.return_request.id}`)}
                    >
                      🔄 View Return Request
                      <span className="ml-1 text-xs text-gray-500">
                        ({item.return_request.status})
                      </span>
                    </span>
                  ) : returnEligible ? (
                    <span
                      className="text-yellow-700 underline cursor-pointer"
                      onClick={() => navigate(`/returns/create/${orderNumber}?item=${item.id}`)}
                    >
                      🔄 Request Return ({item.return_remaining_days} day
                      {item.return_remaining_days !== 1 && "s"})
                    </span>
                  ) : (
                    <span className="text-gray-400">No Return</span>
                  )}
                </div>
                {/* Replacement */}
                <div> 
                  {item.replacement_request ? (
                    <span
                      className="text-indigo-700 underline cursor-pointer"
                      onClick={() => navigate(`/replacements/${item.replacement_request.id}`)}
                    >
                      ♻️ View Replacement Request
                      <span className="ml-1 text-xs text-gray-500">
                        ({item.replacement_request.status})
                      </span>
                    </span>
                  ) : replacementEligible ? (
                    <span
                      className="text-indigo-700 underline cursor-pointer"
                      onClick={() =>
                        navigate(`/replacements/create/${orderNumber}?item=${item.id}`)
                      }
                    >
                      ♻️ Request Replacement ({item.replacement_remaining_days} day
                      {item.replacement_remaining_days !== 1 && "s"})
                    </span>
                  ) : (
                    <span className="text-gray-400">No Replacement</span>
                  )}
                </div>
                {/* Price */}
                <div className="font-bold text-gray-900">
                  ₹{(price * quantity).toFixed(2)}
                  <span className="block text-xs text-gray-500 font-normal">
                    ₹{price.toFixed(2)} × {quantity}
                  </span>
                </div>
              </div>

            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};

export default OrderItemsList;
