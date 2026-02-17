// components/admin/AdminCategories.jsx
import React, { useState, useEffect } from "react";
import axiosInstance from "../../../api/axiosinstance";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import {
  Edit,
  Trash2,
  Plus,
  Search,
  Grid3x3,
  Folder,
  MoreVertical,
  Eye,
  EyeOff,
  Package,
  Image as ImageIcon,
} from "lucide-react";
import CategoryModal from "../modals/CategoryModal";
import ConfirmDelete from "../helpers/ConfirmDelete";
import AdminCategoriesShimmer from "../../../shimmer/AdminCategoriesShimmer";

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // grid or list

  // ----------------- Fetch categories -----------------
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("categories/", {
        params: { search: search || "" },
      });
      setCategories(res.data.results);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to fetch categories");
    }
    setLoading(false);
  };

  useEffect(() => {
    const delayDebounce = setTimeout(fetchCategories, 500);
    return () => clearTimeout(delayDebounce);
  }, [search]);

  // ----------------- Delete category -----------------
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await axiosInstance.delete(`/categories/${deleteTarget.slug}/`);
      toast.success("Category deleted");
      setCategories((prev) => prev.filter((c) => c.slug !== deleteTarget.slug));
    } catch {
      toast.error("Failed to delete category");
    } finally {
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Folder className="w-8 h-8 text-blue-600" />
            Categories Management
          </h1>
          <p className="text-gray-500 mt-1">Manage your product categories and organization</p>
        </div>
        
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button
            onClick={() => {
              setSelectedCategory(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search categories by name or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

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
              <Package className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Categories Display */}
      {loading ? (
        <AdminCategoriesShimmer />
      ) : categories.length === 0 ? (
        <div className="text-center py-12">
          <Folder className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
          <p className="text-gray-500">Try adjusting your search or create a new category</p>
        </div>
      ) : (
        <div className={viewMode === "grid" 
          ? "grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
          : "space-y-4"
        }>
          {categories.map((c, i) => (
            <motion.div
              key={c.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={viewMode === "grid" 
                ? "bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all relative group"
                : "bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-all relative group"
              }
            >
              {viewMode === "grid" ? (
                <>
                  {/* Category Image */}
                  <div className="relative w-full aspect-[4/3] bg-gray-100 overflow-hidden">
                    {c.image_url ? (
                      <img
                        src={c.image_url}
                        alt={c.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    
                    {/* Quick Actions Overlay */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedCategory(c);
                            setShowAddModal(true);
                          }}
                          className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white transition-colors shadow-sm"
                        >
                          <Edit className="w-4 h-4 text-gray-700" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteTarget(c);
                            setShowDeleteModal(true);
                          }}
                          className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white transition-colors shadow-sm"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Category Info */}
                  <div className="p-4">
                    <div className="flex flex-col gap-2">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">{c.name}</h3>
                      <p className="text-sm text-gray-500 truncate">/{c.slug}</p>
                    </div>
                  </div>
                </>
              ) : (
                /* List View */
                <div className="flex items-center gap-4">
                  {/* Category Image */}
                  <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {c.image_url ? (
                      <img
                        src={c.image_url}
                        alt={c.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Category Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{c.name}</h3>
                    <p className="text-sm text-gray-500">/{c.slug}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => {
                        setSelectedCategory(c);
                        setShowAddModal(true);
                      }}
                      className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setDeleteTarget(c);
                        setShowDeleteModal(true);
                      }}
                      className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Category Modal */}
      {showAddModal && (
        <CategoryModal
          category={selectedCategory}
          onClose={() => {
            setShowAddModal(false);
            setSelectedCategory(null);
          }}
          onSuccess={fetchCategories}
        />
      )}

      {/* Confirm Delete Modal */}
      <ConfirmDelete
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        itemName={deleteTarget?.name || "this category"}
      />
    </div>
  );
};

export default AdminCategories;
