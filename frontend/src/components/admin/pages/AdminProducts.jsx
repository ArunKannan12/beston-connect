// components/admin/AdminProducts.jsx
import React, { useState, useEffect } from "react";
import axiosInstance from "../../../api/axiosinstance";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import {
  FaEdit,
  FaTrash,
  FaPlus,
  FaSearch,
  FaBoxes,
  FaFilter
} from "react-icons/fa";
import ProductModal from "../modals/ProductModal";
import ConfirmDelete from "../helpers/ConfirmDelete";

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(true);
  const [variantsOpen, setVariantsOpen] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [targetProduct, setTargetProduct] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
 

  // ---------------- Fetch categories ----------------
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axiosInstance.get("/categories/");
        setCategories(res.data.results);
      } catch (err) {
        toast.error(err?.response?.data?.detail || "Failed to load categories");
      }
    };
    fetchCategories();
  }, []);

  // ---------------- Fetch products ----------------
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/products/", {
        params: {
          search: search || "",
          category_slug: selectedCategory || "",
          stock: stockFilter !== "all" ? stockFilter : "",
          availability: availability,
          ordering: sortBy,
        },
      });
      setProducts(res.data.results);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to fetch products");
    }
    setLoading(false);
  };

  useEffect(() => {
    const delayDebounce = setTimeout(fetchProducts, 400);
    return () => clearTimeout(delayDebounce);
  }, [search, selectedCategory, stockFilter, availability, sortBy]);

  // ---------------- Delete product ----------------
  const handleDelete = async (id) => {
    try {
      await axiosInstance.delete(`admin/products/${id}/`);
      toast.success("Product deleted");
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      toast.error("Failed to delete product");
    }
  };

  const handleDeleteClick = (product) => {
    setTargetProduct(product);
    setShowConfirm(true);
  };

  const cancelDelete = () => {
    setShowConfirm(false);
    setTargetProduct(null);
  };

  
