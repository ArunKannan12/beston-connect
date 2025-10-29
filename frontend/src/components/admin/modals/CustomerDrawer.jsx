import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import axiosInstance from '../../../api/axiosinstance';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const CustomerDrawer = ({ customerID, onClose }) => {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [tempBlockMinutes, setTempBlockMinutes] = useState('');

  useEffect(() => {
    if (!customerID) return;
    const fetchCustomer = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get(`/admin/customers/${customerID}/`);
        setCustomer(res.data);
      } catch (err) {
        toast.error(err?.response?.data?.detail || 'Failed to fetch customer');
      }
      setLoading(false);
    };
    fetchCustomer();
  }, [customerID]);

  if (!customerID) return null;

  const updateStatus = async (action) => {
    if (!customer) return;
    const payload = {};
    if (action === 'tempBlock') {
      if (!tempBlockMinutes || parseInt(tempBlockMinutes) <= 0) {
        return toast.warn('Enter a valid duration in minutes');
      }
      payload.duration_minutes = tempBlockMinutes;
    } else if (action === 'permanent') {
      payload.permanent = true;
    } else if (action === 'unblock') {
      payload.unblock = true;
    }

    setUpdatingStatus(true);
    try {
      const res = await axiosInstance.post(`/admin/customers/${customer.id}/block/`, payload);
      setCustomer((prev) => ({ ...prev, ...res.data }));
      toast.success('Customer status updated!');
      setTempBlockMinutes('');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to update status');
    }
    setUpdatingStatus(false);
  };

  const getRemainingBlockTime = () => {
    if (!customer?.blocked_until) return null;
    const diff = dayjs(customer.blocked_until).diff(dayjs());
    return diff > 0 ? dayjs().to(dayjs(customer.blocked_until)) : null;
  };

  const renderStatusBadge = () => {
    if (customer?.is_permanently_banned) {
      return <span className="text-red-700 bg-red-100 px-2 py-1 rounded-full text-xs">Banned</span>;
    }
    if (customer?.blocked_until && dayjs(customer.blocked_until).isAfter(dayjs())) {
      return <span className="text-yellow-800 bg-yellow-100 px-2 py-1 rounded-full text-xs">
        Blocked ({getRemainingBlockTime()})
      </span>;
    }
    return <span className="text-green-700 bg-green-100 px-2 py-1 rounded-full text-xs">Active</span>;
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <motion.div
          className="relative bg-white rounded-xl shadow-2xl p-6 sm:p-10 max-w-lg w-full mx-4 z-10 overflow-y-auto max-h-[90vh]"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-700 hover:text-gray-900 text-2xl font-bold"
          >
            &times;
          </button>

          {loading ? (
            <p className="text-center text-gray-500">Loading customer details...</p>
          ) : customer ? (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center gap-4">
                <img
                  src={customer.profile_picture_url || '/default-avatar.png'}
                  alt="avatar"
                  className="w-20 h-20 rounded-full object-cover border"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold">{customer.full_name}</h2>
                  <p className="text-sm text-gray-500">{customer.email}</p>
                  <p className="text-sm text-gray-500">{customer.phone_number || '-'}</p>
                  <p className="text-sm text-gray-500 capitalize">{customer.role}</p>
                  <p className="text-sm text-gray-500">{customer.auth_provider_display}</p>
                  <p className="text-sm text-gray-500">
                    Status: {renderStatusBadge()}
                  </p>
                  <p className="text-xs text-gray-400">Verified: {customer.is_verified ? 'Yes' : 'No'}</p>
                  <p className="text-xs text-gray-400">Last Updated: {dayjs(customer.updated_at).format('DD MMM YYYY, hh:mm A')}</p>
                </div>
              </div>

              {/* Activity & Orders */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-gray-500 text-xs">Joined</p>
                  <p>{dayjs(customer.created_at).format('DD MMM YYYY, hh:mm A')}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Last Login IP</p>
                  <p>{customer.last_login_ip || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Last Order</p>
                  <p>{customer.last_order_date ? dayjs(customer.last_order_date).format('DD MMM YYYY, hh:mm A') : '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Total Orders</p>
                  <p>{customer.total_orders || 0}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Total Spent</p>
                  <p>₹{customer.total_spent || 0}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Block Count</p>
                  <p>{customer.block_count || 0}</p>
                </div>
              </div>

              {/* Address */}
              {(customer.address || customer.city || customer.state || customer.pincode) && (
                <div className="mt-4">
                  <h3 className="font-semibold">Address</h3>
                  <p>{customer.address || ''}</p>
                  <p>{customer.city || ''}, {customer.district || ''}</p>
                  <p>{customer.state || ''} - {customer.pincode || ''}</p>
                </div>
              )}

              {/* Ban / Block Actions */}
              <div className="mt-6 flex flex-col gap-2">
                {customer.is_permanently_banned || (customer.blocked_until && dayjs(customer.blocked_until).isAfter(dayjs())) ? (
                  <button
                    disabled={updatingStatus}
                    onClick={() => updateStatus('unblock')}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                  >
                    Unblock
                  </button>
                ) : (
                  <>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        placeholder="Minutes"
                        value={tempBlockMinutes}
                        onChange={(e) => setTempBlockMinutes(e.target.value)}
                        className="border rounded-lg px-2 py-1 w-24"
                      />
                      <button
                        disabled={updatingStatus}
                        onClick={() => updateStatus('tempBlock')}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg"
                      >
                        Temp Block
                      </button>
                    </div>
                    <button
                      disabled={updatingStatus}
                      onClick={() => updateStatus('permanent')}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                    >
                      Permanent Ban
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500">Customer not found.</p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CustomerDrawer;
