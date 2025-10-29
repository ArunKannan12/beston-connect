// components/admin/modals/VariantImagesModal.jsx
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import axiosInstance from "../../../api/axiosinstance";
import { toast } from "react-toastify";

const VariantImagesModal = ({ product, onClose }) => {
  const [variants, setVariants] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [images, setImages] = useState([]);
  const [file, setFile] = useState(null);

  const fetchVariants = async () => {
    try {
      const res = await axiosInstance.get(`/products/${product.id}/variants/`);
      setVariants(res.data);
    } catch (err) {
      toast.error("Failed to fetch variants");
    }
  };

  const fetchImages = async (variantId) => {
    try {
      const res = await axiosInstance.get(`/variants/${variantId}/images/`);
      setImages(res.data);
    } catch (err) {
      toast.error("Failed to fetch images");
    }
  };

  useEffect(() => {
    fetchVariants();
  }, []);

  const handleVariantSelect = (variant) => {
    setSelectedVariant(variant);
    fetchImages(variant.id);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !selectedVariant) return;

    const formData = new FormData();
    formData.append("image", file);

    try {
      await axiosInstance.post(
        `/variants/${selectedVariant.id}/images/`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      toast.success("Image uploaded");
      fetchImages(selectedVariant.id);
      setFile(null);
    } catch (err) {
      toast.error("Failed to upload image");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-lg relative"
      >
        <h3 className="text-xl font-bold mb-4">{product.name} Images</h3>

        <div className="mb-4">
          <select
            onChange={(e) =>
              handleVariantSelect(
                variants.find((v) => v.id == e.target.value)
              )
            }
            className="p-2 border rounded w-full"
          >
            <option value="">Select Variant</option>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.variant_name}
              </option>
            ))}
          </select>
        </div>

        {selectedVariant && (
          <>
            <form onSubmit={handleUpload} className="flex gap-2 mb-4">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files[0])}
                className="p-2 border rounded flex-1"
              />
              <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                Upload
              </button>
            </form>

            <div className="grid grid-cols-3 gap-2">
              {images.map((img) => (
                <img
                  key={img.id}
                  src={img.image}
                  alt="variant"
                  className="w-full h-24 object-cover rounded"
                />
              ))}
            </div>
          </>
        )}

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default VariantImagesModal;
