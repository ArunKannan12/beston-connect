// components/admin/AdminProducts.jsx
import React, { useState, useEffect } from "react";
import axiosInstance from "../../../api/axiosinstance";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Package,
  Eye,
  EyeOff,
  Star,
  MoreVertical,
  ChevronDown,
  Grid3x3,
  List,
  X,
  Check,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
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
  const [showFilters, setShowFilters] = useState(false);
  const [variantsOpen, setVariantsOpen] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [targetProduct, setTargetProduct] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // grid or list
 

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
console.log(selectedProduct);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-600" />
            Products Management
          </h1>
          <p className="text-gray-500 mt-1">Manage your product inventory and catalog</p>
        </div>
        
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Products", value: stockCounts.all, icon: Package, color: "bg-blue-50 text-blue-600" },
          { label: "In Stock", value: stockCounts["in-stock"], icon: Check, color: "bg-green-50 text-green-600" },
          { label: "Low Stock", value: stockCounts["low-stock"], icon: AlertTriangle, color: "bg-yellow-50 text-yellow-600" },
          { label: "Out of Stock", value: stockCounts["out-of-stock"], icon: X, color: "bg-red-50 text-red-600" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-xl border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search products by name, category, or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showFilters 
                ? "bg-blue-50 border-blue-200 text-blue-600" 
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {showFilters && <ChevronDown className="w-4 h-4" />}
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded ${viewMode === "grid" ? "bg-white shadow-sm" : ""}`}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded ${viewMode === "list" ? "bg-white shadow-sm" : ""}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-gray-200"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>{c.name}</option>
                ))}
              </select>
              
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="all">All Stock</option>
                <option value="in-stock">In Stock</option>
                <option value="low-stock">Low Stock</option>
                <option value="out-of-stock">Out of Stock</option>
              </select>
              
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="all">All Availability</option>
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name-asc">Name A–Z</option>
                <option value="name-desc">Name Z–A</option>
                <option value="price-asc">Price Low → High</option>
                <option value="price-desc">Price High → Low</option>
              </select>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedProducts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-200 rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-blue-700 font-medium">
                {selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => setSelectedProducts([])}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkAction("set_featured", true)}
                className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                <Star className="w-4 h-4 inline mr-1" />
                Mark Featured
              </button>
              <button
                onClick={() => handleBulkAction("set_featured", false)}
                className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
              >
                Remove Featured
              </button>
              <button
                onClick={() => handleBulkAction("set_availability", true)}
                className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                <Eye className="w-4 h-4 inline mr-1" />
                Available
              </button>
              <button
                onClick={() => handleBulkAction("set_availability", false)}
                className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
              >
                <EyeOff className="w-4 h-4 inline mr-1" />
                Unavailable
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Products Display */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-500">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className={viewMode === "grid" 
          ? "grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
          : "space-y-4"
        }>
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
                className={viewMode === "grid" 
                  ? "bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all relative"
                  : "bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-all relative"
                }
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedProducts.includes(p.id)}
                  onChange={() => toggleSelectProduct(p.id)}
                  className="absolute top-3 right-3 z-10 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />

                {viewMode === "grid" ? (
                  <>
                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex gap-2 z-10">
                      {p.featured && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          Featured
                        </span>
                      )}
                      {isLowStock && (
                        <span className="bg-red-100 text-red-800 text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Low Stock
                        </span>
                      )}
                      {isNew && (
                        <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">
                          New
                        </span>
                      )}
                    </div>

                    {/* Product Image */}
                    <div className="relative w-full aspect-square bg-gray-100 overflow-hidden">
                      <img
                        src={fallbackImage}
                        alt={p.name}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        loading="lazy"
                      />
                      {!p.is_available && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                          <span className="text-white font-semibold">Unavailable</span>
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <div className="flex flex-col gap-2">
                        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{p.name}</h3>
                        <p className="text-sm text-gray-500">{p.category?.name || "Uncategorized"}</p>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-green-600">{priceDisplay}</span>
                          <span className={`text-sm font-medium ${
                            isLowStock ? "text-red-600" : "text-gray-600"
                          }`}>
                            {totalStock} in stock
                          </span>
                        </div>

                        {/* Variants Preview */}
                        {p.variants?.length > 1 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <button
                              onClick={() => setVariantsOpen(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                              {p.variants.length} variants {variantsOpen[p.id] ? '▲' : '▼'}
                            </button>
                            {variantsOpen[p.id] && (
                              <div className="mt-2 space-y-1 text-xs">
                                {p.variants.slice(0, 3).map((v) => (
                                  <div key={v.id} className="flex justify-between text-gray-600">
                                    <span className="truncate">{v.variant_name}</span>
                                    <span className="font-medium">₹{v.final_price} ({v.stock})</span>
                                  </div>
                                ))}
                                {p.variants.length > 3 && (
                                  <div className="text-center text-gray-500 pt-1">
                                    +{p.variants.length - 3} more
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => { setSelectedProduct(p); setShowAddModal(true); }}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(p)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  /* List View */
                  <div className="flex items-center gap-4">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(p.id)}
                      onChange={() => toggleSelectProduct(p.id)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />

                    {/* Product Image */}
                    <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={fallbackImage}
                        alt={p.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">{p.name}</h3>
                          <p className="text-sm text-gray-500">{p.category?.name || "Uncategorized"}</p>
                          
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-lg font-bold text-green-600">{priceDisplay}</span>
                            <span className={`text-sm font-medium ${
                              isLowStock ? "text-red-600" : "text-gray-600"
                            }`}>
                              {totalStock} in stock
                            </span>
                            <div className="flex gap-2">
                              {p.featured && (
                                <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-1 rounded-full">
                                  <Star className="w-3 h-3 inline mr-1" />
                                  Featured
                                </span>
                              )}
                              {isLowStock && (
                                <span className="bg-red-100 text-red-800 text-xs font-semibold px-2 py-1 rounded-full">
                                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                                  Low Stock
                                </span>
                              )}
                              {isNew && (
                                <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">
                                  New
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Variants */}
                          {p.variants?.length > 0 && (
                            <div className="mt-2 text-xs text-gray-600">
                              {p.variants.length} variant{p.variants.length > 1 ? 's' : ''} available
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => toggleFeatured(p)}
                            className={`p-2 rounded-lg transition-colors ${
                              p.featured 
                                ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" 
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            <Star className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleAvailability(p)}
                            className={`p-2 rounded-lg transition-colors ${
                              p.is_available 
                                ? "bg-green-100 text-green-700 hover:bg-green-200" 
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {p.is_available ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => { setSelectedProduct(p); setShowAddModal(true); }}
                            className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(p)}
                            className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

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
