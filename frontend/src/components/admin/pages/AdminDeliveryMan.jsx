import React, { useEffect, useState } from 'react'
import axiosInstance from '../../../api/axiosinstance'
import { toast } from 'react-toastify'
import { motion, AnimatePresence } from 'framer-motion'
import DeliverymanModal from '../modals/DeliverymanModal'

const AdminDeliveryMan = () => {
  const [deliveryman, setDeliveryman] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [nextPage, setNextPage] = useState(null)
  const [previousPage, setPreviousPage] = useState(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [deliverymanDetail, setDeliverymanDetail] = useState(null)

  const fetchDeliveryman = async () => {
    setLoading(true)
    try {
      const params = { page }
      if (search) params.search = search
      if (status) params.status = status

      const res = await axiosInstance.get('admin/deliveryman-requests/', { params })
      setDeliveryman(res.data.results)
      setNextPage(res.data.next)
      setPreviousPage(res.data.previous)
    } catch (error) {
      const errMsg = error.response?.data?.detail || 'Failed to load deliveryman requests'
      toast.error(errMsg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDeliveryman()
  }, [page, search, status])

  

  const statusColor = (s) => {
    switch (s) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-9 max-w-full">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Deliveryman Requests</h2>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
        <input
          type="text"
          placeholder="Search by user..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto shadow-md rounded-lg">
        <table className="min-w-full bg-white divide-y divide-gray-200">
          <thead className="bg-indigo-600 text-white hidden sm:table-header-group">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium">User</th>
              <th className="px-4 py-2 text-left text-sm font-medium">Status</th>
              <th className="px-4 py-2 text-left text-sm font-medium">Applied At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <AnimatePresence>
              {loading ? (
                <motion.tr key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <td colSpan={3} className="text-center py-4 text-gray-500">Loading...</td>
                </motion.tr>
              ) : deliveryman.length === 0 ? (
                <motion.tr key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <td colSpan={3} className="text-center py-4 text-gray-500">No requests found.</td>
                </motion.tr>
              ) : (
                deliveryman.map((dm) => (
                  <motion.tr
                    key={dm.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    whileHover={{ scale: 1.02, backgroundColor: '#f9fafb' }}
                    className="transition cursor-pointer flex flex-col sm:table-row mb-2 sm:mb-0 p-2 sm:p-0"
                    onClick={() => setDeliverymanDetail(dm.id)}
                  >
                    <td className="px-4 py-2 flex justify-between sm:table-cell">
                      <span className="font-semibold sm:hidden">User: </span>{dm.user}
                    </td>
                    <td className="px-4 py-2 flex justify-between sm:table-cell">
                      <span className="font-semibold sm:hidden">Status: </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColor(dm.status)}`}>
                        {dm.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 flex justify-between sm:table-cell">
                      <span className="font-semibold sm:hidden">Applied At: </span>
                      {new Date(dm.applied_at).toLocaleString()}
                    </td>
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-2">
        <button
          onClick={() => previousPage && setPage(page - 1)}
          disabled={!previousPage}
          className="px-4 py-2 bg-gray-200 rounded-md disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-gray-700 font-medium">Page {page}</span>
        <button
          onClick={() => nextPage && setPage(page + 1)}
          disabled={!nextPage}
          className="px-4 py-2 bg-gray-200 rounded-md disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {/* Modal for details */}
      {deliverymanDetail && (
        <DeliverymanModal
          deliverymanID={deliverymanDetail}
          onClose={() => setDeliverymanDetail(null)}
        />
      )}
    </div>
  )
}

export default AdminDeliveryMan
