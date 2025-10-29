import React, { useEffect, useState } from "react";
import axiosInstance from "../../../api/axiosinstance";
import { toast } from "react-toastify";
import { AnimatePresence, motion } from "framer-motion";
import ReplacementModal from "../modals/ReplacementModal";

export default function AdminReplacements() {
  const [replacements, setReplacements] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");

  // Pagination
  const [pageInfo, setPageInfo] = useState({
    count: 0,
    next: null,
    previous: null,
  });

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReplacement, setSelectedReplacement] = useState(null);

  const fetchReplacements = async (url) => {
    setLoading(true);
    try {
      let fetchUrl = url;
      if (!fetchUrl) {
        const params = new URLSearchParams();
        if (searchTerm) params.set("search", searchTerm);
        if (statusFilter) params.set("status", statusFilter);
        if (createdFrom) params.set("created_from", createdFrom);
        if (createdTo) params.set("created_to", createdTo);
        fetchUrl = `/admin/replacements/?${params.toString()}`;
      }

      const { data } = await axiosInstance.get(fetchUrl);

      setReplacements(data.results || []);
      setPageInfo({
        count: data.count,
        next: data.next,
        previous: data.previous,
      });
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.detail || "Failed to fetch replacements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchReplacements();
    }, 400);
    return () => clearTimeout(delay);
  }, [searchTerm, statusFilter, createdFrom, createdTo]);

  const openModal = (replacement) => {
    setSelectedReplacement(replacement.id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedReplacement(null);
    setIsModalOpen(false);
  };

  return (
    <div className="p-4 sm:pl-6 md:pl-8 lg:pl-10">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Admin Replacements</h1>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <input
          type="text"
          placeholder="Search by email, order ID, product…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:outline-none"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="refunded">Refunded</option>
        </select>

        <div className="flex gap-2">
          <input
            type="date"
            value={createdFrom}
            onChange={(e) => setCreatedFrom(e.target.value)}
            className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-blue-500 focus:outline-none"
          />
          <input
            type="date"
            value={createdTo}
            onChange={(e) => setCreatedTo(e.target.value)}
            className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg shadow border border-gray-200">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-50 text-gray-700 text-sm font-medium">
            <tr>
              {["ID", "Order ID", "Product", "Variant", "Status", "Refund"].map((h) => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {!loading && replacements.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-gray-500">
                    No replacement requests found.
                  </td>
                </tr>
              )}

              {replacements.map((replacement) => (
                <motion.tr
                  key={replacement.id}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.2 }}
                  className="hover:bg-gray-50 cursor-pointer transition"
                  onClick={() => openModal(replacement)}
                >
                  <td className="px-4 py-3 border-t">{replacement.id}</td>
                  <td className="px-4 py-3 border-t">{replacement.order.id}</td>
                  <td className="px-4 py-3 border-t">{replacement.product}</td>
                  <td className="px-4 py-3 border-t">{replacement.variant}</td>
                  <td className="px-4 py-3 border-t">
                    <span
                      className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                        replacement.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : replacement.status === "approved"
                          ? "bg-green-100 text-green-800"
                          : replacement.status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {replacement.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-t">₹{replacement.refund_amount}</td>
                </motion.tr>
              ))}

              {loading && (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-gray-400 animate-pulse">
                    Loading…
                  </td>
                </tr>
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4 text-sm">
        <button
          onClick={() => pageInfo.previous && fetchReplacements(pageInfo.previous)}
          disabled={!pageInfo.previous}
          className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
        >
          Previous
        </button>
        <span>
          Showing {replacements.length} of {pageInfo.count}
        </span>
        <button
          onClick={() => pageInfo.next && fetchReplacements(pageInfo.next)}
          disabled={!pageInfo.next}
          className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
        >
          Next
        </button>
      </div>
              {console.log(selectedReplacement,'abcremdl')
              }
      {/* Modal */}
      <ReplacementModal
        isOpen={isModalOpen}
        onClose={closeModal}
        replacementId={selectedReplacement}
        onUpdate={() => fetchReplacements()}
      />
    </div>
  );
}
