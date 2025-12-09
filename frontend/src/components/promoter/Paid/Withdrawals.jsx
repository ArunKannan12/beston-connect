import React, { useEffect, useState } from "react";
import axiosInstance from "../../../api/axiosinstance";
import { toast } from "react-toastify";
import WithdrawalRetrieveModal from "../Modal/WithdrawalRetrieveModal";

const Withdrawals = () => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [amount, setAmount] = useState('');
  const [page, setPage] = useState(1);
  const [previousPage, setPreviousPage] = useState(null);
  const [nextPage, setNextPage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState('');
  const [ordering, setOrdering] = useState('');

  const [open, setOpen] = useState(false);
  const [selectedData, setSelectedData] = useState(null);

  // Fetch withdrawals list
  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const params = { page };
      if (status) params.status = status;
      if (ordering) params.ordering = ordering;

      const res = await axiosInstance.get("promoter/withdrawals/", { params });
      setWithdrawals(res.data.results);
      console.log(res.data.results,'res data ');
      
      setNextPage(res.data.next);
      setPreviousPage(res.data.previous);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch withdrawals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, [page, status, ordering]);

  const handlePrevPage = () => {
    if (previousPage) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (nextPage) setPage(page + 1);
  };

  const handleCreateWithdrawal = async (e) => {
    e.preventDefault();
    if (!amount) return toast.error("Please enter an amount.");
    setCreating(true);
    try {
      await axiosInstance.post("promoter/withdrawals/", { amount });
      toast.success("Withdrawal request created!");
      setAmount('');
      fetchWithdrawals();
    } catch (error) {
      console.error(error);
      const errMsg = error.response?.data?.detail || 'Failed to create withdrawal';
      toast.error(errMsg);
    } finally {
      setCreating(false);
    }
  };

  // Retrieve a single withdrawal
  const retrieveWithdrawal = async (id) => {
    try {
      const res = await axiosInstance.get(`promoter/withdrawals/${id}/`);
      setSelectedData(res.data);
      setOpen(true);
    } catch (error) {
      console.error(error);
      toast.error("Failed to retrieve withdrawal details.");
    }
  };

  // Cancel a withdrawal
  const cancelWithdrawal = async () => {
    if (!selectedData) return;

    try {
      await axiosInstance.post(`promoter/withdrawals/${selectedData.id}/cancel/`);
      toast.success("Withdrawal request canceled!");
      setOpen(false);
      fetchWithdrawals();
    } catch (error) {
      console.error(error);
      toast.error("Failed to cancel withdrawal.");
    }
  };

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">💸 Withdrawals</h1>

      {/* Create Withdrawal Form */}
      <div className="bg-white shadow-lg rounded-xl p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Request a Withdrawal</h2>
        <form className="flex flex-col md:flex-row gap-4 items-start" onSubmit={handleCreateWithdrawal}>
          <input
            type="number"
            step="0.01"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="p-3 border rounded-lg w-full md:w-64 focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={creating}
            className={`px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition ${creating ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {creating ? "Requesting..." : "Request Withdrawal"}
          </button>
        </form>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="p-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={ordering} onChange={(e) => setOrdering(e.target.value)} className="p-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500">
          <option value="">Default Ordering</option>
          <option value="requested_at">Oldest First</option>
          <option value="-requested_at">Newest First</option>
          <option value="amount">Amount Asc</option>
          <option value="-amount">Amount Desc</option>
        </select>
      </div>

      {/* Withdrawals List */}
      {withdrawals.length === 0 ? (
        <p className="text-gray-500 text-lg">No withdrawals found.</p>
      ) : (
        <div className="grid gap-4">
          {withdrawals.map((w) => (
            <div
              key={w.id}
              onClick={() => retrieveWithdrawal(w.id)}
              className="bg-white shadow-lg rounded-xl p-4 flex justify-between items-center hover:shadow-2xl transition-shadow cursor-pointer"
            >
              <div className="flex flex-col">
                <span className="text-lg font-semibold">₹{w.amount}</span>
                <span className="text-gray-500 text-sm">{new Date(w.requested_at).toLocaleDateString()}</span>
              </div>
              <span className={`px-3 py-1 rounded-full font-medium text-sm ${statusColors[w.status] || 'bg-gray-100 text-gray-800'}`}>
                {w.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-center gap-4 mt-6">
        <button onClick={handlePrevPage} disabled={!previousPage} className="px-6 py-2 bg-gray-200 rounded-full hover:bg-gray-300 disabled:opacity-50 transition">Previous</button>
        <button onClick={handleNextPage} disabled={!nextPage} className="px-6 py-2 bg-gray-200 rounded-full hover:bg-gray-300 disabled:opacity-50 transition">Next</button>
      </div>

      {/* Withdrawal Modal */}
      <WithdrawalRetrieveModal open={open} onClose={() => setOpen(false)} title="Withdrawal Details">
        {selectedData ? (
          <div className="space-y-2">
            <p><strong>Amount:</strong> ₹{selectedData.amount}</p>
            <p><strong>Status:</strong> {selectedData.status}</p>
            <p><strong>Admin Note:</strong> {selectedData.admin_note || "—"}</p>
            <p><strong>Date:</strong> {selectedData.requested_at}</p>

            {/* Cancel button visible only if pending */}
            {selectedData.status === "pending" && (
              <button
                onClick={cancelWithdrawal}
                className="mt-4 w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
              >
                Cancel Withdrawal
              </button>
            )}
          </div>
        ) : (
          <p>Loading...</p>
        )}
      </WithdrawalRetrieveModal>
    </div>
  );
};

export default Withdrawals;
