import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "../../../api/axiosinstance";
import { toast } from "react-toastify";
import BannerFormModal from "../modals/BannerFormModal.jsx";

const AdminAllBanner = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedBanner, setSelectedBanner] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;

      const res = await axiosInstance.get("admin/banners/", { params });
      setBanners(res.data.results || []);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to load banners");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, [search]);

  return (
    <div className="p-10 md:p-8 relative">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">All Banners</h1>

      {/* Search */}
      <input
        type="text"
        placeholder="Search banners..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border rounded px-3 py-2 mb-6 w-full md:w-1/2 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
      />

      {/* Loading */}
      {loading && <p className="text-gray-600">Loading...</p>}

      {/* Laptop / Desktop Table */}
      {!loading && banners.length > 0 && (
        <div className="hidden md:block overflow-x-auto rounded-lg shadow-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Title</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Subtitle</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Image</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Order</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Active</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <AnimatePresence>
                {banners.map((banner) => (
                  <motion.tr
                    key={banner.id}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    whileHover={{ scale: 1.02, backgroundColor: "rgba(243,244,246,0.5)" }}
                    className="cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm">{banner.title}</td>
                    <td className="px-4 py-3 text-sm">{banner.subtitle}</td>
                    <td className="px-4 py-3">
                      {banner.image_url && (
                        <div className="w-full overflow-hidden rounded mb-2">
                          <img
                            src={banner.image_url}
                            alt={banner.title}
                            className="w-full h-auto max-h-48 object-cover rounded"
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">{banner.order}</td>
                    <td className="px-4 py-3 text-sm">{banner.is_active ? "Yes" : "No"}</td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => setSelectedBanner(banner)}
                        className="bg-indigo-500 text-white px-3 py-1 rounded hover:bg-indigo-600"
                      >
                        View / Edit
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile Cards */}
      {!loading && banners.length > 0 && (
        <div className="md:hidden space-y-4">
          <AnimatePresence>
            {banners.map((banner) => (
              <motion.div
                key={banner.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                whileHover={{ scale: 1.02 }}
                className="border rounded-lg p-4 shadow-sm bg-white cursor-pointer"
                onClick={() => setSelectedBanner(banner)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-800">{banner.title}</h3>
                  <span
                    className={`text-sm font-medium ${
                      banner.is_active ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {banner.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                {banner.image_url && (
                  <div className="w-full overflow-hidden rounded mb-2">
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      className="w-full h-auto max-h-48 object-cover rounded"
                    />
                  </div>
                )}
                <p className="text-gray-600 text-sm mb-1">{banner.subtitle}</p>
                <p className="text-gray-500 text-sm">Order: {banner.order}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* No banners */}
      {!loading && banners.length === 0 && (
        <p className="text-gray-500 mt-4">No banners found</p>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {selectedBanner && (
          <BannerFormModal
            banner={selectedBanner}
            onClose={() => setSelectedBanner(null)}
            refreshBanners={fetchBanners}
          />
        )}
      </AnimatePresence>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <BannerFormModal
            banner={{}}
            onClose={() => setShowCreateModal(false)}
            refreshBanners={fetchBanners}
            isCreateMode={true}
          />
        )}
      </AnimatePresence>

      {/* Floating Add Button */}
      <motion.button
        onClick={() => setShowCreateModal(true)}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.1 }}
        className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white text-3xl rounded-full w-14 h-14 flex items-center justify-center shadow-lg z-50"
        title="Add Banner"
      >
        +
      </motion.button>
    </div>
  );
};

export default AdminAllBanner;