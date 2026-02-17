import React, { useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosinstance';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import {
  Copy,
  Check,
  Share2,
  ExternalLink,
  TrendingUp,
  Tag,
  AlertTriangle,
  ShoppingBag,
  MousePointer2
} from 'lucide-react';

const PromotedProducts = ({ refresh }) => {
  const [showPromoted, setShowPromoted] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    const fetchPromotedProducts = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get('promoted-products/');
        setShowPromoted(res.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchPromotedProducts();
  }, [refresh]);

  const handleCopy = (link, id) => {
    navigator.clipboard.writeText(link)
      .then(() => {
        setCopiedId(id);
        toast.success('Link copied!');
        setTimeout(() => setCopiedId(null), 2000);
      })
      .catch(() => toast.warning('Failed to copy.'));
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent"></div>
        <p className="text-gray-400 mt-4 text-sm font-medium">Loading your showcase...</p>
      </div>
    );
  }

  if (showPromoted.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-20 px-4 text-center"
      >
        <div className="bg-gray-50 p-6 rounded-full mb-4">
          <ShoppingBag size={48} className="text-gray-300" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">No Products Promoted Yet</h3>
        <p className="text-gray-500 max-w-sm mx-auto">
          Start promoting products from the "Available Products" tab to earn commissions!
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
          <Share2 size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Your Promoted Products</h2>
          <p className="text-gray-500 text-sm">Products you are actively sharing.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {showPromoted.map((product) => {
          const shareLinks = createShareLinks(product.referral_link, product.product_name);

          return (
            <motion.div
              key={product.id}
              variants={itemVariants}
              whileHover={{ y: -5 }}
              className="bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgb(0,0,0,0.05)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.1)] transition-all duration-300 border border-gray-100 flex flex-col group"
            >
              {/* Product Image */}
              <div className="relative h-56 overflow-hidden bg-gray-100">
                <img
                  src={product.image}
                  alt={product.variant_name}
                  className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between p-4">
                  <span className="text-white text-xs font-bold px-2 py-1 bg-white/20 backdrop-blur-md rounded-md">
                    {product.variant_name}
                  </span>
                </div>

                {product.is_low_stock && (
                  <span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1">
                    <AlertTriangle size={10} /> Low Stock
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="p-5 flex flex-col flex-grow">
                <div className="mb-3">
                  <h3 className="font-bold text-lg text-gray-900 leading-tight mb-1 line-clamp-1" title={product.product_name}>
                    {product.product_name}
                  </h3>

                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-bold text-indigo-600">₹{product.final_price}</span>
                    {product.final_price < product.base_price && (
                      <span className="text-sm text-gray-400 line-through">₹{product.base_price}</span>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-100">
                    <p className="text-xs text-gray-400 uppercase font-bold">Stock</p>
                    <p className="text-sm font-semibold text-gray-700">{product.stock}</p>
                  </div>
                  <div className="bg-indigo-50 rounded-lg p-2 text-center border border-indigo-100">
                    <p className="text-xs text-indigo-400 uppercase font-bold flex items-center justify-center gap-1">
                      <MousePointer2 size={10} /> Clicks
                    </p>
                    <p className="text-sm font-semibold text-indigo-700">{product.click_count}</p>
                  </div>
                </div>

                <div className="mt-auto space-y-3">
                  {/* Link Copy */}
                  <div className="relative">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1.5 ml-1">Referral Link</p>
                    <div className="flex bg-gray-50 border border-gray-200 rounded-xl overflow-hidden p-1 pl-3 transition-colors hover:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100">
                      <input
                        type="text"
                        value={product.referral_link}
                        readOnly
                        className="flex-1 bg-transparent text-xs text-gray-600 focus:outline-none w-full"
                      />
                      <button
                        onClick={() => handleCopy(product.referral_link, product.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ml-2 flex items-center gap-1 ${copiedId === product.id
                            ? "bg-green-500 text-white"
                            : "bg-gray-900 text-white hover:bg-gray-800"
                          }`}
                      >
                        {copiedId === product.id ? <Check size={12} /> : <Copy size={12} />}
                        {copiedId === product.id ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>

                  {/* Share Actions */}
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <a
                      href={shareLinks.whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white py-2 rounded-lg text-xs font-bold text-center transition-colors flex items-center justify-center gap-1"
                      title="Share on WhatsApp"
                    >
                      WA
                    </a>
                    <a
                      href={shareLinks.telegram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-[#0088cc]/10 text-[#0088cc] hover:bg-[#0088cc] hover:text-white py-2 rounded-lg text-xs font-bold text-center transition-colors flex items-center justify-center gap-1"
                      title="Share on Telegram"
                    >
                      TG
                    </a>
                    <a
                      href={shareLinks.email}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-gray-100 text-gray-600 hover:bg-gray-800 hover:text-white py-2 rounded-lg text-xs font-bold text-center transition-colors flex items-center justify-center gap-1"
                      title="Share via Email"
                    >
                      Mail
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default PromotedProducts;
