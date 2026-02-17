import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from "react-router-dom";
import axiosInstance from '../../../api/axiosinstance';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownToLine,
  ArrowRight,
  Clock,
  CheckCircle2,
  CreditCard,
  Banknote,
  TrendingDown,
  Activity,
  History,
  TrendingUp,
  IndianRupee,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

const Wallet = () => {
  const navigate = useNavigate();
  const [walletData, setWalletData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const { data } = await axiosInstance.get('paid/wallet-summary/');
      setWalletData(data);
    } catch (err) {
      toast.error("Failed to fetch wallet data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!walletData) return null;

  const {
    available_balance,
    withdrawable_balance,
    total_earned,
    total_withdrawn,
    pending_withdrawals,
    recent_commissions,
    recent_withdrawals
  } = walletData;

  return (
    <motion.div
      className="p-4 md:p-8 pt-24 min-h-screen bg-gray-50/50 pb-20"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg">
              <WalletIcon size={24} />
            </span>
            Wallet Summary
          </h1>
          <p className="text-gray-500 mt-1">Monitor your funds, earnings, and withdrawal lifecycle</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-gray-200 shadow-sm text-sm font-medium text-gray-600">
          <ShieldCheck size={16} className="text-emerald-500" /> Secure Financial Console
        </div>
      </div>

      {/* Primary Balance Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">

        {/* Main Balance Card */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-12 bg-gray-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-indigo-500/20 transition-all duration-700" />

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="space-y-2">
              <p className="text-indigo-400 text-xs font-black uppercase tracking-[0.2em]">Available Balance</p>
              <h2 className="text-6xl font-black tracking-tighter flex items-baseline gap-2">
                <span className="text-4xl text-indigo-400">₹</span>{available_balance?.toLocaleString()}
              </h2>
              <div className="flex items-center gap-4 pt-4">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Locked / Pending</span>
                  <span className="text-lg font-bold text-gray-300">₹{(available_balance - withdrawable_balance).toLocaleString()}</span>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-indigo-400 font-bold uppercase">Ready to Withdraw</span>
                  <span className="text-lg font-bold text-emerald-400">₹{withdrawable_balance?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/promoter/withdrawals')}
              className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-5 rounded-3xl font-black text-lg shadow-xl shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 group/btn"
            >
              Withdraw Funds
              <ArrowRight size={24} className="group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </div>
        </motion.div>

        {/* Triple Stats */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <GlassStat label="Total Lifetime Earned" value={total_earned} icon={<TrendingUp size={18} />} color="emerald" />
          <GlassStat label="Total Processed Payouts" value={total_withdrawn} icon={<ArrowDownToLine size={18} />} color="indigo" />
          <GlassStat label="In Progress Requests" value={pending_withdrawals} icon={<Clock size={18} />} color="amber" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Commissions */}
        <motion.div variants={itemVariants} className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <IndianRupee size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Recent Commissions</h3>
            </div>
            <button
              onClick={() => navigate('/promoter/dashboard/paid')}
              className="text-indigo-600 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all p-2 hover:bg-indigo-50 rounded-xl"
            >
              Analytics <ChevronRight size={16} />
            </button>
          </div>

          <div className="space-y-4">
            {recent_commissions?.length > 0 ? (
              recent_commissions.map((c, idx) => (
                <TransactionItem
                  key={idx}
                  type="commission"
                  title={c.earning_type === 'direct_sale' ? 'Direct Sale Earning' : 'Network Referral Earning'}
                  date={new Date(c.created_at).toLocaleDateString()}
                  amount={c.amount}
                  status={c.status}
                  orderId={c.order__order_number}
                />
              ))
            ) : (
              <EmptyLog message="No commission data discovered." />
            )}
          </div>
        </motion.div>

        {/* Withdrawal History */}
        <motion.div variants={itemVariants} className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <History size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Withdrawal Log</h3>
            </div>
            <button
              onClick={() => navigate('/promoter/withdrawals')}
              className="text-indigo-600 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all p-2 hover:bg-indigo-50 rounded-xl"
            >
              Full History <ChevronRight size={16} />
            </button>
          </div>

          <div className="space-y-4">
            {recent_withdrawals?.length > 0 ? (
              recent_withdrawals.map((w, idx) => (
                <TransactionItem
                  key={idx}
                  type="withdrawal"
                  title="Payout Transfer"
                  date={new Date(w.requested_at).toLocaleDateString()}
                  amount={w.amount}
                  status={w.status}
                />
              ))
            ) : (
              <EmptyLog message="No withdrawal activity recorded." />
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

/* Components */
const GlassStat = ({ label, value, icon, color }) => {
  const colorMap = {
    emerald: "bg-emerald-50 text-emerald-600",
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all flex items-center justify-between group">
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-black text-gray-900 tracking-tight">₹{parseFloat(value || 0).toLocaleString()}</p>
      </div>
      <div className={`p-4 rounded-2xl ${colorMap[color]} group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
    </div>
  );
};

const TransactionItem = ({ type, title, date, amount, status, orderId }) => (
  <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-3xl border border-gray-50 hover:bg-white hover:shadow-md transition-all cursor-default">
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-2xl ${type === 'commission' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
        {type === 'commission' ? <TrendingUp size={20} /> : <ArrowDownToLine size={20} />}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-gray-900 truncate">
          {title}
          {orderId && <span className="ml-2 px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded text-[9px] font-black uppercase tracking-tighter">#{orderId}</span>}
        </p>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">{date}</p>
      </div>
    </div>
    <div className="text-right">
      <p className={`font-black text-base ${type === 'commission' ? 'text-emerald-600' : 'text-gray-900'}`}>
        {type === 'commission' ? '+' : '-'}₹{parseFloat(amount).toLocaleString()}
      </p>
      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm border ${status === 'credited' || status === 'completed' || status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
          status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
            'bg-gray-50 text-gray-400 border-gray-100'
        }`}>
        {status}
      </span>
    </div>
  </div>
);

const EmptyLog = ({ message }) => (
  <div className="py-12 flex flex-col items-center justify-center text-gray-400 border border-dashed border-gray-200 rounded-3xl">
    <History size={32} className="mb-2 opacity-20" />
    <p className="text-xs font-bold uppercase tracking-widest">{message}</p>
  </div>
);

export default Wallet;
