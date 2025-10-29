import React, { useState, useEffect } from "react";

const VariantForm = ({variant,index,onChange,onRemove, onAddImages,onRemoveExistingImage,onRemoveNewImage}) => {
  const [previews, setPreviews] = useState([]);

  // ---------------- Previews for new images ----------------
  useEffect(() => {
    if (!variant.images || !variant.images.length) {
      setPreviews([]);
      return;
    }
    const objectUrls = variant.images.map(file => URL.createObjectURL(file));
    setPreviews(objectUrls);
    return () => objectUrls.forEach(url => URL.revokeObjectURL(url));
  }, [variant.images]);

  const handleInputChange = (field, value) => {
    onChange(index, field, value);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    onAddImages(index, files);

    // Clear input so next selection works correctly
    e.target.value = null;
  };
  return (
    <div className="border p-3 rounded-lg relative">
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="absolute top-2 right-2 text-red-500 font-bold"
      >
        ✕
      </button>
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Variant Name */}
        <div>
          <label className="font-semibold">Variant Name</label>
          <input
            type="text"
            value={variant.variant_name}
            onChange={e => handleInputChange("variant_name", e.target.value)}
            className="w-full border px-2 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        {/* Base Price */}
        <div>
          <label className="font-semibold">Base Price</label>
          <input
            type="number"
            value={variant.base_price}
            onChange={e => handleInputChange("base_price", e.target.value)}
            className="w-full border px-2 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        {/* Offer Price */}
        <div>
          <label className="font-semibold">Offer Price</label>
          <input
            type="number"
            value={variant.offer_price}
            onChange={e => handleInputChange("offer_price", e.target.value)}
            className="w-full border px-2 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        {/* Stock */}
        <div>
          <label className="font-semibold">Stock</label>
          <input
            type="number"
            value={variant.stock}
            onChange={e => handleInputChange("stock", e.target.value)}
            className="w-full border px-2 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        {/* Featured Toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!variant.featured}
            onChange={() => handleInputChange("featured", !variant.featured)}
            id={`featured-${index}`}
          />
          <label htmlFor={`featured-${index}`} className="font-semibold">
            Mark as Featured
          </label>
        </div>
        {/* Description */}
        <div className="sm:col-span-2">
          <label className="font-semibold">Description</label>
          <textarea
            value={variant.description}
            onChange={e => handleInputChange("description", e.target.value)}
            className="w-full border px-2 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            rows={2}
          />
        </div>
        {/* Return & Replacement */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={variant.allow_return}
            onChange={() => handleInputChange("allow_return", !variant.allow_return)}
            id={`return-${index}`}
          />
          <label htmlFor={`return-${index}`} className="font-semibold">
            Allow Return
          </label>
          {variant.allow_return && (
            <input
              type="number"
              value={variant.return_days}
              onChange={e => handleInputChange("return_days", e.target.value)}
              className="w-20 border px-2 py-1 rounded-lg"
              placeholder="Days"
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={variant.allow_replacement}
            onChange={() => handleInputChange("allow_replacement", !variant.allow_replacement)}
            id={`replacement-${index}`}
          />
          <label htmlFor={`replacement-${index}`} className="font-semibold">
            Allow Replacement
          </label>
          {variant.allow_replacement && (
            <input
              type="number"
              value={variant.replacement_days}
              onChange={e => handleInputChange("replacement_days", e.target.value)}
              className="w-20 border px-2 py-1 rounded-lg"
              placeholder="Days"
            />
          )}
        </div>
        {/* Existing Images */}
        {variant.existingImages?.length > 0 && (
          <div className="sm:col-span-2 flex gap-2 flex-wrap mt-2">
            {variant.existingImages.map((img, i) => (
              <div key={img.id || i} className="relative">
                <img
                  src={img.url}
                  alt={`Existing ${i}`}
                  className="w-20 h-20 object-cover rounded border"
                />
                <button
                  type="button"
                  onClick={() => onRemoveExistingImage(index, i)}
                  className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  aria-label="Remove existing image"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        {/* New Images */}
        {previews.length > 0 && (
          <div className="sm:col-span-2 flex gap-2 flex-wrap mt-2">
            {previews.map((url, i) => (
              <div key={i} className="relative">
                <img
                  src={url}
                  alt={`Preview ${i}`}
                  className="w-20 h-20 object-cover rounded border"
                />
                <button
                  type="button"
                  onClick={() => onRemoveNewImage(index, i)}
                  className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        {/* Upload New Images */}
        <div className="sm:col-span-2">
          <label className="font-semibold">Upload Images</label>
          <input
            type="file"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files);
              if (!files.length) return;
              onAddImages(index, files);

              // Reset input so same file can be selected again
              e.target.value = null;
            }}
            accept="image/*"
            className="w-full mt-1"
          />
        </div>
      </div>
    </div>
  );
};
export default VariantForm;
