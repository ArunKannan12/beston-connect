import React, { useEffect, useState } from "react";
import axiosInstance from "../../api/axiosinstance";
import { toast } from "react-toastify";
import CategoryShimmer from '../../shimmer/CategoryShimmer.jsx'
import { motion } from "framer-motion";
import { LayoutGrid } from "lucide-react";

const Category = ({ onSelectCategory, selectedCategorySlug }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    try {
      const response = await axiosInstance.get("categories/");
      setCategories(response.data.results || response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to load categories!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  if (loading) return <CategoryShimmer />;

  if (!categories.length) {
    return (
      <div className="p-6 text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <LayoutGrid size={24} className="text-gray-300" />
        </div>
        <p className="text-gray-500 font-medium">No categories found.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-6 px-2">
        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
          <LayoutGrid size={18} className="text-white" />
        </div>
        <h3 className="text-xl font-black text-gray-900">Categories</h3>
      </div>

      <div className="flex flex-col gap-3">
        <motion.button
          whileHover={{ x: 6 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelectCategory && onSelectCategory(null)}
          className={`w-full text-left px-5 py-4 rounded-2xl transition-all duration-300 flex items-center justify-between group ${!selectedCategorySlug
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 border border-transparent"
              : "bg-white/80 text-gray-600 hover:bg-gray-50 hover:text-blue-600 border border-gray-100/60 hover:border-gray-200/80 hover:shadow-md"
            }`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold transition-all duration-300 ${!selectedCategorySlug ? "bg-white/20 text-white shadow-inner" : "bg-gradient-to-br from-gray-100 to-gray-200 text-gray-500 border border-gray-200/60"
              }`}>
              <span className="text-lg">🌟</span>
            </div>
            <div>
              <span className="font-bold text-base">All Products</span>
              <p className="text-xs opacity-70 mt-0.5">Browse entire collection</p>
            </div>
          </div>
          {!selectedCategorySlug && (
            <motion.div layoutId="activeCatIndicator" className="w-2 h-2 rounded-full bg-white shadow-lg" />
          )}
        </motion.button>

        {categories.map((category) => {
          const isSelected = selectedCategorySlug === category.slug;
          return (
            <motion.button
              key={category.id}
              whileHover={{ x: 6 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectCategory && onSelectCategory(category.slug)}
              className={`w-full text-left px-4 py-3.5 rounded-2xl transition-all duration-300 flex items-center justify-between group overflow-hidden ${isSelected
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 border border-transparent"
                  : "bg-white/80 text-gray-600 hover:bg-gray-50 hover:shadow-md border border-gray-100/60 hover:border-gray-200/80"
                }`}
            >
              <div className="flex items-center gap-4 overflow-hidden">
                <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0 border border-gray-100/60 shadow-inner group-hover:shadow-lg transition-all duration-300">
                  {category.image_url ? (
                    <img
                      src={category.image_url}
                      alt={category.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                      <span className="text-lg">📦</span>
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-2xl"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-base truncate block">{category.name}</span>
                  <p className="text-xs opacity-70 mt-0.5 truncate">Explore collection</p>
                </div>
              </div>

              {isSelected && (
                <motion.div layoutId="activeCatIndicator" className="w-2 h-2 rounded-full bg-white shadow-lg flex-shrink-0" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default Category;
