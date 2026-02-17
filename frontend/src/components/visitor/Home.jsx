import React, { useEffect, useState } from "react";
import BannerSlider from "./BannerSlide";
import axiosInstance from "../../api/axiosinstance";
import FeaturedShimmer from "../../shimmer/FeaturedShimmer.jsx";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, TrendingUp, Star } from "lucide-react";

const Home = () => {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchFeaturedProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axiosInstance.get("products/featured/");
      const data = res.data.results;
      setFeatured(data);
    } catch (err) {
      setError(err.message || "Failed to load featured products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Hero Section */}
      <section className="relative w-full overflow-hidden mb-12">
        <BannerSlider />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none" />
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles size={14} /> New Collection Available
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Beston</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover premium products curated just for you. Quality, style, and innovation delivered to your doorstep.
          </p>
        </motion.div>

        {/* Featured Products */}
        <section>
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="text-amber-500" /> Featured Products
              </h2>
              <p className="text-sm text-gray-500 mt-1">Hand-picked items you'll love</p>
            </div>
            <Link to="/store" className="group flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
              View All <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-center mb-8">
              {error}
            </div>
          )}

          {loading ? (
            <FeaturedShimmer />
          ) : featured.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <p className="text-gray-500 text-lg">No featured products found.</p>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {featured.map((variant) => {
                const finalPrice = parseFloat(variant.final_price || "0");
                const basePrice = parseFloat(variant.base_price || "0");
                const isDiscounted = basePrice > 0 && finalPrice < basePrice;
                const discountPercent = isDiscounted
                  ? Math.round(((basePrice - finalPrice) / basePrice) * 100)
                  : 0;

                const imageUrl =
                  variant.primary_image_url ||
                  variant.images?.[0]?.image_url ||
                  variant.product_category?.image_url ||
                  "/placeholder.png";

                const toSlug = (text) =>
                  text.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

                return (
                  <motion.div
                    key={variant.id}
                    variants={itemVariants}
                    whileHover={{ y: -5 }}
                    className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300"
                  >
                    <Link to={`/products/${variant.product_slug}?variant=${toSlug(variant.variant_name)}`} className="block h-full flex flex-col">

                      {/* Image Container */}
                      <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
                        <img
                          src={imageUrl}
                          alt={variant.variant_name}
                          loading="lazy"
                          className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
                        />

                        {/* Badges */}
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          {variant.featured && (
                            <span className="bg-amber-400 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                              <Star size={10} fill="currentColor" /> Featured
                            </span>
                          )}
                          {variant.is_new && (
                            <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                              New
                            </span>
                          )}
                        </div>

                        {/* Discount Badge */}
                        {isDiscounted && (
                          <div className="absolute bottom-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
                            -{discountPercent}%
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-4 flex flex-col flex-1">
                        <div className="mb-2">
                          <h3 className="text-gray-900 font-semibold text-sm leading-tight line-clamp-2 group-hover:text-indigo-600 transition-colors">
                            {variant.product_name}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">{variant.variant_name}</p>
                        </div>

                        <div className="mt-auto pt-2 border-t border-gray-50 flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-lg font-bold text-gray-900">₹{finalPrice.toFixed(2)}</span>
                            {isDiscounted && (
                              <span className="text-xs text-gray-400 line-through">₹{basePrice.toFixed(2)}</span>
                            )}
                          </div>

                          {/* Add Token / Cart Button Placeholder */}
                          <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            <ArrowRight size={16} />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Home;
