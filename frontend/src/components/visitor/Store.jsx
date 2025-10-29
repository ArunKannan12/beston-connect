import React, { useEffect, useState } from "react";
import axiosInstance from "../../api/axiosinstance";
import { toast } from "react-toastify";
import Category from "../../components/visitor/Category.jsx";
import FeaturedShimmer from "../../shimmer/FeaturedShimmer.jsx";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import CustomSortDropdown from "../helpers/CustomSortDropDown.jsx";
import { motion } from "framer-motion";

const Store = () => {
  const { categorySlug } = useParams();
  const { search } = useLocation();
  const searchParams = new URLSearchParams(search);
  const searchQuery = searchParams.get("search") || "";

  const [showFilters, setShowFilters] = useState(false);
  const [variants, setVariants] = useState([]);
  const [loadingVariants, setLoadingVariants] = useState(true);
  const [featuredFilter, setFeaturedFilter] = useState(false);
  const [availableFilter, setAvailableFilter] = useState(false);
  const [ordering, setOrdering] = useState("");

  const navigate = useNavigate();

  // Sync filters from URL on initial load
  useEffect(() => {
    const featured = searchParams.get("featured") === "true";
    const available = searchParams.get("is_available") === "true";
    const orderingParam = searchParams.get("ordering") || "";

    setFeaturedFilter(featured);
    setAvailableFilter(available);
    setOrdering(orderingParam);
  }, []);

  const fetchVariants = async () => {
    setLoadingVariants(true);
    try {
      const params = {
        category_slug: categorySlug || undefined,
        featured: featuredFilter ? "true" : undefined,
        is_available: availableFilter ? "true" : undefined,
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

  const updateFilters = (newFilters = {}) => {
    if (newFilters.ordering !== undefined) {
      setOrdering(newFilters.ordering);
    }

    const updated = {
      category_slug: categorySlug || undefined,
      featured: featuredFilter ? "true" : undefined,
      is_available: availableFilter ? "true" : undefined,
      ordering: (newFilters.ordering ?? ordering) || undefined,
      search: searchQuery || undefined,
    };

    Object.keys(updated).forEach((key) => {
      if (updated[key] === undefined || updated[key] === false) delete updated[key];
    });

    navigate({
      pathname: categorySlug ? `/store/${categorySlug}` : "/store",
      search: new URLSearchParams(updated).toString(),
    });
  };

  useEffect(() => {
    fetchVariants();
  }, [categorySlug, featuredFilter, availableFilter, ordering, searchQuery]);

  const handleCategorySelect = (slug) => {
    navigate(slug ? `/store/${slug}` : "/store");
  };

  return (
    <div className="px-4 sm:px-8 lg:px-12 py-6 sm:py-10 min-h-screen">
  {/* Hero Section */}
  <div className="text-center mb-10 relative">
    <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 text-gray-900">
      Discover Our Collection
    </h1>
    <p className="text-lg text-gray-600 mb-6">
      Handpicked products just for you
    </p>
  </div>

  <div className="flex flex-col md:flex-row gap-8">
    {/* Sidebar */}
    <aside className="hidden md:block w-full md:w-64 sticky top-24 self-start p-5 bg-white rounded-3xl shadow-xl border border-gray-100 overflow-y-auto max-h-[80vh]">
      <Category
        selectedCategorySlug={categorySlug}
        onSelectCategory={handleCategorySelect}
      />
    </aside>

    {/* Mobile Filters */}
    <div className="md:hidden mb-4">
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="w-full bg-indigo-600 text-white rounded-2xl py-2 font-semibold shadow-md"
      >
        {showFilters ? "Hide Categories" : "Show Categories"}
      </button>
      {showFilters && (
        <div className="mt-3 bg-white rounded-2xl shadow-md p-5 border border-gray-200">
          <Category
            selectedCategorySlug={categorySlug}
            onSelectCategory={handleCategorySelect}
          />
        </div>
      )}
    </div>

    {/* Main Content */}
    <div className="flex-1 flex flex-col overflow-auto">
      {/* Filter Bar */}
      <div className="w-full bg-white rounded-3xl shadow-md border border-gray-100 p-5 mb-6 flex flex-wrap items-center gap-4 justify-between">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              const newState = !featuredFilter;
              setFeaturedFilter(newState);
              updateFilters({ featured: newState ? "true" : undefined });
            }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              featuredFilter
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Featured
          </button>

          <button
            onClick={() => {
              const newState = !availableFilter;
              setAvailableFilter(newState);
              updateFilters({ is_available: newState ? "true" : undefined });
            }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              availableFilter
                ? "bg-green-600 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            In Stock
          </button>

          <button
            onClick={() => {
              setFeaturedFilter(false);
              setAvailableFilter(false);
              setOrdering("");
              navigate("/store");
            }}
            className="px-4 py-2 rounded-full text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
          >
            Clear Filters
          </button>
        </div>

        <div>
          <CustomSortDropdown ordering={ordering} updateFilters={updateFilters} />
        </div>
      </div>

      {/* Variant Grid */}
      <section className="flex-1 overflow-auto">
        {loadingVariants ? (
          <FeaturedShimmer />
        ) : variants.length > 0 ? (
          <motion.div
            layout
            className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
          >
            {variants.map((variant, i) => {
              const imageUrl = variant.primary_image_url || "/placeholder.png";
              const price = variant.final_price;
              const productSlug = variant.product_slug;
              const productName = variant.product_name;
              const variantLabel = variant.variant_name;
              const isNew = variant.is_new;

              return (
                <motion.div
                  key={variant.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col hover:shadow-xl transition-all duration-300 group"
                >
                  <Link
                    to={`/products/${productSlug}?variant=${variant.id}`}
                    className="flex flex-col h-full"
                  >
                    {/* Image */}
                    <div className="relative w-full aspect-square overflow-hidden">
                      <img
                        src={imageUrl}
                        alt={variantLabel || productName}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {isNew && (
                        <span className="absolute top-2 right-2 bg-pink-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow">
                          New
                        </span>
                      )}
                    </div>

                    {/* Details */}
                    <div className="p-4 flex flex-col flex-grow">
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate capitalize group-hover:text-indigo-600 transition">
                        {productName}
                        {variantLabel && (
                          <span className="ml-1 text-xs sm:text-sm text-gray-500">({variantLabel})</span>
                        )}
                      </h3>

                      {/* Price */}
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {variant.offer_price && variant.offer_price < variant.base_price ? (
                          <>
                            <span className="text-base sm:text-lg font-bold text-gray-900">
                              ₹{variant.offer_price}
                            </span>
                            <span className="text-sm sm:text-base text-gray-400 line-through">
                              ₹{variant.base_price}
                            </span>
                          </>
                        ) : (
                          <span className="text-base sm:text-lg font-bold text-gray-900">
                            ₹{variant.base_price}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <div className="text-center text-gray-500 mt-20">
            <h2 className="text-xl sm:text-2xl font-semibold mb-2">No variants found</h2>
            <p className="text-sm sm:text-base">Try adjusting your search or filters.</p>
            <button
              onClick={() => navigate("/store")}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition"
            >
              Reset Filters
            </button>
          </div>
        )}
      </section>
    </div>
  </div>
</div>

  );
};

export default Store;
