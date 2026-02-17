import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "../../../api/axiosinstance.jsx";
import { toast } from "react-toastify";
import VariantForm from "./VariantForm.jsx";
import {
  X,
  Package,
  Edit3,
  Plus,
  Image as ImageIcon,
  Upload,
  Trash2,
  Check,
  AlertCircle,
  Star,
  Eye,
  EyeOff,
  Info,
  ChevronDown,
  ChevronUp,
  Save,
  DollarSign,
  Box,
  Tag,
  FileText,
  Settings,
} from "lucide-react";

const ProductModal = ({ onClose, onSuccess, product = null }) => {
  const isEdit = !!product;

  // ---------------- Product States ----------------
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [removeMainImage, setRemoveMainImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [removedVariantImages, setRemovedVariantImages] = useState([]);
  const [activeTab, setActiveTab] = useState("basic"); // basic, variants, advanced
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // ---------------- Variants State ----------------
  const [variants, setVariants] = useState([]);

  // ---------------- Populate Fields for Edit ----------------
  useEffect(() => {
    if (!product) {
      setVariants([{
        variant_name: "",
        description: "",
        base_price: "",
        offer_price: "",
        stock: "",
        is_active: true,
        allow_return: false,
        return_days: 0,
        allow_replacement: false,
        replacement_days: 0,
        featured:false,
        weight: "",
        promoter_commission_rate: "",
        images: [],
        existingImages: [],
      }]);

      return;
    }

    setName(product.name || "");
    setSlug(product.slug || "");
    setDescription(product.description || "");
    setCategory(product.category?.id || "");
    setIsAvailable(product.is_available ?? true);
    setFeatured(product.featured ?? false);
    setPreview(product.image_url || null);

    if (product.variants?.length) {
      setVariants(product.variants.map((v) => ({
        id: v.id,
        variant_name: v.variant_name,
        description: v.description || "",
        base_price: v.base_price,
        offer_price: v.offer_price,
        stock: v.stock,
        weight: v.weight ,
        promoter_commission_rate: v.promoter_commission_rate ,
        is_active: v.is_active ?? true,
        allow_return: v.allow_return ?? false,
        return_days: v.return_days || 0,
        allow_replacement: v.allow_replacement ?? false,
        replacement_days: v.replacement_days || 0,
        featured: v.featured ?? false,
        images: [],
       existingImages: v.images?.map(img => ({ id: img.id, url: img.image_url })) || []
      })));
    }
  }, [product]);

  // ---------------- Auto-generate Slug ----------------
  useEffect(() => {
    if (!slugEdited && name) {
      setSlug(
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
      );
    } else if (!name) {
      setSlug("");
      setSlugEdited(false);
    }
  }, [name, slugEdited]);

  // ---------------- Fetch Categories ----------------
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axiosInstance.get("/categories/");
        setCategories(res.data.results.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        toast.error(err?.response?.data?.detail || "Failed to fetch categories");
      }
    };
    fetchCategories();
  }, []);

  // ---------------- Preview Main Image ----------------
  useEffect(() => {
    if (!image) return;
    const objectUrl = URL.createObjectURL(image);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [image]);

  // ---------------- Variant Handlers ----------------
  const handleVariantChange = (index, field, value) => {
    setVariants(prev => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const handleAddVariantImages = (index, files) => {
    setVariants(prev => {
      const updated = [...prev];
      const existingFiles = updated[index].images;

      // Filter out duplicates by name and size
      const newFiles = files.filter(
        f => !existingFiles.some(ef => ef.name === f.name && ef.size === f.size)
      );

      updated[index].images = [...existingFiles, ...newFiles];
      return updated;
    });
  };


  const handleRemoveVariantExistingImage = (variantIndex, imageIndex) => {
    setVariants(prev => {
      const updated = [...prev];
      const removedImage = updated[variantIndex].existingImages[imageIndex];

      // Remove from variant's existingImages
      updated[variantIndex].existingImages = updated[variantIndex].existingImages.filter(
        (_, i) => i !== imageIndex
      );

      // Track removed image ID for backend
      if (removedImage?.id) {
        setRemovedVariantImages(prevRemoved => [
          ...prevRemoved,
          { variantIndex, imageId: removedImage.id },
        ]);
      }

      return updated;
    });
  };


  const handleRemoveVariantNewImage = (variantIndex, imageIndex) => {
    setVariants(prev => {
      const updated = [...prev];
      updated[variantIndex].images = updated[variantIndex].images.filter((_, i) => i !== imageIndex);
      return updated;
    });
  };

  const addVariant = () => {
    setVariants(prev => [
      ...prev,
      {
        variant_name: "",
        description: "",
        base_price: "",
        offer_price: "",
        stock: "",
        weight:'',
        promoter_commission_rate:'',
        is_active: true,
        allow_return: false,
        return_days: 0,
        allow_replacement: false,
        replacement_days: 0,
        featured:false,
        images: [],
        existingImages: [],
      },
    ]);
  };

  const removeVariant = (index) => {
    if (variants.length === 1) {
      toast.error("At least one variant is required");
      return;
    }
    setVariants(prev => prev.filter((_, i) => i !== index));
  };

  // ---------------- Handle Submit ----------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !slug || !category) return toast.error("Name, slug, and category are required");
    if (!description.trim()) return toast.error("Description cannot be blank");

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("slug", slug);
      formData.append("description", description);
      formData.append("category_id", Number(category));
      formData.append("is_available", isAvailable);
      formData.append("featured", featured);
      if (image) formData.append("image", image);
      if (isEdit && removeMainImage) formData.append("remove_image", true);

      const variantsPayload = variants.map((v, idx) => ({
        id: v.id || null,
        variant_name: v.variant_name,
        description: v.description || description,
        base_price: v.base_price,
        offer_price: v.offer_price,
        stock: v.stock,
        weight: v.weight,
        promoter_commission_rate: v.promoter_commission_rate,
        is_active: v.is_active,
        allow_return: v.allow_return,
        return_days: v.return_days,
        allow_replacement: v.allow_replacement,
        replacement_days: v.replacement_days,
        featured: v.featured, // ✅ this line ensures backend receives variant-level featured
        existingImages: v.existingImages.map(img => ({ id: img.id })),
        removed_images: removedVariantImages
          .filter(r => r.variantIndex === idx)
          .map(r => r.imageId),
      }));
      console.log("🧪 Variant payload:", variantsPayload);
      formData.append("variants", JSON.stringify(variantsPayload));

      // Append new variant images
      variants.forEach((v, vIndex) =>
        v.images.forEach((file, imgIndex) =>
          formData.append(`variant_${vIndex}_image_${imgIndex}`, file)
        )
      );
      
      const url = isEdit ? `admin/products/${product.id}/` : "admin/create-products/";
      const method = isEdit ? "patch" : "post";

      await axiosInstance[method](url, formData, { headers: { "Content-Type": "multipart/form-data" } });

      toast.success(isEdit ? "Product updated" : "Product added");
      onSuccess();
      onClose();
    } catch (err) {
      console.error("❌ Axios Error:", err);
      toast.error(err?.response?.data?.detail || "Failed to save product");
    } finally {
      setLoading(false);
    }
  };

  
  // ---------------- Render ----------------
  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-5xl sm:max-w-4xl bg-white rounded-xl sm:rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[98vh] sm:max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-3 sm:px-6 py-3 sm:py-6 text-white">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  {isEdit ? <Edit3 className="w-4 h-4 sm:w-6 sm:h-6" /> : <Plus className="w-4 h-4 sm:w-6 sm:h-6" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-2xl font-bold truncate">
                    {isEdit ? "Edit Product" : "Add Product"}
                  </h2>
                  <p className="text-blue-100 text-xs hidden sm:block">
                    {isEdit ? "Update product information" : "Create a new product"}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 sm:w-10 sm:h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors flex-shrink-0"
              >
                <X className="w-3 h-3 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
            {[
              { id: "basic", label: "Basic Info", icon: Package },
              { id: "variants", label: "Variants", icon: Box },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-6 py-2.5 sm:py-3 font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-white text-blue-600 border-b-2 border-blue-600 -mb-[2px]"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm sm:text-base">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
            <div className="p-3 sm:p-6 flex-1">
              {/* Basic Information Tab */}
              {activeTab === "basic" && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-3 sm:space-y-6"
                >
                  {/* Product Name */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Package className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 sm:w-5 sm:h-5" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-8 sm:pl-10 pr-2.5 sm:pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-xs sm:text-sm sm:text-base"
                        placeholder="Enter product name"
                      />
                    </div>
                  </div>

                  {/* Slug */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                      URL Slug <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Tag className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 sm:w-5 sm:h-5" />
                      <input
                        type="text"
                        value={slug}
                        onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); }}
                        className="w-full pl-8 sm:pl-10 pr-2.5 sm:pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-xs sm:text-sm sm:text-base"
                        placeholder="product-url-slug"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 sm:mt-1">Auto-generated from product name</p>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-2.5 sm:left-3 top-2.5 sm:top-3 text-gray-400 w-3.5 h-3.5 sm:w-5 sm:h-5" />
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full pl-8 sm:pl-10 pr-2.5 sm:pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none text-xs sm:text-sm sm:text-base"
                        rows={2}
                        placeholder="Describe your product..."
                      />
                    </div>
                  </div>

                  {/* Category and Status */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-2.5 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-xs sm:text-sm sm:text-base"
                      >
                        <option value="">Select category</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2 sm:space-y-4">
                      {/* Available Toggle */}
                      <div className="flex items-center justify-between p-2 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl">
                        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
                          <Eye className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 text-xs sm:text-sm sm:text-base">Available</p>
                            <p className="text-xs text-gray-500 hidden sm:block">Product is visible to customers</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsAvailable(!isAvailable)}
                          className={`relative inline-flex h-4 w-7 sm:h-6 sm:w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                            isAvailable ? "bg-blue-600" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-2.5 w-2.5 sm:h-4 sm:w-4 transform rounded-full bg-white transition-transform ${
                              isAvailable ? "translate-x-3.5 sm:translate-x-6" : "translate-x-0.5 sm:translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Featured Toggle */}
                      <div className="flex items-center justify-between p-2 sm:p-4 bg-yellow-50 rounded-lg sm:rounded-xl">
                        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
                          <Star className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-yellow-600 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 text-xs sm:text-sm sm:text-base">Featured</p>
                            <p className="text-xs text-gray-500 hidden sm:block">Show on homepage</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFeatured(!featured)}
                          className={`relative inline-flex h-4 w-7 sm:h-6 sm:w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                            featured ? "bg-yellow-500" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-2.5 w-2.5 sm:h-4 sm:w-4 transform rounded-full bg-white transition-transform ${
                              featured ? "translate-x-3.5 sm:translate-x-6" : "translate-x-0.5 sm:translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Product Image */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                      Product Image
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg sm:rounded-xl p-3 sm:p-6 hover:border-blue-400 transition-colors">
                      <div className="flex flex-col items-center">
                        {preview ? (
                          <div className="relative">
                            <img
                              src={preview}
                              alt="Product preview"
                              className="w-20 h-20 sm:w-32 sm:h-32 object-cover rounded-lg sm:rounded-xl"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setImage(null);
                                setPreview(null);
                                if (isEdit) setRemoveMainImage(true);
                              }}
                              className="absolute -top-2 -right-2 w-5 h-5 sm:w-8 sm:h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                            >
                              <X className="w-2.5 h-2.5 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <ImageIcon className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mb-1.5 sm:mb-2" />
                            <p className="text-gray-600 mb-1.5 text-center text-xs sm:text-sm sm:text-base">Drop product image here or click to browse</p>
                            <input
                              type="file"
                              onChange={(e) => setImage(e.target.files[0])}
                              accept="image/*"
                              className="hidden"
                              id="product-image"
                            />
                            <label
                              htmlFor="product-image"
                              className="px-2.5 sm:px-4 py-2 bg-blue-600 text-white rounded-lg sm:rounded-xl hover:bg-blue-700 transition-colors cursor-pointer flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm sm:text-base"
                            >
                              <Upload className="w-2.5 h-2.5 sm:w-4 sm:h-4" />
                              Choose Image
                            </label>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Variants Tab */}
              {activeTab === "variants" && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4 sm:space-y-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Product Variants</h3>
                      <p className="text-sm text-gray-500">Manage different sizes, colors, or versions</p>
                    </div>
                    <button
                      type="button"
                      onClick={addVariant}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg sm:rounded-xl hover:bg-green-700 transition-colors text-sm sm:text-base"
                    >
                      <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                      Add Variant
                    </button>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    {variants.map((v, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="border border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4 bg-gray-50"
                      >
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                          <h4 className="font-medium text-gray-900 text-sm sm:text-base">Variant {i + 1}</h4>
                          {variants.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeVariant(i)}
                              className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          )}
                        </div>
                        <VariantForm
                          variant={v}
                          index={i}
                          onChange={handleVariantChange}
                          onRemove={removeVariant}
                          onAddImages={handleAddVariantImages}
                          onRemoveExistingImage={handleRemoveVariantExistingImage}
                          onRemoveNewImage={handleRemoveVariantNewImage}
                        />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="border-t border-gray-200 bg-gray-50 px-3 sm:px-6 py-2.5 sm:py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                <div className="text-xs text-gray-500 order-2 sm:order-1 text-center sm:text-left">
                  {isEdit ? "Last updated" : "Creating"}
                </div>
                <div className="flex items-center gap-2 sm:gap-3 order-1 sm:order-2 justify-center sm:justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 sm:px-6 py-1.5 sm:py-2 bg-white border border-gray-300 text-gray-700 rounded-lg sm:rounded-xl hover:bg-gray-50 transition-colors text-xs sm:text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg sm:rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm sm:text-base"
                  >
                    {loading ? (
                      <>
                        <div className="w-2.5 h-2.5 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span className="hidden sm:inline">
                          {isEdit ? "Updating..." : "Adding..."}
                        </span>
                        <span className="sm:hidden">
                          {isEdit ? "Updating" : "Adding"}
                        </span>
                      </>
                    ) : (
                      <>
                        <Save className="w-2.5 h-2.5 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">
                          {isEdit ? "Update Product" : "Add Product"}
                        </span>
                        <span className="sm:hidden">
                          {isEdit ? "Update" : "Add"}
                        </span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProductModal;