const confirmDelete = async () => {
  if (targetProduct) {
    await handleDelete(targetProduct.id);
  }
  setShowConfirm(false);
  setTargetProduct(null);
};


  // ---------------- Featured & Availability Toggle ----------------
  const toggleFeatured = async (product) => {
    try {
      await axiosInstance.patch(`/products/${product.id}/`, {
        featured: !product.featured,
      });
      toast.success(`${product.name} is now ${!product.featured ? "featured" : "not featured"}`);
      fetchProducts();
    } catch {
      toast.error("Failed to update featured status");
    }
  };

  const toggleAvailability = async (product) => {
    try {
      await axiosInstance.patch(`/products/${product.id}/`, {
        is_available: !product.is_available,
      });
      toast.success(`${product.name} is now ${!product.is_available ? "available" : "unavailable"}`);
      fetchProducts();
    } catch {
      toast.error("Failed to update availability");
    }
  };


  // ---------------- Bulk selection & actions ----------------
  const toggleSelectProduct = (id) => {
    setSelectedProducts(prev =>
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const handleBulkAction = async (action, value = null) => {
    if (selectedProducts.length === 0) return toast.warn("No products selected");
    try {
      const res = await axiosInstance.post("admin/products/bulk-action/", {
        ids: selectedProducts,
        action,
        value,
      });
      toast.success(`${res.data.updated || res.data.deleted} products updated`);
      setSelectedProducts([]);
      fetchProducts();
    } catch (err) {
      console.error(err);
      toast.error("Bulk action failed");
    }
  };

  // ---------------- Helpers ----------------
  const computeStockStatus = (variants) => {
    const totalStock = variants?.reduce((sum, v) => sum + v.stock, 0) || 0;
    const isLowStock = variants?.some((v) => v.stock > 0 && v.stock <= 5);
    return { totalStock, isLowStock };
  };

  const computePriceRange = (variants) => {
    if (!variants?.length) return "-";
    const prices = variants.map((v) => v.final_price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    return minPrice === maxPrice ? `₹${minPrice}` : `₹${minPrice} - ₹${maxPrice}`;
  };

  const stockCounts = {
    all: products.length,
    "in-stock": products.filter((p) => p.variants?.some((v) => v.stock > 5)).length,
    "low-stock": products.filter((p) => p.variants?.some((v) => v.stock > 0 && v.stock <= 5)).length,
    "out-of-stock": products.filter((p) => p.variants?.every((v) => v.stock === 0)).length,
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <FaBoxes className="text-blue-500" /> Products
        </h2>

        <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
          <div className="relative flex-1 min-w-[220px]">
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 outline-none"
            />
            <FaSearch className="absolute left-3 top-2.5 text-gray-400" />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1 px-4 py-2 bg-gray-200 rounded-lg shadow-sm hover:bg-gray-300 transition"
          >
            <FaFilter /> Filters
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border rounded-lg shadow-sm bg-white"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg shadow-sm bg-white"
          >
            <option value="all">All Stock ({stockCounts.all})</option>
            <option value="in-stock">In Stock ({stockCounts["in-stock"]})</option>
            <option value="low-stock">Low Stock ({stockCounts["low-stock"]})</option>
            <option value="out-of-stock">Out of Stock ({stockCounts["out-of-stock"]})</option>
          </select>
          <select
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            className="px-3 py-2 border rounded-lg shadow-sm bg-white"
          >
            <option value="all">All Availability</option>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border rounded-lg shadow-sm bg-white"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name-asc">Name A–Z</option>
            <option value="name-desc">Name Z–A</option>
            <option value="price-asc">Price Low → High</option>
            <option value="price-desc">Price High → Low</option>
          </select>
        </div>
      )}

      {/* Bulk Action Buttons */}
      {selectedProducts.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => handleBulkAction("set_featured", true)} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Mark Featured</button>
          <button onClick={() => handleBulkAction("set_featured", false)} className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700">Mark Not Featured</button>
          <button onClick={() => handleBulkAction("set_availability", true)} className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">Mark Available</button>
          <button onClick={() => handleBulkAction("set_availability", false)} className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700">Mark Unavailable</button>
        </div>
      )}

      {/* Products Grid */}
      {loading ? (
        <p className="text-center text-gray-500 mt-10">Loading products...</p>
      ) : products.length === 0 ? (
        <p className="text-center text-gray-500 mt-10">No products found.</p>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p, i) => {
            const { totalStock, isLowStock } = computeStockStatus(p.variants);
            const priceDisplay = computePriceRange(p.variants);
            const isNew = p.variants?.some((v) => v.is_new);
            const fallbackImage =
              p.image_url ||
              p.variants?.[0]?.images?.[0]?.image_url ||
              "https://yourdomain.com/static/no-image.png";

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all overflow-hidden relative flex flex-col"
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedProducts.includes(p.id)}
                  onChange={() => toggleSelectProduct(p.id)}
                  className="absolute top-2 right-2 z-10"
                />

                {/* Badges */}
                <div className="absolute top-2 left-2 flex gap-1 z-10">
                  {p.featured && (
                    <span className="bg-yellow-400 text-white text-xs font-semibold px-2 py-1 rounded">
                      Featured
                    </span>
                  )}
                  {isLowStock && (
                    <span className="bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded">
                      Low Stock
                    </span>
                  )}
                </div>
                {isNew && (
                  <span className="absolute top-2 right-10 bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded z-10">
                    New
                  </span>
                )}

                {/* Product Image */}
                <div className="relative w-full aspect-[4/3] bg-gray-100 overflow-hidden rounded-t-md">
                  <img
                    src={fallbackImage}
                    alt={p.name}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    loading="lazy"
                  />
                </div>

                {/* Product Info */}
                <div className="p-3 flex flex-col justify-between flex-1">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-md sm:text-lg font-semibold text-gray-800 truncate">{p.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">{p.category?.name || "Uncategorized"}</p>
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className="font-bold text-green-600">{priceDisplay}</span>
                      <span className={`${isLowStock ? "text-red-500 font-semibold" : "text-gray-600"}`}>
                        Stock: {totalStock}
                      </span>
                    </div>

                    {/* Collapsible variants */}
                    {p.variants?.length > 0 && (
                      <div className="mt-2 border-t pt-2">
                        <button
                          className="lg:hidden text-sm text-blue-600 mb-1"
                          onClick={() =>
                            setVariantsOpen((prev) => ({ ...prev, [p.id]: !prev[p.id] }))
                          }
                        >
                          {variantsOpen[p.id] ? "Hide Variants ▲" : "View Variants ▼"}
                        </button>
                        <div className={`${variantsOpen[p.id] ? "block" : "hidden"} lg:block space-y-1 text-xs`}>
                          {p.variants.map((v) => (
                            <div key={v.id} className="flex justify-between">
                              <span className="truncate">{v.variant_name}</span>
                              <span className={`font-semibold ${v.stock <= 5 ? "text-red-500" : "text-gray-800"}`}>
                                ₹{v.final_price} ({v.stock})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row justify-between mt-3 gap-2">
                    <div className="flex gap-2 justify-start">
                      <button
                        onClick={() => { setSelectedProduct(p); setShowAddModal(true); }}
                        className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-blue-600 hover:text-blue-800 rounded-lg text-xs sm:text-sm w-full sm:w-auto justify-center"
                      >
                        <FaEdit /> Edit
                      </button>
                    </div>
                    <div className="flex gap-2 justify-end mt-2 sm:mt-0">
                      <button
                        onClick={() => handleDeleteClick(p)}
                        className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-red-600 hover:text-red-800 rounded-lg text-xs sm:text-sm w-full sm:w-auto justify-center"
                      >
                        <FaTrash /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Floating Add Button */}
      <button
        onClick={() => { setSelectedProduct(null); setShowAddModal(true); }}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition transform hover:scale-110"
      >
        <FaPlus />
      </button>

      {/* Product Modal */}
      {showAddModal && (
        <ProductModal
          product={selectedProduct}
          onClose={() => {
            setShowAddModal(false);
            setSelectedProduct(null);
          }}
          onSuccess={fetchProducts}
        />
      )}


      <ConfirmDelete
        isOpen={showConfirm}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        itemName={targetProduct?.name}
      />
    </div>
  );
};

export default AdminProducts;
