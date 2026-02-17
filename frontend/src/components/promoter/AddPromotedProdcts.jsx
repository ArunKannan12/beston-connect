import React, { useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosinstance.jsx';
import PromotedProducts from './PromotedProducts.jsx';
import { useAuth } from '../../contexts/authContext.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Search,
  CheckCircle2,
  TrendingUp,
  Zap,
  Megaphone,
  Filter,
  ArrowRight,
  Plus
} from 'lucide-react';

const AddPromotedProducts = () => {
  const [activeTab, setActiveTab] = useState('available');
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [refreshPromoted, setRefreshPromoted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { user } = useAuth()
  const promoterProfile = user?.promoter_profile;
  const isPaid = promoterProfile?.promoter_type === 'paid';

  const fetchProductsForPromotion = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('available-products/');
      setProducts(res.data);
    } catch (error) {
      console.error(error);
      setMessage('Failed to fetch products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'available') fetchProductsForPromotion();
  }, [activeTab]);

  const toggleSelectProduct = (id) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  const handlePromote = async () => {
    if (!selectedProducts.length) {
      setMessage('Select at least one product.');
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      await axiosInstance.post('promote/multiple-products/', {
        product_variant_ids: selectedProducts,
      });
      setMessage('Products promoted successfully!');
      setTimeout(() => {
        setMessage('');
        setActiveTab('promoted');
        setRefreshPromoted((prev) => !prev);
      }, 1500);

      fetchProductsForPromotion();
      setSelectedProducts([]);

    } catch (error) {
      console.error(error);
      setMessage('Failed to promote products.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.variant_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans relative overflow-x-hidden pb-12">
      {/* Background */}
      <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-white to-gray-50 -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="flex flex-col items-center mb-10 text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3 mb-4">
            <Megaphone className="text-amber-500" size={32} />
            Product Showcase
          </h1>

          {/* Tabs */}
          <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-200 inline-flex relative z-10">
            {['available', 'promoted'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === tab
                    ? 'bg-gray-900 text-white shadow-lg'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
              >
                {tab === 'available' ? 'Available to Promote' : 'My Promotions'}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'available' ? (
            <motion.div
              key="available"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Sticky Action Bar & Filter */}
              <div className="sticky top-4 z-20 mb-8 space-y-4">
                {message && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg text-center font-bold"
                  >
                    {message}
                  </motion.div>
                )}

                <div className="bg-white/80 backdrop-blur-xl p-4 rounded-2xl shadow-lg border border-white/50 flex flex-col md:flex-row justify-between items-center gap-4">
                  {/* Search */}
                  <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-indigo-300 rounded-xl transition-all outline-none"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="hidden md:flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                      <Filter size={16} /> 0 Filters Active
                    </div>

                    <button
                      onClick={handlePromote}
                      disabled={submitting || selectedProducts.length === 0}
                      className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold text-white transition-all shadow-md ${selectedProducts.length > 0
                          ? "bg-gradient-to-r from-indigo-600 to-blue-600 hover:shadow-lg hover:scale-105"
                          : "bg-gray-300 cursor-not-allowed"
                        }`}
                    >
                      {submitting ? (
                        "Promoting..."
                      ) : (
                        <>Promote ({selectedProducts.length}) <ArrowRight size={18} /></>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Product Grid */}
              {loading ? (
                <div className="flex justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
              ) : (
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {filteredProducts.length === 0 ? (
                    <div className="col-span-full text-center py-20 text-gray-400">
                      <ShoppingBag size={64} className="mx-auto mb-4 opacity-20" />
                      <p className="text-xl font-semibold">No products found</p>
                      <p className="text-sm">Try adjusting your filters or search query.</p>
                    </div>
                  ) : (
                    filteredProducts.map((product) => {
                      const isSelected = selectedProducts.includes(product.id);

                      return (
                        <motion.div
                          key={product.id}
                          variants={cardVariants}
                          onClick={() => toggleSelectProduct(product.id)}
                          whileHover={{ y: -5 }}
                          className={`relative group bg-white rounded-2xl cursor-pointer overflow-hidden transition-all duration-300 border-2 ${isSelected
                              ? 'border-indigo-500 shadow-[0_0_0_4px_rgba(99,102,241,0.2)]'
                              : 'border-transparent shadow-[0_4px_20px_rgb(0,0,0,0.05)] hover:border-indigo-200'
                            }`}
                        >
                          {/* Selection Indicator */}
                          <div className={`absolute top-3 right-3 z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${isSelected ? 'bg-indigo-600 scale-110' : 'bg-black/30 backdrop-blur-sm group-hover:bg-black/50'
                            }`}>
                            {isSelected ? <CheckCircle2 size={16} className="text-white" /> : <Plus size={16} className="text-white" />}
                          </div>

                          {/* Image */}
                          <div className="aspect-[4/3] overflow-hidden relative">
                            <img
                              src={product.primary_image_url}
                              alt={product.variant_name}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            {product.discount_percent > 0 && (
                              <div className="absolute bottom-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
                                {Math.round(product.discount_percent)}% OFF
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="p-4">
                            <h3 className="font-bold text-gray-900 leading-tight mb-1 truncate">{product.product_name}</h3>
                            <p className="text-sm text-gray-500 mb-3">{product.variant_name}</p>

                            <div className="flex items-baseline gap-2 mb-3">
                              <span className="text-lg font-bold text-indigo-600">₹{product.final_price}</span>
                              {product.final_price < product.base_price && (
                                <span className="text-xs text-gray-400 line-through">₹{product.base_price}</span>
                              )}
                            </div>

                            {isPaid && (
                              <div className="bg-amber-50 rounded-xl p-3 border border-amber-100/50">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-amber-700 font-bold uppercase tracking-wide">Commission</span>
                                  <Zap size={12} className="text-amber-500" />
                                </div>
                                <p className="text-lg font-bold text-amber-600">₹{product.potential_commission}</p>
                                <p className="text-[10px] text-amber-500/80 leading-tight mt-1">
                                  Proj. Earnings: ₹{product.projected_earning}
                                </p>
                              </div>
                            )}

                            {/* Badges */}
                            <div className="flex flex-wrap gap-1 mt-3">
                              {product.top_selling_badge && (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-bold uppercase">
                                  <TrendingUp size={10} /> Top Selling
                                </span>
                              )}
                              {product.new_arrival_badge && (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold uppercase">
                                  New
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="promoted"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <PromotedProducts refresh={refreshPromoted} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AddPromotedProducts;
