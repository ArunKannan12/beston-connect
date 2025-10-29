import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import axiosInstance from "../../../api/axiosinstance";
import { FaTimes, FaTrash } from "react-icons/fa";

const CategoryModal = ({ category = null, onClose, onSuccess }) => {
  const isEdit = !!category;

  const [name, setName] = useState(category?.name || "");
  const [slug, setSlug] = useState(category?.slug || "");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(category?.image_url || null);
  const [removeImage, setRemoveImage] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isEdit) {
      setSlug(name.toLowerCase().replace(/\s+/g, "-"));
    }
  }, [name, isEdit]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setRemoveImage(false); // undo remove if new image selected
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    setPreview(null);
    setRemoveImage(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      toast.error("Name and slug are required");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("slug", slug);

      if (image) formData.append("image", image);
      if (removeImage) formData.append("remove_image", "true");

      if (isEdit) {
        await axiosInstance.patch(`/categories/${category.slug}/`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Category updated successfully");
      } else {
        await axiosInstance.post("/categories/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Category added successfully");
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.detail || "Failed to save category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative">
        {loading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-50">
            <span className="text-gray-700 font-semibold">Saving...</span>
          </div>
        )}

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <FaTimes />
        </button>

        <h2 className="text-2xl font-bold mb-4">{isEdit ? "Edit Category" : "Add Category"}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
              placeholder="Category name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
              placeholder="category-slug"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Image</label>
            <input type="file" accept="image/*" onChange={handleImageChange} />
            {preview && (
              <div className="mt-2 flex flex-col items-center gap-2">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full max-w-xs h-48 object-cover rounded-md border"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="text-red-600 hover:text-red-800 flex items-center gap-1 mt-2"
                >
                  <FaTrash /> Remove
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-100">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              {loading ? "Saving..." : isEdit ? "Update" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryModal;
