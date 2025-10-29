// components/admin/AdminCategories.jsx
import React, { useState, useEffect } from "react";
import axiosInstance from "../../../api/axiosinstance";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import {
  FaEdit,
  FaTrash,
  FaPlus,
  FaSearch,
  FaThLarge,
} from "react-icons/fa";
import CategoryModal from "../modals/CategoryModal";
import ConfirmDelete from "../helpers/ConfirmDelete";

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // ✅ track category to delete
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
    <div className="p-6 bg-gray-50 min-h-screen relative">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-6">
        <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <FaThLarge className="text-blue-500" /> Categories
        </h2>

        <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 outline-none"
            />
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      {loading ? (
        <p className="text-center text-gray-500">Loading categories...</p>
      ) : categories.length === 0 ? (
        <p className="text-center text-gray-500">No categories found.</p>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c, i) => (
            <motion.div
              key={c.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all overflow-hidden flex flex-col relative"
            >
              {/* Category Image */}
            <div className="w-full aspect-[4/3] bg-gray-100 flex items-center justify-center">
              {c.image_url ? (
                <img
                  src={c.image_url}
                  alt={c.name}
                  className="w-full h-full object-cover rounded-t-xl"
                />
              ) : (
                <span className="text-gray-500">No Image</span>
              )}
            </div>

              {/* Category Info */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 truncate">
                    {c.name}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">{c.slug}</p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 mt-4 flex-wrap">
                  <button
                    onClick={() => {
                      setSelectedCategory(c);
                      setShowAddModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-800"
                    title="Edit"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => {
                      setDeleteTarget(c);
                      setShowDeleteModal(true);
                    }}
                    className="text-red-600 hover:text-red-800"
                    title="Delete"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Floating Add Button */}
      <button
        onClick={() => {
          setSelectedCategory(null);
          setShowAddModal(true);
        }}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition transform hover:scale-110"
      >
        <FaPlus />
      </button>

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
