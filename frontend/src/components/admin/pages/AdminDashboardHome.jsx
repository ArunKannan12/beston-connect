import { useEffect, useState } from "react";
import axiosInstance from "../../../api/axiosinstance";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
  LineChart,
  Line,
} from "recharts";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import AdminDashboardShimmer from "../../../shimmer/AdminDashboardShimmer";
import {
  TrendingUp,
  ShoppingCart,
  Package,
  Users,
  AlertTriangle,
  DollarSign,
  Activity,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
} from "lucide-react";

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#ef4444"];

const AdminDashboardHome = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axiosInstance.get("dashboard-stats/");
        setStats(res.data);
      } catch (error) {
        const errMsg = error.response?.data?.detail || "Failed to load stats";
        toast.error(errMsg);
      }
    };
    fetchData();
  }, []);

  if (!stats) return <AdminDashboardShimmer />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-500 mt-1">Monitor your business performance and key metrics</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {[
          { 
            label: "Total Orders", 
            value: stats.total_orders, 
            icon: ShoppingCart, 
            color: "from-blue-500 to-indigo-600",
            bg: "bg-blue-50",
            textColor: "text-blue-600",
            change: "+12.5%",
            changePositive: true
          },
          { 
            label: "Total Sales", 
            value: `₹${stats.total_sales}`, 
            icon: DollarSign, 
            color: "from-green-500 to-emerald-600",
            bg: "bg-green-50",
            textColor: "text-green-600",
            change: "+8.2%",
            changePositive: true
          },
          { 
            label: "Products", 
            value: stats.total_products, 
            icon: Package, 
            color: "from-purple-500 to-pink-600",
            bg: "bg-purple-50",
            textColor: "text-purple-600",
            change: "+5.1%",
            changePositive: true
          },
          { 
            label: "Customers", 
            value: stats.total_customers, 
            icon: Users, 
            color: "from-orange-500 to-yellow-500",
            bg: "bg-orange-50",
            textColor: "text-orange-600",
            change: "+15.3%",
            changePositive: true
          },
          { 
            label: "Pending Orders", 
            value: stats.pending_orders, 
            icon: AlertTriangle, 
            color: "from-red-500 to-rose-600",
            bg: "bg-red-50",
            textColor: "text-red-600",
            change: "-2.4%",
            changePositive: false
          },
        ].map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="relative"
          >
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${card.bg} rounded-xl flex items-center justify-center`}>
                  <card.icon className={`w-6 h-6 ${card.textColor}`} />
                </div>
                <div className={`flex items-center gap-1 text-sm ${
                  card.changePositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {card.changePositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {card.change}
                </div>
              </div>
              <div>
                <p className="text-gray-500 text-sm mb-1">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Revenue Overview</h3>
              <p className="text-sm text-gray-500">Monthly revenue trends</p>
            </div>
            <button className="p-2 hover:bg-gray-50 rounded-lg transition-colors">
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={stats.monthly_sales}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#f3f4f6' }}
              />
              <Area 
                type="monotone" 
                dataKey="total" 
                stroke="#6366f1" 
                strokeWidth={2}
                fill="url(#revenueGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Orders by Status */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Order Status</h3>
              <p className="text-sm text-gray-500">Distribution by status</p>
            </div>
            <button className="p-2 hover:bg-gray-50 rounded-lg transition-colors">
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={Object.entries(stats.orders_by_status).map(([name, value]) => ({ name, value }))}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
              >
                {Object.keys(stats.orders_by_status).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#f3f4f6' }}
              />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Products Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-500" />
                Top Products
              </h3>
              <p className="text-sm text-gray-500">Best selling items</p>
            </div>
            <button className="p-2 hover:bg-gray-50 rounded-lg transition-colors">
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="space-y-4">
            {stats.top_products.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-red-400 rounded-xl flex items-center justify-center text-white font-bold">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{p.name}</p>
                    <p className="text-sm text-gray-500">ID: {p.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900">{p.sold}</p>
                  <p className="text-sm text-gray-500">units sold</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Low Stock Alert
              </h3>
              <p className="text-sm text-gray-500">Products needing restock</p>
            </div>
            <button className="p-2 hover:bg-gray-50 rounded-lg transition-colors">
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="space-y-4">
            {stats.low_stock_products.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-4 rounded-xl border border-red-100 bg-red-50/30"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{p.product__name}</p>
                    <p className="text-sm text-gray-500">ID: {p.id}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    p.stock < 10 ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {p.stock} units
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className={`h-2 rounded-full ${
                      p.stock < 10 ? "bg-red-500" : "bg-yellow-500"
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(p.stock, 100)}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardHome;
