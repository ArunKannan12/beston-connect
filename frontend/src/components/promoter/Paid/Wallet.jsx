import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import axiosInstance from '../../../api/axiosinstance';

const Wallet = () => {
  const [walletData, setWalletData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const { data } = await axiosInstance.get('paid/wallet-summary/'); // your API endpoint
      setWalletData(data);
    } catch (err) {
      toast.error("Failed to fetch wallet data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading wallet...</div>;
  if (!walletData) return <div>No wallet data available.</div>;

  const {
    total_earned,
    total_withdrawn,
    available_balance,
    pending_withdrawals,
    withdrawable_balance,
    recent_commissions,
    recent_withdrawals
  } = walletData;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">💰 Wallet Summary</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-white shadow rounded">
          <h2 className="text-gray-500">Total Earned</h2>
          <p className="text-xl font-bold">₹{total_earned}</p>
        </div>
        <div className="p-4 bg-white shadow rounded">
          <h2 className="text-gray-500">Total Withdrawn</h2>
          <p className="text-xl font-bold">₹{total_withdrawn}</p>
        </div>
        <div className="p-4 bg-white shadow rounded">
          <h2 className="text-gray-500">Available Balance</h2>
          <p className="text-xl font-bold">₹{available_balance}</p>
        </div>
        <div className="p-4 bg-white shadow rounded">
          <h2 className="text-gray-500">Pending Withdrawals</h2>
          <p className="text-xl font-bold">₹{pending_withdrawals}</p>
        </div>
        <div className="p-4 bg-white shadow rounded">
          <h2 className="text-gray-500">Withdrawable Balance</h2>
          <p className="text-xl font-bold">₹{withdrawable_balance}</p>
        </div>
      </div>

      {/* Recent Commissions */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Recent Commissions</h2>
        {recent_commissions.length === 0 ? (
          <p className="text-gray-500">No recent commissions.</p>
        ) : (
          <ul className="space-y-2">
            {recent_commissions.map((c, idx) => (
              <li key={idx} className="p-2 bg-white shadow rounded flex justify-between">
                <span>₹{c.amount}</span>
                <span className="text-gray-400">{new Date(c.created_at).toLocaleDateString()}</span>
                <span className="capitalize">{c.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recent Withdrawals */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Recent Withdrawals</h2>
        {recent_withdrawals.length === 0 ? (
          <p className="text-gray-500">No recent withdrawals.</p>
        ) : (
          <ul className="space-y-2">
            {recent_withdrawals.map((w, idx) => (
              <li key={idx} className="p-2 bg-white shadow rounded flex justify-between">
                <span>₹{w.amount}</span>
                <span className="text-gray-400">{new Date(w.requested_at).toLocaleDateString()}</span>
                <span className="capitalize">{w.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Wallet;
