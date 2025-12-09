import React, { useEffect, useState } from "react";
import axiosInstance from "../../../api/axiosinstance";
import { toast } from "react-toastify";

const PaidDashboard = () => {
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
  console.log(dashboard);
  console.log(analytics);



  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const totalAnalytics = analytics.reduce((acc, item) => acc + item.total, 0);

  return (
    <div className="flex flex-col p-6 md:p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2 md:mb-0">
          👑 Premium Promoter Dashboard
        </h1>
        <span className="text-sm text-gray-600">
          {dashboard?.promoter_name && `Welcome, ${dashboard.promoter_name}`}
        </span>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-6">
        <StatCard
          title="Total Commission"
          value={`₹${dashboard?.total_commission?.toFixed(2)}`}
          color="text-green-600"
        />

        <StatCard
          title="Pending Withdrawals"
          value={dashboard?.pending_withdrawals || 0}
          color="text-red-600"
        />

        <StatCard
          title="Available to Withdraw"
          value={`₹${dashboard?.withdrawable_balance?.toFixed(2)}`}
          color="text-yellow-600"
        />

        <StatCard
          title="Wallet Balance"
          value={`₹${dashboard?.wallet_balance?.toFixed(2)}`}
          color="text-blue-600"
        />
        <StatCard
          title="Commission (Last 30 Days)"
          value={`₹${dashboard?.commission_last_30_days?.toFixed(2)}`}
          color="text-indigo-600"
        />

        <StatCard
          title="Pending Commission"
          value={`₹${dashboard?.pending_commission_amount?.toFixed(2)}`}
          color="text-orange-600"
        />

        <StatCard
          title="Paid Commission"
          value={`₹${dashboard?.paid_commission_amount?.toFixed(2)}`}
          color="text-teal-600"
        />

        <StatCard
          title="Total Withdrawn"
          value={`₹${dashboard?.total_withdrawn?.toFixed(2)}`}
          color="text-green-700"
        />

        <StatCard
          title="Total Referrals"
          value={dashboard?.total_referrals}
          color="text-pink-600"
        />

        <StatCard
          title="Successful Orders"
          value={dashboard?.successful_orders}
          color="text-blue-700"
        />

      </div>

      {/* Performance Analytics */}
      <div className="bg-white shadow-md rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          📈 Performance Analytics
        </h2>

        {analytics.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <AnalyticsItem
              label="Total Earned"
              value={`₹${totalAnalytics.toFixed(2)}`}
            />
            <AnalyticsItem
              label="Months Tracked"
              value={analytics.length}
            />
          </div>
        ) : (
          <p className="text-gray-500">No analytics data available.</p>
        )}
      </div>
        {/* Recent Withdrawals */}
      <div className="bg-white shadow-md rounded-xl p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          💸 Recent Withdrawals
        </h2>

        {dashboard?.recent_withdrawals?.length > 0 ? (
          <div className="space-y-3">
            {dashboard.recent_withdrawals.map((w, i) => (
              <div
                key={i}
                className="flex justify-between p-3  rounded-lg"
              >
                <span>₹{w.amount}</span>
                <span>{new Date(w.requested_at).toLocaleDateString()}</span>
                <span className="capitalize">{w.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No recent withdrawals.</p>
        )}
      </div>

            {/* Promoted Products */}
            
    </div>
  );
};

/* Subcomponents */
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
