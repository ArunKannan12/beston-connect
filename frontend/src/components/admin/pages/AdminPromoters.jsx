import React, { useEffect, useState, useCallback } from "react";
import axiosInstance from "../../../api/axiosinstance";
import { toast } from "react-toastify";
import { debounce } from "lodash";
import { CheckCircle, XCircle, User, Calendar, Phone, Mail, Building, CreditCard, TrendingUp, Wallet } from "lucide-react";

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
  const [approving, setApproving] = useState(null);

  // Approve promoter function
  const handleApprovePromoter = async (promoterId) => {
 
    
    setApproving(promoterId);
    try {
      const res = await axiosInstance.post(`admin/promoters/approve/${promoterId}/`);
      toast.success(res.data.detail || "Promoter approved successfully!");
      // Refresh the list
      fetchPromoters(search, page, ordering, promoterType);
      // Close modal if open
      if (selectedPromoter?.id === promoterId) {
        setSelectedPromoter(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to approve promoter.");
    } finally {
      setApproving(null);
    }
  };

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

  console.log(promoters);
  
  return (
    <div className="p-6">
  <h2 className="text-2xl font-semibold mb-4">Promoters</h2>

  {/* Filters */}
  <div className="mb-6 flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
    <div className="flex flex-col sm:flex-row gap-3 flex-1">
      <div className="relative">
        <input
          type="text"
          placeholder="Search by email, phone, referral code..."
          className="border border-gray-300 pl-10 pr-4 py-2 rounded-lg w-full sm:w-80 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
      </div>

      <select
        value={ordering}
        onChange={(e) => { setOrdering(e.target.value); setPage(1); }}
        className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all"
      >
        <option value="-submitted_at">Newest First</option>
        <option value="submitted_at">Oldest First</option>
        <option value="total_sales_count">Sales Low → High</option>
        <option value="-total_sales_count">Sales High → Low</option>
        <option value="wallet_balance">Wallet Low → High</option>
        <option value="-wallet_balance">Wallet High → Low</option>
      </select>

      <select
        value={promoterType}
        onChange={(e) => { setPromoterType(e.target.value); setPage(1); }}
        className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all"
      >
        <option value="">All Types</option>
        <option value="paid">Paid</option>
        <option value="unpaid">Unpaid</option>
      </select>
    </div>
  </div>

  {loading && <p>Loading...</p>}

  {/* Desktop Table */}
  {!loading && (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hidden md:block">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Promoter</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Contact</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Performance</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {promoters.length > 0 ? (
            promoters.map((p) => {
              const isApproved = !!p.approved_at;
              return (
                <tr
                  key={p.referral_code}
                  className="hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                  onClick={() => setSelectedPromoter(p)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {p.user?.first_name?.[0]?.toUpperCase() || p.referral_code?.[0]?.toUpperCase() || 'P'}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{p.user?.first_name && p.user?.last_name ? `${p.user.first_name} ${p.user.last_name}` : 'User Name Not Available'}</div>
                        <div className="text-sm text-gray-500">{p.referral_code}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {isApproved ? 'Approved' : 'Pending'}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-900">{p.promoter_type}</td>

                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{p.phone_number || "-"}</div>
                    <div className="text-sm text-gray-500">{p.user?.email || "Email not available"}</div>
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center">
                        <TrendingUp className="h-3 w-3 text-blue-500 mr-1" />
                        <span>{p.total_sales_count} sales</span>
                      </div>
                      <div className="flex items-center">
                        <Wallet className="h-3 w-3 text-green-500 mr-1" />
                        <span>₹{p.wallet_balance}</span>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    {!isApproved && p.promoter_type === "unpaid" && (
                      <button
                        onClick={() => handleApprovePromoter(p.id)}
                        disabled={approving === p.id}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {approving === p.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Approving...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </>
                        )}
                      </button>
                    )}
                    {isApproved && (
                      <span className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-gray-50">
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                        Approved
                      </span>
                    )}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={6} className="text-center py-12 text-gray-500">
                <div className="flex flex-col items-center">
                  <User className="h-12 w-12 text-gray-300 mb-3" />
                  <span className="text-lg font-medium">No promoters found</span>
                  <span className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</span>
                </div>
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
        promoters.map((p) => {
          const isApproved = !!p.approved_at;
          return (
            <div
              key={p.referral_code}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all duration-200"
              onClick={() => setSelectedPromoter(p)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {p.user?.first_name?.[0]?.toUpperCase() || p.referral_code?.[0]?.toUpperCase() || 'P'}
                  </div>
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">{p.user?.first_name && p.user?.last_name ? `${p.user.first_name} ${p.user.last_name}` : 'User Name Not Available'}</div>
                    <div className="text-sm text-gray-500">{p.referral_code}</div>
                  </div>
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {isApproved ? 'Approved' : 'Pending'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <span className="text-xs text-gray-500">Type</span>
                  <p className="text-sm font-medium text-gray-900">{p.promoter_type}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Phone</span>
                  <p className="text-sm font-medium text-gray-900">{p.phone_number || "-"}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Sales</span>
                  <p className="text-sm font-medium text-gray-900">{p.total_sales_count}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Wallet</span>
                  <p className="text-sm font-medium text-gray-900">₹{p.wallet_balance}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                {!isApproved && p.promoter_type === "unpaid" && (
                  <button
                    onClick={() => handleApprovePromoter(p.id)}
                    disabled={approving === p.id}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {approving === p.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Approving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve Promoter
                      </>
                    )}
                  </button>
                )}
                {isApproved && (
                  <div className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-gray-50">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    Already Approved
                  </div>
                )}
              </div>
            </div>
          );
        })
      ) : (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-lg font-medium text-gray-500">No promoters found</p>
          <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  )}

  {/* Pagination */}
  <div className="flex justify-between items-center mt-6">
    <button
      disabled={!previousPage}
      onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
      className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
        previousPage ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md" : "bg-gray-300 text-gray-500 cursor-not-allowed"
      }`}
    >
      Previous
    </button>
    <span className="text-sm text-gray-600 font-medium">Page {page}</span>
    <button
      disabled={!nextPage}
      onClick={() => setPage((prev) => prev + 1)}
      className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
        nextPage ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md" : "bg-gray-300 text-gray-500 cursor-not-allowed"
      }`}
    >
      Next
    </button>
  </div>

  {/* Modal */}
  {selectedPromoter && (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative shadow-2xl">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white font-bold text-lg">
                {selectedPromoter.user?.first_name?.[0]?.toUpperCase() || selectedPromoter.referral_code?.[0]?.toUpperCase() || 'P'}
              </div>
              <div>
                <h3 className="text-2xl font-bold">{selectedPromoter.user?.first_name && selectedPromoter.user?.last_name ? `${selectedPromoter.user.first_name} ${selectedPromoter.user.last_name}` : 'User Name Not Available'}</h3>
                <p className="text-blue-100">{selectedPromoter.referral_code}</p>
              </div>
            </div>
            <button
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              onClick={() => setSelectedPromoter(null)}
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* Status Badge */}
          <div className="mb-6">
            <span className={`inline-flex px-4 py-2 text-sm font-semibold rounded-full ${
              selectedPromoter.premium_activated_at ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {selectedPromoter.premium_activated_at ? '✅ Approved Promoter' : '⏳ Pending Approval'}
            </span>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                <User className="h-5 w-5 mr-2 text-blue-600" />
                Personal Information
              </h4>
              <div className="space-y-3 bg-gray-50 rounded-lg p-4">
                <div>
                  <span className="text-xs text-gray-500">Full Name</span>
                  <p className="text-sm font-medium text-gray-900">{selectedPromoter.user?.first_name && selectedPromoter.user?.last_name ? `${selectedPromoter.user.first_name} ${selectedPromoter.user.last_name}` : 'User Name Not Available'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Email</span>
                  <p className="text-sm font-medium text-gray-900">{selectedPromoter.user?.email || "Email not available"}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Phone</span>
                  <p className="text-sm font-medium text-gray-900">{selectedPromoter.phone_number || "-"}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Submitted</span>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedPromoter.submitted_at ? new Date(selectedPromoter.submitted_at).toLocaleDateString() : "-"}
                  </p>
                </div>
              </div>
            </div>

            {/* Promoter Details */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                <Building className="h-5 w-5 mr-2 text-purple-600" />
                Promoter Details
              </h4>
              <div className="space-y-3 bg-gray-50 rounded-lg p-4">
                <div>
                  <span className="text-xs text-gray-500">Promoter Type</span>
                  <p className="text-sm font-medium text-gray-900">{selectedPromoter.promoter_type}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Referral Code</span>
                  <p className="text-sm font-medium text-gray-900">{selectedPromoter.referral_code}</p>
                            </div>
                <div>
                  <span className="text-xs text-gray-500">Parent Promoter</span>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedPromoter.parent_promoter 
                      ? `${selectedPromoter.parent_promoter.email} (${selectedPromoter.parent_promoter.promoter_type})` 
                      : "-"
                    }
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Approved At</span>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedPromoter.premium_activated_at 
                      ? new Date(selectedPromoter.premium_activated_at).toLocaleDateString() 
                      : "Not approved yet"
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Bank Information */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                <CreditCard className="h-5 w-5 mr-2 text-green-600" />
                Bank Information
              </h4>
              <div className="space-y-3 bg-gray-50 rounded-lg p-4">
                <div>
                  <span className="text-xs text-gray-500">Account Holder</span>
                  <p className="text-sm font-medium text-gray-900">{selectedPromoter.account_holder_name || "-"}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Bank Name</span>
                  <p className="text-sm font-medium text-gray-900">{selectedPromoter.bank_name || "-"}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">IFSC Code</span>
                  <p className="text-sm font-medium text-gray-900">{selectedPromoter.ifsc_code || "-"}</p>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-orange-600" />
                Performance
              </h4>
              <div className="space-y-3 bg-gray-50 rounded-lg p-4">
                <div>
                  <span className="text-xs text-gray-500">Total Sales</span>
                  <p className="text-sm font-medium text-gray-900">{selectedPromoter.total_sales_count} sales</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Commission Earned</span>
                  <p className="text-sm font-medium text-gray-900">₹{selectedPromoter.total_commission_earned}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Wallet Balance</span>
                  <p className="text-sm font-medium text-gray-900">₹{selectedPromoter.wallet_balance}</p>
                </div>
              </div>
            </div>

            {/* Promoted Products */}
            <div className="space-y-4 md:col-span-2 lg:col-span-2">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                <Building className="h-5 w-5 mr-2 text-indigo-600" />
                Promoted Products
              </h4>
              <div className="bg-gray-50 rounded-lg p-4">
                {selectedPromoter.promoted_products.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedPromoter.promoted_products.map((product, index) => (
                      <span 
                        key={index}
                        className="inline-flex px-3 py-1 text-sm font-medium bg-white border border-gray-200 rounded-full text-gray-700"
                      >
                        {product.variant_name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No products promoted yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setSelectedPromoter(null)}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors duration-200"
              >
                Close
              </button>
              {!selectedPromoter.premium_activated_at && (
                <button
                  onClick={() => handleApprovePromoter(selectedPromoter.id)}
                  disabled={approving === selectedPromoter.id}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 font-medium transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {approving === selectedPromoter.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Promoter
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )}
</div>


  );
};

export default AdminPromoters;
