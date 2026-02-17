import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axiosinstance";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Wallet,
  ArrowUpRight,
  ShoppingBag,
  Users,
  Clock,
  ArrowDownToLine,
  ChevronRight,
  Calendar,
  IndianRupee,
  Award
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const PaidDashboard = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [dashboardRes, analyticsRes] = await Promise.all([
          axiosInstance.get("paid/dashboard/"),
          axiosInstance.get("paid/performance-analytics/"),
        ]);

        setDashboard(dashboardRes.data);
        setAnalytics(analyticsRes.data || []);
      } catch (error) {
        console.error("Dashboard fetch error:", error.response || error.message);
        toast.error("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Format analytics data for chart
  const chartData = analytics.map(item => ({
    name: new Date(item.month).toLocaleDateString(undefined, { month: 'short' }),
    total: parseFloat(item.total)
  }));

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      className="p-4 md:p-8 pt-24 bg-gray-50/50 min-h-screen pb-20"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200">
              <Award size={24} />
            </span>
            Premium Dashboard
          </h1>
          <p className="text-gray-500 mt-1">
            Welcome back, <span className="text-indigo-600 font-bold">{dashboard?.promoter_name}</span>. Here's your performance overview.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-gray-200 shadow-sm text-sm font-medium text-gray-600">
          <Calendar size={16} /> {new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <GlassCard
          title="Total Commission"
          value={`₹${dashboard?.total_commission?.toLocaleString()}`}
          icon={<IndianRupee className="text-emerald-600" size={20} />}
          subValue="Life-time earnings"
          color="emerald"
        />
        <GlassCard
          title="Wallet Balance"
          value={`₹${dashboard?.wallet_balance?.toLocaleString()}`}
          icon={<Wallet className="text-indigo-600" size={20} />}
          subValue="Available for withdrawal"
          color="indigo"
        />
        <GlassCard
          title="Total Referrals"
          value={dashboard?.total_referrals || "0"}
          icon={<Users className="text-amber-600" size={20} />}
          subValue="Active network size"
          color="amber"
        />
        <GlassCard
          title="Successful Orders"
          value={dashboard?.successful_orders || "0"}
          icon={<ShoppingBag className="text-rose-600" size={20} />}
          subValue="Conversion success"
          color="rose"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
        {/* Earnings Chart */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-8 bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm"
        >
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Earnings analytics</h2>
              <p className="text-sm text-gray-500">Monthly commission breakdown</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-indigo-600">₹{chartData.reduce((a, b) => a + b.total, 0).toLocaleString()}</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total in chart</p>
            </div>
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  dx={-10}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  cursor={{ stroke: '#4f46e5', strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Breakdown Panel */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-4 bg-gradient-to-br from-indigo-900 to-indigo-800 rounded-[2.5rem] p-8 text-white shadow-xl flex flex-col justify-between"
        >
          <div>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <TrendingUp size={20} className="text-indigo-400" />
              Efficiency
            </h2>
            <div className="space-y-6">
              <BreakdownItem label="Pending Comm." value={dashboard?.pending_commission_amount} icon={<Clock size={16} />} />
              <BreakdownItem label="Paid Comm." value={dashboard?.paid_commission_amount} icon={<ArrowUpRight size={16} />} />
              <BreakdownItem label="Withdrawn" value={dashboard?.total_withdrawn} icon={<ArrowDownToLine size={16} />} />
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400 text-sm">Last 30 Days</p>
              <span className="text-emerald-400 text-xs font-bold">+₹{dashboard?.commission_last_30_days || 0}</span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div className="bg-white h-full" style={{ width: '65%' }}></div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Withdrawals Section */}
      <motion.div variants={itemVariants} className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold text-gray-900">Recent Withdrawals</h2>
          <button
            onClick={() => navigate('/promoter/withdrawals')}
            className="text-indigo-600 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all"
          >
            View all <ChevronRight size={16} />
          </button>
        </div>

        {dashboard?.recent_withdrawals?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[10px] text-gray-400 font-bold uppercase tracking-widest border-b border-gray-50">
                  <th className="pb-4">Amount</th>
                  <th className="pb-4 text-center">Date</th>
                  <th className="pb-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {dashboard.recent_withdrawals.map((w, i) => (
                  <tr key={i} className="group hover:bg-gray-50 transition-colors">
                    <td className="py-4 font-bold text-gray-900">₹{w.amount}</td>
                    <td className="py-4 text-center text-sm text-gray-500">{new Date(w.requested_at).toLocaleDateString()}</td>
                    <td className="py-4 text-right">
                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter ${w.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        w.status === 'completed' || w.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-rose-100 text-rose-700'
                        }`}>
                        {w.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-gray-400 border border-dashed border-gray-200 rounded-3xl">
            <ArrowDownToLine size={32} className="mb-2 opacity-20" />
            <p className="text-sm font-medium">No recent withdrawal activity</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

/* Subcomponents */
const GlassCard = ({ title, value, icon, subValue, color }) => {
  const colorMap = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all"
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-xl ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-2xl font-black text-gray-900">{value}</h3>
        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
          {subValue}
        </p>
      </div>
    </motion.div>
  );
};

const BreakdownItem = ({ label, value, icon }) => (
  <div className="flex items-center justify-between group">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-white/10 rounded-lg text-indigo-300 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <p className="text-sm font-medium text-indigo-100">{label}</p>
    </div>
    <p className="font-bold text-lg text-white">₹{parseFloat(value || 0).toLocaleString()}</p>
  </div>
);

export default PaidDashboard;
