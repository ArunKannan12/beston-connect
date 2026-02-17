import React, { useEffect, useState } from "react";
import axiosInstance from "../../api/axiosinstance";
import { toast } from "react-toastify";
import Category from "../../components/visitor/Category.jsx";
import FeaturedShimmer from "../../shimmer/FeaturedShimmer.jsx";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import CustomSortDropdown from "../helpers/CustomSortDropDown.jsx";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, X, ShoppingBag, Star, CheckCircle2 } from "lucide-react";

const Store = () => {
  const { categorySlug } = useParams();
  const { search, pathname } = useLocation();
  const searchParams = new URLSearchParams(search);
  const navigate = useNavigate();

  // Read filters directly from URL (Single Source of Truth)
  const searchQuery = searchParams.get("search") || "";
  const featured = searchParams.get("featured") === "true";
  const available = searchParams.get("is_available") === "true";
  const ordering = searchParams.get("ordering") || "";

  const [showFilters, setShowFilters] = useState(false);
  const [variants, setVariants] = useState([]);
  const [loadingVariants, setLoadingVariants] = useState(true);

  const fetchVariants = async () => {
    setLoadingVariants(true);
    try {
      const params = {
        category_slug: categorySlug || undefined,
        featured: featured ? "true" : undefined,
        is_available: available ? "true" : undefined,
        ordering: ordering || undefined,
        search: searchQuery || undefined,
      };
      const res = await axiosInstance.get("variants/", { params });
      setVariants(res.data.results || res.data);
    } catch (error) {
      console.error("Error fetching variants:", error);
      toast.error("Failed to load variants!");
    } finally {
      setLoadingVariants(false);
    }
  };

  // Effect: Fetch variants whenever URL parameters change
  useEffect(() => {
    fetchVariants();
  }, [categorySlug, featured, available, ordering, searchQuery]);

  // Helper to update URL params
  const updateFilters = (changes) => {
    const newParams = new URLSearchParams(searchParams);

    Object.entries(changes).forEach(([key, value]) => {
      if (value === undefined || value === null || value === false || value === "") {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });

    navigate({
      pathname: pathname,
      search: newParams.toString(),
    });
  };

  const clearFilters = () => {
    navigate(pathname); // Clears all search params, keeps category path
  };

  const handleCategorySelect = (slug) => {
    navigate(slug ? `/store/${slug}` : "/store");
    setShowFilters(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50/50 to-blue-50/30">

      {/* Page Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-100/80">
        <div className="max-w-screen-2xl mx-auto px-6 py-16 md:py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                <ShoppingBag size={28} />
              </div>
              <div className="text-left">
                <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent tracking-tight">
                  {categorySlug
                    ? <span className="capitalize">{categorySlug.replace(/-/g, ' ')} Collection</span>
                    : "Explore Our Store"
                  }
                </h1>
                <p className="text-xl text-gray-500 font-medium mt-2">
                  Discover premium products curated for quality and style
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-8">
        <div className="flex flex-col xl:flex-row gap-10">

          {/* Sidebar (Desktop) */}
          <aside className="hidden xl:block w-80 flex-shrink-0 sticky top-28 self-start">
            <div className="bg-white/80 backdrop-blur-xl rounded-[3rem] shadow-xl border border-gray-100/60 p-8">
              <Category
                selectedCategorySlug={categorySlug}
                onSelectCategory={handleCategorySelect}
              />
            </div>
          </aside>

          {/* Mobile Filter Toggle */}
          <div className="xl:hidden mb-4">
            <button
              onClick={() => setShowFilters(true)}
              className="w-full flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-xl border border-gray-100/60 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 group"
            >
              <span className="font-bold text-gray-700 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-white shadow-md group-hover:shadow-lg transition-all">
                  <Filter size={18} />
                </div>
                Filters & Categories
              </span>
              <span className="text-indigo-600 text-sm font-semibold px-3 py-1 bg-indigo-50 rounded-full">
                {categorySlug ? "1 Selected" : "Select"}
              </span>
            </button>
          </div>

          {/* Mobile Filter Drawer */}
          <AnimatePresence>
            {showFilters && (
              <>
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setShowFilters(false)}
                  className="fixed inset-0 bg-black/40 z-50 lg:hidden backdrop-blur-sm"
                />
                <motion.div
                  initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="fixed inset-y-0 right-0 w-96 bg-white/95 backdrop-blur-xl z-[60] shadow-2xl overflow-y-auto xl:hidden"
                >
                  <div className="p-6 border-b border-gray-100/60 flex items-center justify-between">
                    <h3 className="font-black text-xl text-gray-900">Filters</h3>
                    <button onClick={() => setShowFilters(false)} className="p-3 text-gray-400 hover:text-gray-900 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-6">
                    <Category
                      selectedCategorySlug={categorySlug}
                      onSelectCategory={handleCategorySelect}
                    />
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Main Content */}
          <div className="flex-1">

            {/* Controls Bar */}
            <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-6 shadow-lg border border-gray-100/60 mb-8 flex flex-col md:flex-row items-center gap-6 justify-between">
              <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">

                <FilterButton
                  active={featured}
                  onClick={() => updateFilters({ featured: !featured ? "true" : undefined })}
                  label="Featured"
                  icon={Star}
                  color="amber"
                />

                <FilterButton
                  active={available}
                  onClick={() => updateFilters({ is_available: !available ? "true" : undefined })}
                  label="In Stock"
                  icon={CheckCircle2}
                  color="emerald"
                />

                {(featured || available || ordering) && (
                  <button
                    onClick={clearFilters}
                    className="px-6 py-3 rounded-2xl text-sm font-bold text-gray-500 hover:text-gray-900 bg-gray-50/80 hover:bg-gray-100 transition-all duration-300 whitespace-nowrap border border-gray-200/60 hover:border-gray-300"
                  >
                    Reset All
                  </button>
                )}
              </div>

              <div className="w-full md:w-auto">
                <CustomSortDropdown
                  ordering={ordering}
                  updateFilters={(newFilters) => updateFilters(newFilters)}
                />
              </div>
            </div>

            {/* Grid */}
            {loadingVariants ? (
              <FeaturedShimmer />
            ) : variants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 bg-white/80 backdrop-blur-xl rounded-[3rem] border border-dashed border-gray-200/60 text-center max-w-2xl mx-auto shadow-lg">
                <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-6">
                  <ShoppingBag size={40} className="text-gray-300" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">No products found</h3>
                <p className="text-gray-500 max-w-md mb-8 text-lg">
                  We couldn't find any products matching your filters. Try adjusting them or clear all filters.
                </p>
                <button
                  onClick={clearFilters}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  View All Products
                </button>
              </div>
            ) : (
              <motion.div
                layout
                className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
              >
                {variants.map((variant, i) => (
                  <ProductCard key={variant.id} variant={variant} index={i} />
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-components for cleaner code
const FilterButton = ({ active, onClick, label, icon: Icon, color }) => {
  const activeClass = color === 'amber' ? 'bg-gradient-to-r from-amber-100 to-amber-50 text-amber-800 border-amber-200 shadow-md shadow-amber-200/50' : 'bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-800 border-emerald-200 shadow-md shadow-emerald-200/50';

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-5 py-3 rounded-2xl text-sm font-bold border transition-all duration-300 whitespace-nowrap ${active ? activeClass : "bg-white/80 text-gray-600 border-gray-200/60 hover:border-gray-300/80 hover:bg-gray-50/80 hover:shadow-md"
        }`}
    >
      <Icon size={18} className={active ? "" : "text-gray-400"} fill={active ? "currentColor" : "none"} />
      {label}
    </button>
  );
};

const ProductCard = ({ variant, index }) => {
  const isNew = variant.is_new;
  const imageUrl = variant.primary_image_url || "/placeholder.png";

  const toSlug = (text) =>
    text.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      whileHover={{ y: -8 }}
      className="group bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-gray-100/60 overflow-hidden hover:shadow-2xl hover:border-gray-200/80 transition-all duration-500 flex flex-col h-full"
    >
      <Link
        to={`/products/${toSlug(variant.product_name)}/?variant=${toSlug(variant.variant_name)}${variant.referral_code ? `&ref=${variant.referral_code}` : ""}`}
        className="flex flex-col h-full"
      >
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <img
            src={imageUrl}
            alt={variant.variant_name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 relative z-10"
          />
          {isNew && (
            <span className="absolute top-4 right-4 bg-gradient-to-r from-pink-500 to-pink-600 text-white text-xs font-black px-3 py-1.5 rounded-2xl shadow-lg shadow-pink-500/25">
              NEW ARRIVAL
            </span>
          )}
          {variant.featured && (
            <span className="absolute top-4 left-4 bg-gradient-to-r from-amber-400 to-amber-500 text-white text-xs font-black px-3 py-1.5 rounded-2xl shadow-lg shadow-amber-400/25 flex items-center gap-2">
              <Star size={12} fill="currentColor" /> Featured
            </span>
          )}
          <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-3 py-2 text-center">
              <span className="text-xs font-bold text-blue-600">Quick View</span>
            </div>
          </div>
        </div>

        <div className="p-6 flex flex-col flex-grow">
          <h3 className="text-gray-900 font-black text-base leading-snug mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
            {variant.product_name}
            {variant.variant_name && <span className="text-gray-400 font-normal block text-sm mt-1">{variant.variant_name}</span>}
          </h3>

          <div className="mt-auto pt-4">
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-xl font-black text-gray-900">₹{Number(variant.offer_price || variant.base_price).toFixed(2)}</span>
              {Number(variant.offer_price) < Number(variant.base_price) && (
                <span className="text-sm text-gray-400 line-through">₹{Number(variant.base_price).toFixed(2)}</span>
              )}
            </div>

            {variant.rating_count > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex text-amber-400 text-xs">
                  {"★".repeat(Math.round(variant.average_rating))}
                  <span className="text-gray-200">
                    {"★".repeat(5 - Math.round(variant.average_rating))}
                  </span>
                </div>
                <span className="text-xs text-gray-400">({variant.rating_count})</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default Store;