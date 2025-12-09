import React, { useEffect, useState } from "react";
import axiosInstance from "../../../api/axiosinstance";
import { toast } from "react-toastify";

const AdminPromoterWithdrawalRequest = () => {
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [nextPage, setNextPage] = useState(null);
  const [prevPage, setPrevPage] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [adminNote, setAdminNote] = useState("");
  const [actionType, setActionType] = useState("");

  // Fetch Data
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = { page };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const res = await axiosInstance.get(
        "admin/promoter-withdrawal-requests",
        { params }
      );

      setWithdrawalRequests(res.data.results || []);
      console.log(res.data.results);
      
      setNextPage(res.data.next);
      setPrevPage(res.data.previous);
    } catch (e) {
      toast.error("Failed to load withdrawal requests");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, [page, search, statusFilter]);

  // Modal Open
  const openModal = (request, type) => {
    setSelected(request);
    setActionType(type);
    setAdminNote(request.admin_note || '');
    setModalOpen(true);
  };

  // Handle Status Action
  const submitStatus = async () => {
    if (!selected) return;

    const endpoint = `admin/promoter-withdrawal-requests/${selected.id}/${actionType}/`;

    try {
      await axiosInstance.post(endpoint, { admin_note: adminNote });
      setModalOpen(false);
      toast.success("Status updated");
      fetchRequests();
    } catch (error) {
      const msg =
        error?.response?.data?.detail || "Failed to update withdrawal status";
      toast.error(msg.toString());
    }
  };

  const badgeColor = (status) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-700",
      approved: "bg-blue-100 text-blue-700",
      processing: "bg-indigo-100 text-indigo-700",
      completed: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
      failed: "bg-red-100 text-red-700",
    };
    return styles[status] || "bg-gray-200 text-gray-600";
  };

  return (
    <div className="p-5">
      <h1 className="text-2xl font-semibold mb-6">Promoter Withdrawal Requests</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <input
            className="w-full px-4 py-2.5 rounded-xl  bg-white shadow-sm pr-10 focus:ring focus:ring-indigo-200"
            placeholder="Search promoter..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          <svg
            className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M21 21l-4.35-4.35M4 10a6 6 0 1112 0 6 6 0 01-12 0z" />
          </svg>
        </div>

        {/* Status Filter */}
        <div className="relative w-full sm:w-48">
          <select
            className="
              w-full px-4 py-2.5 rounded-xl  bg-white shadow-sm
              pr-10 appearance-none cursor-pointer
              focus:ring focus:ring-indigo-200
            "
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="failed">Failed</option>
          </select>

          <svg
            className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-xl shadow ">
        <table className="min-w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-4 text-sm font-semibold text-gray-600">Promoter</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Amount</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Date</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Status</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {!loading &&
              withdrawalRequests.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <p className="font-semibold">{item.promoter.full_name}</p>
                    <p className="text-sm text-gray-500">{item.promoter.email}</p>
                  </td>
                  <td className="p-4 font-semibold">₹{item.amount}</td>
                  <td className="p-4 text-sm text-gray-600">
                    {new Date(item.requested_at).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${badgeColor(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </span>
                  </td>

                  {/* ACTION BUTTONS */}
                  <td className="p-4">
                    {item.status === "pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => openModal(item, "approve")}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => openModal(item, "reject")}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {item.status === "approved" && (
                      <button
                        onClick={() => openModal(item, "processing")}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        Mark Processing
                      </button>
                    )}

                    {item.status === "processing" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => openModal(item, "complete")}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          Complete
                        </button>

                        <button
                          onClick={() => openModal(item, "fail")}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          Fail
                        </button>
                      </div>
                    )}

                    {(item.status === "completed" ||
                      item.status === "rejected" ||
                      item.status === "failed") && (
                      <span className="text-gray-500 italic">No Actions</span>
                    )}
                  </td>
                </tr>
              ))}

            {!loading && withdrawalRequests.length === 0 && (
              <tr>
                <td colSpan="5" className="p-6 text-center text-gray-500">
                  No withdrawal requests found.
                </td>
              </tr>
            )}

            {loading && (
              <tr>
                <td colSpan="5" className="p-6 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-6">
        <button
          disabled={!prevPage}
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
          className={`px-4 py-2 rounded-lg shadow ${
            prevPage
              ? "bg-gray-800 text-white hover:bg-black"
              : "bg-gray-200 text-gray-500 cursor-not-allowed"
          }`}
        >
          Previous
        </button>

        <span className="font-medium text-gray-700">Page {page}</span>

        <button
          disabled={!nextPage}
          onClick={() => setPage((p) => p + 1)}
          className={`px-4 py-2 rounded-lg shadow ${
            nextPage
              ? "bg-gray-800 text-white hover:bg-black"
              : "bg-gray-200 text-gray-500 cursor-not-allowed"
          }`}
        >
          Next
        </button>
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg">
            <h2 className="text-xl font-semibold mb-4 capitalize">
              {actionType} Withdrawal
            </h2>

            <textarea
              className="w-full border rounded-lg p-3 mb-4 focus:ring focus:ring-indigo-200"
              rows="3"
              placeholder="Admin note (optional)"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 bg-gray-400 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={submitStatus}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPromoterWithdrawalRequest;
