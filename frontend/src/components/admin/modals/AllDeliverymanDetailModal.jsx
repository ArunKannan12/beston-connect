import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import axiosInstance from '../../../api/axiosinstance'
import { motion, AnimatePresence } from 'framer-motion'

const AllDeliverymanDetailModal = ({ deliverymanID, onClose }) => {
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(false)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    if (!deliverymanID) return

    const fetchDetails = async () => {
      setLoading(true)
      try {
        const res = await axiosInstance.get(`admin/deliverymen/${deliverymanID}`)
        setDetails(res.data)
      } catch (err) {
        toast.error(err.response?.data?.detail || 'Failed to fetch details')
        onClose()
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
  }, [deliverymanID, onClose])

  const toggleActive = async () => {
    if (!details) return
    setToggling(true)
    try {
      await axiosInstance.post(`admin/deliverymen/${deliverymanID}/toggle-active/`)
      setDetails(prev => ({ ...prev, is_active: !prev.is_active }))
      toast.success('Status updated')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update status')
    } finally {
      setToggling(false)
    }
  }

  return (
    <AnimatePresence>
      {deliverymanID && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative overflow-y-auto max-h-[90vh]"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 font-bold text-lg"
            >
              ✕
            </button>

            {loading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-6 bg-gray-300 rounded w-32" />
                <div className="h-4 bg-gray-300 rounded w-48" />
                <div className="h-4 bg-gray-300 rounded w-24" />
              </div>
            ) : details ? (
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold">{details.full_name}</h2>

                <p><strong>Email:</strong> {details.email}</p>
                <p><strong>Phone:</strong> {details.phone}</p>
                <p><strong>Address:</strong> {details.address || 'N/A'}</p>
                <p><strong>Vehicle Number:</strong> {details.vehicle_number || 'N/A'}</p>
                <p><strong>Joined At:</strong> {new Date(details.joined_at).toLocaleString()}</p>
                <p><strong>Last Active:</strong> {details.last_active ? new Date(details.last_active).toLocaleString() : 'N/A'}</p>
                <p><strong>Total Deliveries:</strong> {details.total_deliveries}</p>
                <p><strong>Earnings:</strong> ₹{details.earnings}</p>
                <p><strong>Pending Orders:</strong> {details.total_orders_pending}</p>
                <p><strong>Pending Earnings:</strong> ₹{details.earnings_pending}</p>
                <p><strong>Current Status:</strong> {details.current_status}</p>

                <p>
                  <strong>Status:</strong>{' '}
                  <span
                    className={`px-2 py-1 rounded-full text-sm ${
                      details.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {details.is_active ? 'Active' : 'Inactive'}
                  </span>
                </p>

                <button
                  onClick={toggleActive}
                  disabled={toggling}
                  className="mt-3 w-full bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-600 disabled:opacity-50 transition"
                >
                  {toggling ? 'Updating...' : details.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            ) : (
              <p>No details found</p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default AllDeliverymanDetailModal
