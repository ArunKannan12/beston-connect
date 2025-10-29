import React, { useEffect, useState } from "react";
import axiosInstance from "../../../api/axiosinstance";
import { toast } from "react-toastify";

const PaidDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [analytics, setAnalytics] = useState([]);
  const [promotedProducts, setPromotedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [dashboardRes, walletRes, analyticsRes, productsRes] =
          await Promise.all([
            axiosInstance.get("paid/dashboard/"),
            axiosInstance.get("paid/wallet-summary/"),
            axiosInstance.get("paid/performance-analytics/"),
            axiosInstance.get("promoted-products/"),
          ]);

        setDashboard(dashboardRes.data);
        setWallet(walletRes.data);
        setAnalytics(analyticsRes.data || []);
        setPromotedProducts(productsRes.data || []);
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Total analytics sum (optional)
  const totalAnalytics = analytics.reduce((acc, item) => acc + item.total, 0);
  console.log(dashboard,'dahboar');
  
  return (
    <div className="flex flex-col p-6 md:p-8 bg-gray-50 min-h-screen">
      {/* ===== Header ===== */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2 md:mb-0">
          👑 Premium Promoter Dashboard
        </h1>
        <span className="text-sm text-gray-600">
          {dashboard?.promoter_name && `Welcome, ${dashboard.promoter_name}`}
        </span>
      </div>

      {/* ===== Overview Cards ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-6">
        <StatCard
          title="Total Commission"
          value={`₹${dashboard?.total_commission?.toFixed(2) || "0.00"}`}
          color="text-green-600"
        />
        <StatCard
          title="Pending Withdrawals"
          value={`${dashboard?.pending_withdrawals || 0}`}
          color="text-red-600"
        />
        <StatCard
          title="Available to Withdraw"
          value={`₹${dashboard?.withdrawable_balance?.toFixed(2) || "0.00"}`}
          color="text-yellow-600"
        />
        <StatCard
          title="Wallet Balance"
          value={`₹${(wallet?.available_balance || dashboard?.wallet_balance || 0).toFixed(2)}`}
          color="text-yellow-600"
        />
        <StatCard
          title="Promoted Products"
          value={`${wallet?.promoted_products || 0}`}
          color="text-green-600"
        />

      </div>

      {/* ===== Performance Analytics ===== */}
      <div className="bg-white shadow-md rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          📈 Performance Analytics
        </h2>
        {analytics.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <AnalyticsItem label="Total Earned" value={`₹${totalAnalytics.toFixed(2)}`} />
            <AnalyticsItem label="Months Tracked" value={analytics.length} />
          </div>
        ) : (
          <p className="text-gray-500">No analytics data available.</p>
        )}
      </div>

      {/* ===== Promoted Products ===== */}
      <div className="bg-white shadow-md rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          🛍️ Promoted Products
        </h2>
        {promotedProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {promotedProducts.map((product) => (
              <div
                key={product.id}
                className="p-4 border border-gray-200 rounded-lg hover:shadow-lg transition flex flex-col"
              >
                <img
                  src={product.image}
                  alt={product.product_name}
                  className="w-full max-h-60 sm:max-h-48 md:max-h-56 lg:max-h-64 object-cover rounded-md mb-3"
                />
                <h3 className="font-semibold text-gray-800 mb-1">
                  {product.product_name} ({product.variant_name})
                </h3>
                <div className="flex justify-between text-sm text-gray-500 mt-auto">
                  <p>{product.stock} in stock</p>
                  <p>₹{product.final_price}</p>
                </div>
                
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No promoted products yet.</p>
        )}
      </div>
    </div>
  );
};

/* ===== Subcomponents ===== */
const StatCard = ({ title, value, color }) => (
  <div className="bg-white shadow-md rounded-xl p-4 flex flex-col justify-between">
    <h3 className="text-gray-600 font-semibold mb-1">{title}</h3>
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
  </div>
);

const AnalyticsItem = ({ label, value, color = "text-gray-800" }) => (
  <div className="flex flex-col">
    <p className="text-gray-500 text-sm">{label}</p>
    <p className={`text-xl font-semibold ${color}`}>{value}</p>
  </div>
);

export default PaidDashboard;
