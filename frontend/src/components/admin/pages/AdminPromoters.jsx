import React, { useEffect, useState, useCallback } from "react";
import axiosInstance from "../../../api/axiosinstance";
import { toast } from "react-toastify";
import { debounce } from "lodash";

const AdminPromoters = () => {
  const [promoters, setPromoters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [nextPage, setNextPage] = useState(null);
  const [previousPage, setPreviousPage] = useState(null);
  const [selectedPromoter, setSelectedPromoter] = useState(null);
  const [ordering, setOrdering] = useState("-submitted_at");
  const [promoterType, setPromoterType] = useState("");

  // Debounced fetch
  const fetchPromoters = useCallback(
    debounce(async (searchValue = search, pageValue = page, orderValue = ordering, typeValue = promoterType) => {
      setLoading(true);
      try {
        const params = { page: pageValue };
        if (searchValue) params.search = searchValue;
        if (orderValue) params.ordering = orderValue;
        if (typeValue) params.promoter_type = typeValue;

        const res = await axiosInstance.get("admin/promoters-list/", { params });
        setPromoters(res.data.results || res.data);
        setNextPage(res.data.next);
        setPreviousPage(res.data.previous);
      } catch (err) {
        toast.error(err.response?.data?.detail || "Failed to load promoters.");
      } finally {
        setLoading(false);
      }
    }, 500),
    [search, page, ordering, promoterType]
  );

  useEffect(() => {
    fetchPromoters(search, page, ordering, promoterType);
  }, [search, page, ordering, promoterType, fetchPromoters]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Promoters</h2>

      {/* Filters */}
      <div className="mb-4 flex flex-col md:flex-row gap-3 md:items-center">
        <input
          type="text"
          placeholder="Search by email, phone, referral code..."
          className="border border-gray-300 px-3 py-2 rounded w-72 focus:ring-2 focus:ring-blue-400 focus:outline-none"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          value={ordering}
          onChange={(e) => { setOrdering(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
        >
          <option value="-submitted_at">Newest</option>
          <option value="submitted_at">Oldest</option>
          <option value="total_sales_count">Sales Low → High</option>
          <option value="-total_sales_count">Sales High → Low</option>
          <option value="wallet_balance">Wallet Low → High</option>
          <option value="-wallet_balance">Wallet High → Low</option>
        </select>
        <select
          value={promoterType}
          onChange={(e) => { setPromoterType(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
        >
          <option value="">All Types</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
        </select>
      </div>

      {loading && <p>Loading...</p>}

      {/* Desktop Table */}
      {!loading && (
        <div className="overflow-x-auto hidden md:block">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Referral</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Type</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Phone</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Sales</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Wallet</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {promoters.length > 0 ? (
                promoters.map((p) => (
                  <tr
                    key={p.referral_code}
                    className="hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                    onClick={() => setSelectedPromoter(p)}
                  >
                    <td className="px-4 py-2 text-sm">{p.referral_code}</td>
                    <td className="px-4 py-2 text-sm">{p.promoter_type}</td>
                    <td className="px-4 py-2 text-sm">{p.phone_number || "-"}</td>
                    <td className="px-4 py-2 text-sm">{p.total_sales_count}</td>
                    <td className="px-4 py-2 text-sm">₹{p.wallet_balance}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-gray-500">
                    No promoters found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile Cards */}
      {!loading && (
        <div className="md:hidden space-y-4">
          {promoters.length > 0 ? (
            promoters.map((p) => (
              <div
                key={p.referral_code}
                className=" rounded p-4 shadow-sm bg-white cursor-pointer hover:shadow-md transition"
                onClick={() => setSelectedPromoter(p)}
              >
                <p><strong>Referral:</strong> {p.referral_code}</p>
                <p><strong>Type:</strong> {p.promoter_type}</p>
                <p><strong>Phone:</strong> {p.phone_number || "-"}</p>
                <p><strong>Sales:</strong> {p.total_sales_count}</p>
                <p><strong>Wallet:</strong> ₹{p.wallet_balance}</p>
              </div>
            ))
          ) : (
            <p>No promoters found.</p>
          )}
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-between mt-4">
        <button
          disabled={!previousPage}
          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          className={`px-4 py-2 rounded ${previousPage ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}
        >
          Previous
        </button>
        <button
          disabled={!nextPage}
          onClick={() => setPage((prev) => prev + 1)}
          className={`px-4 py-2 rounded ${nextPage ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}
        >
          Next
        </button>
      </div>

      {/* Modal */}
      {selectedPromoter && (
        <div className="fixed inset-0 backdrop-blur-sm bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg w-11/12 md:w-3/4 lg:w-2/3 max-h-[90vh] overflow-y-auto relative shadow-lg">
            <button
              className="absolute top-3 right-3 text-gray-500 text-4xl font-bold hover:text-gray-800"
              onClick={() => setSelectedPromoter(null)}
            >
              &times;
            </button>
            <h3 className="text-2xl font-semibold mb-6">{selectedPromoter.referral_code} Details</h3>
            <div className="space-y-3 text-base">
              <p><strong>Type:</strong> {selectedPromoter.promoter_type}</p>
              <p><strong>Phone:</strong> {selectedPromoter.phone_number || "-"}</p>
              <p><strong>Account Holder:</strong> {selectedPromoter.account_holder_name || "-"}</p>
              <p><strong>Bank:</strong> {selectedPromoter.bank_name || "-"}</p>
              <p><strong>IFSC:</strong> {selectedPromoter.ifsc_code || "-"}</p>
              <p><strong>Commission:</strong> ₹{selectedPromoter.total_commission_earned}</p>
              <p><strong>Wallet:</strong> ₹{selectedPromoter.wallet_balance}</p>
              <p><strong>Sales:</strong> {selectedPromoter.total_sales_count}</p>
              <p><strong>Parent:</strong> {selectedPromoter.parent_promoter ? `${selectedPromoter.parent_promoter.email} (${selectedPromoter.parent_promoter.promoter_type})` : "-"}</p>
              <p><strong>Promoted Products:</strong> {selectedPromoter.promoted_products.length > 0 ? selectedPromoter.promoted_products.map(p => p.variant_name).join(", ") : "-"}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPromoters;
