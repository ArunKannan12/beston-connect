import React, { useEffect, useState } from "react";
import axiosInstance from "../../../api/axiosinstance";
import { toast } from "react-toastify";
import { AnimatePresence, motion } from "framer-motion";
import ReplacementModal from "../modals/ReplacementModal";
import { Search, Filter, Calendar, Package, ChevronLeft, ChevronRight, X, CheckCircle, Clock, AlertCircle, Ban, Truck } from "lucide-react";

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

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending": return <Clock className="w-4 h-4" />;
      case "approved": return <CheckCircle className="w-4 h-4" />;
      case "rejected": return <Ban className="w-4 h-4" />;
      case "refunded": return <Truck className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending": return "bg-amber-50 text-amber-700 border-amber-200";
      case "approved": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "rejected": return "bg-red-50 text-red-700 border-red-200";
      case "refunded": return "bg-blue-50 text-blue-700 border-blue-200";
      default: return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setCreatedFrom("");
    setCreatedTo("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 backdrop-blur-lg bg-white/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Replacement Requests</h1>
              <p className="text-slate-500 mt-1 text-sm sm:text-base">Manage and track customer replacement requests</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-slate-100 px-3 py-1.5 rounded-full">
                <span className="text-sm font-medium text-slate-700">{pageInfo.count} Total</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Advanced Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
            </div>
            <button
              onClick={clearFilters}
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              Clear all
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative lg:col-span-2 xl:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by email, order ID, product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-slate-400"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={createdFrom}
                  onChange={(e) => setCreatedFrom(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={createdTo}
                  onChange={(e) => setCreatedTo(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Table Header */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Replacement Requests</h3>
              <span className="text-sm text-slate-500">
                {replacements.length} of {pageInfo.count} results
              </span>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Variant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Refund</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                <AnimatePresence>
                  {!loading && replacements.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <Package className="w-12 h-12 text-slate-300 mb-3" />
                          <p className="text-slate-500 font-medium">No replacement requests found</p>
                          <p className="text-slate-400 text-sm mt-1">Try adjusting your filters</p>
                        </div>
                      </td>
                    </tr>
                  )}

                  {replacements.map((replacement) => (
                    <motion.tr
                      key={replacement.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => openModal(replacement)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        #{replacement.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        #{replacement.order.id}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">
                        <div className="max-w-xs truncate" title={replacement.product}>
                          {replacement.product}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {replacement.variant || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(replacement.status)}`}>
                          {getStatusIcon(replacement.status)}
                          <span className="capitalize">{replacement.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                        ₹{replacement.refund_amount}
                      </td>
                    </motion.tr>
                  ))}

                  {loading && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden">
            <div className="divide-y divide-slate-200">
              <AnimatePresence>
                {!loading && replacements.length === 0 && (
                  <div className="p-6 text-center">
                    <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No replacement requests found</p>
                    <p className="text-slate-400 text-sm mt-1">Try adjusting your filters</p>
                  </div>
                )}

                {replacements.map((replacement) => (
                  <motion.div
                    key={replacement.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => openModal(replacement)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-slate-900">#{replacement.id}</p>
                        <p className="text-sm text-slate-600">Order #{replacement.order.id}</p>
                      </div>
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(replacement.status)}`}>
                        {getStatusIcon(replacement.status)}
                        <span className="capitalize">{replacement.status}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-slate-500">Product</p>
                        <p className="text-sm text-slate-900 font-medium truncate">{replacement.product}</p>
                      </div>
                      {replacement.variant && (
                        <div>
                          <p className="text-xs text-slate-500">Variant</p>
                          <p className="text-sm text-slate-600">{replacement.variant}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <span className="text-xs text-slate-500">Refund Amount</span>
                        <span className="text-sm font-bold text-slate-900">₹{replacement.refund_amount}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {loading && (
                  <div className="p-6">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Enhanced Pagination */}
        {pageInfo.count > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-600">
              Showing <span className="font-medium">{replacements.length}</span> of{' '}
              <span className="font-medium">{pageInfo.count}</span> results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => pageInfo.previous && fetchReplacements(pageInfo.previous)}
                disabled={!pageInfo.previous}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <button
                onClick={() => pageInfo.next && fetchReplacements(pageInfo.next)}
                disabled={!pageInfo.next}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

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
