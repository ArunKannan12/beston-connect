import React, { useEffect, useState } from 'react';
import axiosInstance from '../../../api/axiosinstance';
import { toast } from 'react-toastify';

const PromotedProducts = ({ refresh }) => {
  const [showPromoted, setShowPromoted] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPromotedProducts = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get('promoted-products/');
        setShowPromoted(res.data);
        console.log(res.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchPromotedProducts();
  }, [refresh]);

  const handleCopy = (link) => {
    navigator.clipboard.writeText(link)
      .then(() => toast.success('Link copied to clipboard!'))
      .catch(() => toast.warning('Failed to copy link.'));
  };

  const createShareLinks = (link, productName) => {
    const encodedLink = encodeURIComponent(link);
    const encodedText = encodeURIComponent(`Check out this product: ${productName}\n${link}`);

    return {
      whatsapp: `https://wa.me/?text=${encodedText}`,
      telegram: `https://t.me/share/url?url=${encodedLink}&text=${encodedText}`,
      email: `mailto:?subject=Check this product&body=${encodedText}`
    };
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
  <h2 className="text-3xl font-bold mb-6 text-gray-800">Your Promoted Products</h2>

  {loading ? (
    <p className="text-gray-500 text-center">Loading promoted products...</p>
  ) : showPromoted.length === 0 ? (
    <p className="text-gray-500 text-center">No products have been promoted yet.</p>
  ) : (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {showPromoted.map((product) => {
        const shareLinks = createShareLinks(product.referral_link, product.product_name);

        return (
          <div
            key={product.id}
            className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col"
          >
            {/* Product Image */}
            <div className="relative">
              <img
                src={product.image}
                alt={product.variant_name}
                className="w-full h-48 object-cover"
              />
              {product.is_low_stock && (
                <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-md shadow">
                  Low Stock
                </span>
              )}
            </div>

            {/* Product Info */}
            <div className="p-4 flex flex-col flex-grow">
              <p className="font-semibold text-lg text-gray-900">{product.product_name}</p>
              <p className="text-sm text-gray-500 mb-1">Variant: {product.variant_name}</p>

              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span className="font-medium text-green-600">₹{product.final_price}</span>
                {product.final_price < product.base_price && (
                  <span className="line-through text-gray-400 text-sm">₹{product.base_price}</span>
                )}
              </div>

              <p className="text-sm text-gray-600 mt-1 mb-3">
                Stock: <span className="font-medium">{product.stock}</span>
              </p>

              {/* Referral Link Section */}
              <div className="mt-auto">
                <p className="text-xs text-gray-500 mb-1 font-medium">Referral Link</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={product.referral_link}
                    readOnly
                    className="flex-1 border border-gray-200 bg-gray-50 rounded-lg px-2 py-1 text-xs text-gray-600 truncate"
                  />
                  <button
                    onClick={() => handleCopy(product.referral_link)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-xs font-medium"
                  >
                    Copy
                  </button>
                </div>

                {/* Share Buttons */}
                <div className="flex justify-between mt-3">
                  <a
                    href={shareLinks.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-md font-medium flex-1 text-center mx-1"
                  >
                    WhatsApp
                  </a>
                  <a
                    href={shareLinks.telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-400 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-md font-medium flex-1 text-center mx-1"
                  >
                    Telegram
                  </a>
                  <a
                    href={shareLinks.email}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gray-700 hover:bg-gray-800 text-white text-xs px-3 py-1.5 rounded-md font-medium flex-1 text-center mx-1"
                  >
                    Email
                  </a>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  )}
</div>

  );
};

export default PromotedProducts;
