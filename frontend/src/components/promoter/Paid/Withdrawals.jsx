import React, { useEffect, useState } from "react";
import axiosInstance from "../../../api/axiosinstance";
import { toast } from "react-toastify";
import WithdrawalRetrieveModal from "../Modal/WithdrawalRetrieveModal";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Filter,
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  Banknote,
  History
} from "lucide-react";

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

  const statusConfig = {
    pending: { color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
    approved: { color: "bg-blue-100 text-blue-800 border-blue-200", icon: CheckCircle2 },
    rejected: { color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans relative overflow-x-hidden pb-12">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-br from-indigo-50 via-white to-amber-50/50 -z-10" />
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-[100px] -z-10" />
      <div className="absolute top-[20%] left-[-10%] w-[400px] h-[400px] bg-amber-100/30 rounded-full blur-[80px] -z-10" />

      <motion.div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="flex flex-col mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            Withdrawal History
          </h1>
          <p className="text-gray-500 mt-2 text-lg">Manage and track your earnings withdrawals.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left Column: Request Form */}
          <motion.div variants={itemVariants} className="lg:col-span-4 xl:col-span-3">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Banknote size={140} />
              </div>

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-white/10 rounded-lg backdrop-blur-md">
                    <CreditCard size={24} className="text-amber-400" />
                  </div>
                  <h2 className="text-xl font-bold">Request New</h2>
                </div>

                <p className="text-gray-300 mb-6 text-sm">
                  Enter the amount you wish to withdraw to your linked bank account.
                </p>

                <form onSubmit={handleCreateWithdrawal} className="space-y-4">
                  <div>
                    <label className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1 block">Amount</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={creating}
                    className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${creating
                      ? "bg-gray-700 cursor-not-allowed text-gray-400"
                      : "bg-amber-400 hover:bg-amber-500 text-gray-900 hover:shadow-lg hover:shadow-amber-400/20"
                      }`}
                  >
                    {creating ? (
                      <>Processing...</>
                    ) : (
                      <>Request Withdrawal <ArrowRight size={18} /></>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </motion.div>

          {/* Right Column: History & Filters */}
          <motion.div variants={itemVariants} className="lg:col-span-8 xl:col-span-9">

            {/* Filters */}
            <div className="bg-white/70 backdrop-blur-md p-4 rounded-2xl border border-white/60 shadow-sm mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
              <div className="flex items-center gap-2 text-gray-500 bg-white px-3 py-2 rounded-lg border border-gray-200">
                <Filter size={18} />
                <span className="text-sm font-medium">Filters</span>
              </div>

              <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer hover:border-indigo-300 transition-colors"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>

                <select
                  value={ordering}
                  onChange={(e) => setOrdering(e.target.value)}
                  className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer hover:border-indigo-300 transition-colors"
                >
                  <option value="">Sort By</option>
                  <option value="requested_at">Oldest First</option>
                  <option value="-requested_at">Newest First</option>
                  <option value="amount">Amount (Low to High)</option>
                  <option value="-amount">Amount (High to Low)</option>
                </select>
              </div>
            </div>

            {/* List */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-2"></div>
                <p>Loading transactions...</p>
              </div>
            ) : withdrawals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white/40 rounded-3xl border border-dashed border-gray-300">
                <History size={48} className="text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg font-medium">No withdrawal history found.</p>
                <p className="text-gray-400 text-sm">Requests you make will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {withdrawals.map((w, i) => {
                    const StatusIcon = statusConfig[w.status]?.icon || AlertCircle;
                    const statusStyles = statusConfig[w.status]?.color || "bg-gray-100 text-gray-600";

                    return (
                      <motion.div
                        key={w.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => retrieveWithdrawal(w.id)}
                        className="group bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer flex flex-col sm:flex-row justify-between items-center gap-4"
                      >
                        <div className="flex items-center gap-4 w-full sm:w-auto">
                          <div className={`p-3 rounded-xl ${statusStyles.split(' ')[0]}`}>
                            <StatusIcon size={24} className={statusStyles.split(' ')[1]} />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">₹{w.amount}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Calendar size={14} />
                              {new Date(w.requested_at).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                          <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${statusStyles}`}>
                            {w.status}
                          </span>
                          <ChevronRight size={18} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            {/* Pagination */}
            <div className="flex justify-center items-center gap-6 mt-8">
              <button
                onClick={handlePrevPage}
                disabled={!previousPage}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 rounded-xl shadow-sm border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                <ChevronLeft size={18} /> Previous
              </button>
              <button
                onClick={handleNextPage}
                disabled={!nextPage}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 rounded-xl shadow-sm border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                Next <ChevronRight size={18} />
              </button>
            </div>

          </motion.div>
        </div>
      </motion.div>

      {/* Withdrawal Modal */}
      <WithdrawalRetrieveModal open={open} onClose={() => setOpen(false)} title="Withdrawal Details">
        {selectedData ? (
          <div className="space-y-4">
            <div className="text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 mb-4">
              <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Amount</p>
              <p className="text-3xl font-extrabold text-gray-900">₹{selectedData.amount}</p>
            </div>

            <div className="space-y-3 px-2">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Status</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${statusConfig[selectedData.status]?.color}`}>
                  {selectedData.status}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Date Requested</span>
                <span className="text-gray-900 font-medium">{new Date(selectedData.requested_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Admin Note</span>
                <span className="text-gray-900 font-medium text-right max-w-[60%]">{selectedData.admin_note || "—"}</span>
              </div>
            </div>

            {/* Cancel button visible only if pending */}
            {selectedData.status === "pending" && (
              <button
                onClick={cancelWithdrawal}
                className="mt-6 w-full bg-red-50 text-red-600 border border-red-200 py-3 rounded-xl font-bold hover:bg-red-100 hover:border-red-300 transition-all flex items-center justify-center gap-2"
              >
                <XCircle size={18} /> Cancel Withdrawal Requests
              </button>
            )}
          </div>
        ) : (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        )}
      </WithdrawalRetrieveModal>
    </div>
  );
};

export default Withdrawals;
