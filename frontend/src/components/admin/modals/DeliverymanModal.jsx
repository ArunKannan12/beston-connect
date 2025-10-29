import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import axiosInstance from '../../../api/axiosinstance'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

const DeliverymanModal = ({ deliverymanID, onClose, refreshList }) => {
  const [deliverymanDetail, setDeliverymanDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchDeliverymanDetail = async () => {
    setLoading(true)
    try {
      const res = await axiosInstance.get(`admin/deliveryman-requests/${deliverymanID}/`)
      setDeliverymanDetail(res.data)
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to load deliveryman detail')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (deliverymanID) fetchDeliverymanDetail()
  }, [deliverymanID])

  const handleAction = async (type) => {
    setActionLoading(true)
    try {
      const url =
        type === 'approve'
          ? `admin/deliveryman-requests/${deliverymanID}/approve/`
          : `admin/deliveryman-requests/${deliverymanID}/reject/`
      await axiosInstance.post(url)
      toast.success(`Deliveryman ${type}d successfully!`)
      onClose()
      refreshList?.()
    } catch (error) {
        console.log(error);
        
      toast.error(error.response?.data?.detail || `Failed to ${type} deliveryman`)
    } finally {
      setActionLoading(false)
    }
  }

  const statusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <AnimatePresence>
      {deliverymanID && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6"
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="bg-white rounded-xl shadow-xl w-full max-w-lg sm:max-w-xl p-6 relative overflow-y-auto max-h-[90vh]"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition"
            >
              <X size={24} />
            </button>

            {loading ? (
              <p className="text-center text-gray-500 py-12">Loading...</p>
            ) : deliverymanDetail ? (
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-gray-800 text-center sm:text-left">
                  Deliveryman Request Detail
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex justify-between sm:flex-col sm:justify-start">
                    <span className="font-medium text-gray-600">User:</span>
                    <span className="text-gray-800">{deliverymanDetail.user}</span>
                  </div>
                  <div className="flex justify-between sm:flex-col sm:justify-start">
                    <span className="font-medium text-gray-600">Email:</span>
                    <span className="text-gray-800">{deliverymanDetail.email}</span>
                  </div>
                  <div className="flex justify-between sm:flex-col sm:justify-start">
                    <span className="font-medium text-gray-600">Phone:</span>
                    <span className="text-gray-800">{deliverymanDetail.phone || '-'}</span>
                  </div>
                  <div className="flex justify-between sm:flex-col sm:justify-start">
                    <span className="font-medium text-gray-600">Vehicle Number:</span>
                    <span className="text-gray-800">{deliverymanDetail.vehicle_number || '-'}</span>
                  </div>
                  <div className="flex justify-between sm:flex-col sm:justify-start">
                    <span className="font-medium text-gray-600">Address:</span>
                    <span className="text-gray-800">{deliverymanDetail.address || '-'}</span>
                  </div>
                  <div className="flex justify-between sm:flex-col sm:justify-start">
                    <span className="font-medium text-gray-600">Status:</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColor(
                        deliverymanDetail.status
                      )}`}
                    >
                      {deliverymanDetail.status}
                    </span>
                  </div>
                  <div className="flex justify-between sm:flex-col sm:justify-start">
                    <span className="font-medium text-gray-600">Applied At:</span>
                    <span className="text-gray-800">
                      {new Date(deliverymanDetail.applied_at).toLocaleString()}
                    </span>
                  </div>
                  {deliverymanDetail.reviewed_at && (
                    <div className="flex justify-between sm:flex-col sm:justify-start">
                      <span className="font-medium text-gray-600">Reviewed At:</span>
                      <span className="text-gray-800">
                        {new Date(deliverymanDetail.reviewed_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {deliverymanDetail.notes && (
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-600">Notes:</span>
                      <span className="text-gray-800">{deliverymanDetail.notes}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
              
                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                    {deliverymanDetail.status === 'pending' && (
                        <>
                        <button
                            onClick={() => handleAction('approve')}
                            disabled={actionLoading}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition disabled:opacity-50"
                        >
                            Approve
                        </button>
                        <button
                            onClick={() => handleAction('reject')}
                            disabled={actionLoading}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition disabled:opacity-50"
                        >
                            Reject
                        </button>
                        </>
                    )}

                    {deliverymanDetail.status === 'approved' && (
                        <button
                        onClick={() => handleAction('reject')}
                        disabled={actionLoading}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition disabled:opacity-50"
                        >
                        Reject
                        </button>
                    )}

                    {deliverymanDetail.status === 'rejected' && (
                        <button
                        onClick={() => handleAction('approve')}
                        disabled={actionLoading}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition disabled:opacity-50"
                        >
                        Approve
                        </button>
                    )}
                </div>

              </div>
            ) : (
              <p className="text-center text-gray-500 py-12">No data available</p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default DeliverymanModal
