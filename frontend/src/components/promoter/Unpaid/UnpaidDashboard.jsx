import React, { useEffect, useState } from "react";
import axiosInstance from "../../../api/axiosinstance";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/authContext";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";

const UnpaidDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const promoterType = user?.promoter_profile?.promoter_type || "unpaid";

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await axiosInstance.get("unpaid/dashboard/");
        setStats(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error || !stats) return <p className="text-red-600">{error}</p>;

  const isPremium = promoterType === "paid";

  return (
    <div className="p-6 bg-white rounded-lg shadow max-w-5xl mx-auto mt-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          📊 Promoter Dashboard
          {isPremium && (
            <span className="bg-yellow-100 text-yellow-600 px-2 py-1 text-sm rounded">
              ⭐ Premium Promoter
            </span>
          )}
        </h2>

        {!isPremium && (
          <button
            onClick={() => navigate("/promoter/become-premium-promoter")}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
          >
            Become Premium
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <Stat label="Promoted Products" value={stats.promoted_products} />
        <Stat label="Total Referrals" value={stats.total_referrals} />
        <Stat label="Successful Orders" value={stats.successful_orders} />
        <Stat label="Cancelled Orders" value={stats.cancelled_orders} />
        <Stat
          label="Revenue Generated"
          value={`₹${stats.total_revenue_generated}`}
        />
        <Stat label="Unique Customers" value={stats.unique_customers} />
      </div>

      {/* Latest Orders */}
      <h3 className="text-xl font-semibold mb-3">Latest Referred Orders</h3>
      {stats.latest_referred_orders.length === 0 ? (
        <p className="text-gray-500">No referred orders yet.</p>
      ) : (
        <div className="rounded-xl shadow-sm border border-gray-200 bg-white">
          
          {/* Fixed header – scrollable body */}
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left">Order ID</th>
                  <th className="px-4 py-3 text-left">Created At</th>
                  <th className="px-4 py-3 text-left">Items</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {stats.latest_referred_orders.map((o, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="px-4 py-3 font-medium text-gray-800">
                      #{o.order__id}
                    </td>

                    <td className="px-4 py-3 text-gray-600">
                      {new Date(o.order__created_at).toLocaleString()}
                    </td>

                    <td className="px-4 py-3 text-gray-600">
                      {o.total_items}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}



      {/* Daily Referrals Graph */}
      <div className="mt-6">
        <h3 className="text-xl font-semibold mb-2">📈 Daily Referrals</h3>
        <Graph data={stats.daily_referrals_graph} xKey="day" yKey="count" />
      </div>

      {/* Daily Revenue Graph */}
      <div className="mt-6">
        <h3 className="text-xl font-semibold mb-2">💰 Daily Revenue</h3>
        <Graph data={stats.daily_revenue_graph} xKey="day" yKey="amount" />
      </div>

      {/* Monthly Revenue Graph */}
      <div className="mt-6">
        <h3 className="text-xl font-semibold mb-2">📊 Monthly Revenue</h3>
        <Graph data={stats.monthly_revenue_graph} xKey="month" yKey="amount" />
      </div>
    </div>
  );
};

const Stat = ({ label, value }) => (
  <div className="p-4 bg-gray-100 rounded shadow text-center">
    <p className="text-gray-600">{label}</p>
    <p className="text-xl font-bold">{value}</p>
  </div>
);

const Graph = ({ data, xKey, yKey }) => (
  <div className="w-full h-64 bg-white border rounded shadow p-3">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey={yKey} stroke="#2563eb" strokeWidth={3} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

export default UnpaidDashboard;
