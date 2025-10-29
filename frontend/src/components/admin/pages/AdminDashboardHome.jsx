import { useEffect, useState } from "react";
import axiosInstance from "../../../api/axiosinstance";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import AdminDashboardShimmer from "../../../shimmer/AdminDashboardShimmer";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A28CF0"];

const AdminDashboardHome = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axiosInstance.get("dashboard-stats/");
        setStats(res.data);
        console.log(res.data);
      } catch (error) {
        const errMsg = error.response?.data?.detail || "Failed to load stats";
        toast.error(errMsg);
      }
    };
    fetchData();
  }, []);

  if (!stats) return <AdminDashboardShimmer />;

  return (
    <div className="space-y-8 p-6 bg-gray-50 min-h-screen">
      {/* 1. Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-6">
        {[
          {
            label: "Total Orders",
            value: stats.total_orders,
            icon: "📦",
            color: "from-blue-500 to-indigo-600",
          },
          {
            label: "Total Sales",
            value: `₹${stats.total_sales}`,
            icon: "💰",
            color: "from-green-500 to-emerald-600",
          },
          {
            label: "Products",
            value: stats.total_products,
            icon: "🛍️",
            color: "from-purple-500 to-pink-600",
          },
          {
            label: "Customers",
            value: stats.total_customers,
            icon: "👥",
            color: "from-orange-500 to-yellow-500",
          },
          {
            label: "Pending Orders",
            value: stats.pending_orders,
            icon: "⏳",
            color: "from-red-500 to-rose-600",
          },
          {
            label: "Deliverymen",
            value: stats.total_deliveryman,
            icon: "🚚",
            color: "from-teal-500 to-cyan-600",
          },
          {
            label: "Warehouse Staff",
            value: stats.total_warehousestaff,
            icon: "🏭",
            color: "from-pink-500 to-rose-600",
          },
        ].map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`p-6 rounded-2xl shadow-lg bg-gradient-to-r ${card.color} text-white`}
          >
            <div className="text-3xl mb-2">{card.icon}</div>
            <p className="text-sm opacity-80">{card.label}</p>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-xs mt-1 opacity-70">+12% vs last month</p>
          </motion.div>
        ))}
      </div>

      {/* 2. Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Line Chart */}
        <div className="p-6 bg-white rounded-2xl shadow">
          <h3 className="mb-4 font-semibold text-gray-800">Monthly Sales</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={stats.monthly_sales}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#4f46e5"
                fill="url(#salesGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Orders by Status Donut */}
        <div className="p-6 bg-white rounded-2xl shadow">
          <h3 className="mb-4 font-semibold text-gray-800">
            Orders by Status
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={Object.entries(stats.orders_by_status).map(
                  ([key, value]) => ({ name: key, value })
                )}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
              >
                {Object.keys(stats.orders_by_status).map((_, index) => (
                  <Cell
                    key={index}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="p-6 bg-white rounded-2xl shadow">
          <h3 className="mb-4 font-semibold text-gray-800">🔥 Top Products</h3>
          <div className="space-y-4">
            {stats.top_products.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center justify-between p-4 rounded-xl border bg-gray-50 hover:shadow-md transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{p.name}</p>
                    <p className="text-xs text-gray-500">ID: {p.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{p.sold}</p>
                  <p className="text-xs text-gray-500">Sold</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Low Stock */}
        <div className="p-6 bg-white rounded-2xl shadow">
          <h3 className="mb-4 font-semibold text-gray-800">
            ⚠️ Low Stock Products
          </h3>
          <div className="space-y-4">
            {stats.low_stock_products.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center justify-between p-4 rounded-xl border bg-white hover:bg-red-50 hover:shadow-md transition"
              >
                <div>
                  <p className="font-medium text-gray-800">
                    {p.product__name}
                  </p>
                  <p className="text-xs text-gray-500">ID: {p.id}</p>
                </div>
                <div className="w-40">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Stock</span>
                    <span
                      className={`font-bold ${
                        p.stock < 10 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {p.stock}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className={`h-2 rounded-full ${
                        p.stock < 10 ? "bg-red-500" : "bg-green-500"
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(p.stock, 100)}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
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
