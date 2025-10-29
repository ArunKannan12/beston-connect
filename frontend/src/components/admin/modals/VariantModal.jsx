// components/admin/modals/VariantModal.jsx
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import axiosInstance from "../../../api/axiosinstance";
import { toast } from "react-toastify";

const VariantModal = ({ product, onClose }) => {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [variantName, setVariantName] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [stock, setStock] = useState("");
  const [allowReturn, setAllowReturn] = useState(false);
  const [returnDays, setReturnDays] = useState("");
  const [allowReplacement, setAllowReplacement] = useState(false);
  const [replacementDays, setReplacementDays] = useState("");


  const fetchVariants = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/products/${product.id}/variants/`);
      setVariants(res.data);
    } catch (err) {
      toast.error("Failed to fetch variants");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVariants();
  }, []);

  const handleAddVariant = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post(`/products/${product.id}/variants/`, {
        variant_name: variantName,
        base_price: basePrice,
        offer_price: offerPrice,
        stock,
      });
      toast.success("Variant added");
      fetchVariants();
      setVariantName("");
      setBasePrice("");
      setOfferPrice("");
      setStock("");
    } catch (err) {
      toast.error("Failed to add variant");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="bg-white rounded-xl p-6 w-full max-w-lg shadow-lg relative"
      >
        <h3 className="text-xl font-bold mb-4">{product.name} Variants</h3>

        <form onSubmit={handleAddVariant} className="flex flex-col gap-2 mb-4">
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="Variant Name"
              value={variantName}
              onChange={(e) => setVariantName(e.target.value)}
              required
              className="flex-1 p-2 border rounded"
            />
            <input
              type="number"
              placeholder="Base Price"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              required
              className="w-24 p-2 border rounded"
            />
            <input
              type="number"
              placeholder="Offer Price"
              value={offerPrice}
              onChange={(e) => setOfferPrice(e.target.value)}
              className="w-24 p-2 border rounded"
            />
            <input
              type="number"
              placeholder="Stock"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              required
              className="w-20 p-2 border rounded"
            />
          </div>

          <div className="flex flex-wrap gap-4 mt-2 items-center">
            <div className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={allowReturn}
                onChange={() => setAllowReturn(!allowReturn)}
              />
              <label>Allow Return</label>
              {allowReturn && (
                <input
                  type="number"
                  placeholder="Return Days"
                  value={returnDays}
                  onChange={(e) => setReturnDays(e.target.value)}
                  className="w-24 p-1 border rounded ml-2"
                />
              )}
            </div>

            <div className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={allowReplacement}
                onChange={() => setAllowReplacement(!allowReplacement)}
              />
              <label>Allow Replacement</label>
              {allowReplacement && (
                <input
                  type="number"
                  placeholder="Replacement Days"
                  value={replacementDays}
                  onChange={(e) => setReplacementDays(e.target.value)}
                  className="w-24 p-1 border rounded ml-2"
                />
              )}
            </div>

            <button className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
              Add
            </button>
          </div>
        </form>


        {loading ? (
          <p>Loading variants...</p>
        ) : (
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-gray-200">
                <th className="px-2 py-1">ID</th>
                <th className="px-2 py-1">Name</th>
                <th className="px-2 py-1">Base Price</th>
                <th className="px-2 py-1">Offer Price</th>
                <th className="px-2 py-1">Stock</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => (
                <tr key={v.id} className="border-b">
                  <td className="px-2 py-1">{v.id}</td>
                  <td className="px-2 py-1">{v.variant_name}</td>
                  <td className="px-2 py-1">{v.base_price}</td>
                  <td className="px-2 py-1">{v.offer_price}</td>
                  <td className="px-2 py-1">{v.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
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

export default VariantModal;
