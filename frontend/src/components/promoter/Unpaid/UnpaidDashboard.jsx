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
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";

const UnpaidDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
  
  if (error || !stats) return (
    <div className="flex justify-center items-center min-h-screen">
      <p className="text-red-600 bg-red-50 px-6 py-4 rounded-lg">{error}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Top spacing */}
      <div className="h-16"></div>
      
      {/* Header with Upgrade Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                📊 Promoter Dashboard
                <span className="bg-white/20 backdrop-blur px-3 py-1 text-sm rounded-full">
                  Free Plan
                </span>
              </h1>
              <p className="text-blue-100 mt-1">Track your performance and grow your earnings</p>
            </div>
            <button
              onClick={() => navigate("/promoter/become-premium-promoter")}
              className="bg-yellow-400 text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-yellow-300 transition-all transform hover:scale-105 shadow-lg"
            >
              ⭐ Upgrade to Premium
            </button>
          </div>
        </div>
      </div>

      {/* Upgrade Alert Banner */}
      <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              🔒
              <span className="font-medium">Limited Access: Upgrade to Premium to unlock commission details, withdrawal features, and advanced analytics!</span>
            </div>
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="bg-white/90 px-4 py-2 rounded font-medium hover:bg-white transition-colors"
            >
              See Benefits
            </button>
          </div>
        </div>
      </div>

      {/* Extra spacing */}
      <div className="h-8"></div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Performance Overview */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            📈 Performance Overview
            <span className="text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded">Last 30 Days Only</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-600 text-sm font-medium">Products Promoted</span>
                📦
              </div>
              <div className="text-3xl font-bold text-blue-900">{stats.promoted_products}</div>
              <div className="text-blue-600 text-sm mt-1">Active campaigns</div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-green-600 text-sm font-medium">Total Referrals</span>
                👥
              </div>
              <div className="text-3xl font-bold text-green-900">{stats.total_referrals}</div>
              <div className="text-green-600 text-sm mt-1">Customers referred</div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-purple-600 text-sm font-medium">Successful Orders</span>
                ✅
              </div>
              <div className="text-3xl font-bold text-purple-900">{stats.successful_orders}</div>
              <div className="text-purple-600 text-sm mt-1">Completed sales</div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-orange-600 text-sm font-medium">Revenue Generated</span>
                💰
              </div>
              <div className="text-3xl font-bold text-orange-900">₹{stats.total_revenue_generated?.toLocaleString() || 0}</div>
              <div className="text-orange-600 text-sm mt-1">Total sales value</div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Daily Referrals Chart */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              📊 Daily Referrals Trend
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">30 Days</span>
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.daily_referrals_graph || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                    labelStyle={{ color: '#f3f4f6' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily Revenue Chart */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              💰 Daily Revenue
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">30 Days</span>
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.daily_revenue_graph || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                    labelStyle={{ color: '#f3f4f6' }}
                    formatter={(value) => [`₹${value}`, 'Revenue']}
                  />
                  <Bar dataKey="amount" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            📋 Recent Referred Orders
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Latest 5</span>
          </h3>
          
          {stats.latest_referred_orders?.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-gray-500 text-lg">No referred orders yet</p>
              <p className="text-gray-400 mt-2">Start promoting products to see your first orders here!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Order ID</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Items</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.latest_referred_orders.map((order, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          #{order.order__id}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(order.order__created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">
                          {order.total_items} items
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm">
                          Delivered
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Premium Benefits Preview */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl border-2 border-yellow-200 p-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">🚀 Unlock Your Full Earning Potential</h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Upgrade to Premium to access commission details, withdrawal features, advanced analytics, and much more!
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="text-3xl mb-3">💰</div>
                <h4 className="font-bold text-gray-800 mb-2">Commission Tracking</h4>
                <p className="text-gray-600 text-sm">View detailed commission breakdowns and track your earnings in real-time</p>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="text-3xl mb-3">🏦</div>
                <h4 className="font-bold text-gray-800 mb-2">Instant Withdrawals</h4>
                <p className="text-gray-600 text-sm">Withdraw your earnings anytime with our secure payment system</p>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="text-3xl mb-3">📊</div>
                <h4 className="font-bold text-gray-800 mb-2">Advanced Analytics</h4>
                <p className="text-gray-600 text-sm">Access unlimited historical data and detailed performance insights</p>
              </div>
            </div>
            
            <button
              onClick={() => navigate("/promoter/become-premium-promoter")}
              className="bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 px-8 py-4 rounded-lg font-bold text-lg hover:from-yellow-300 hover:to-orange-300 transition-all transform hover:scale-105 shadow-xl"
            >
              ⭐ Upgrade Now - Start Earning More!
            </button>
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800">🌟 Premium Benefits</h3>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4 mb-8">
                {[
                  { icon: '💰', title: 'Commission Details', desc: 'See exact commission rates and earnings breakdown' },
                  { icon: '🏦', title: 'Wallet Access', desc: 'Complete wallet management and withdrawal system' },
                  { icon: '📊', title: 'Advanced Analytics', desc: 'Unlimited historical data and detailed insights' },
                  { icon: '🚀', title: 'Priority Support', desc: 'Get faster response times and dedicated support' },
                  { icon: '📈', title: 'Performance Insights', desc: 'Advanced metrics and conversion tracking' },
                  { icon: '🎯', title: 'Higher Commission Rates', desc: 'Access to exclusive high-commission products' }
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl">{benefit.icon}</div>
                    <div>
                      <h4 className="font-bold text-gray-800">{benefit.title}</h4>
                      <p className="text-gray-600 text-sm">{benefit.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="text-center">
                <button
                  onClick={() => {
                    setShowUpgradeModal(false);
                    navigate("/promoter/become-premium-promoter");
                  }}
                  className="bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 px-8 py-4 rounded-lg font-bold hover:from-yellow-300 hover:to-orange-300 transition-all"
                >
                  Upgrade to Premium
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnpaidDashboard;
