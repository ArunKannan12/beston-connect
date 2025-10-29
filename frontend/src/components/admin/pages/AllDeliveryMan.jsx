import React, { useEffect, useState, useCallback } from 'react'
import axiosInstance from '../../../api/axiosinstance'
import { toast } from 'react-toastify'
import { motion, AnimatePresence } from 'framer-motion'
import AllDeliverymanDetailModal from '../modals/AllDeliverymanDetailModal'

// Entry animation variants
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
}

const AllDeliveryMan = () => {
  const [deliverymen, setDeliverymen] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [ordering, setOrdering] = useState('')
  const [nextPage, setNextPage] = useState(null)
  const [previousPage, setPreviousPage] = useState(null)
  const [deliverymanDetail, setDeliverymanDetail] = useState(null)

  // Fetch deliverymen
  const fetchDeliverymen = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page }
      if (search) params.search = search
      if (status) params.status = status
      if (ordering) params.ordering = ordering
      const res = await axiosInstance.get('admin/deliverymen', { params })
      setDeliverymen(res.data.results)
      setNextPage(res.data.next)
      setPreviousPage(res.data.previous)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load deliverymen')
    } finally {
      setLoading(false)
    }
  }, [page, search, status, ordering])

  // Debounced search and fetch
  useEffect(() => {
    const timer = setTimeout(() => fetchDeliverymen(), 500)
    return () => clearTimeout(timer)
  }, [fetchDeliverymen])

  return (
    <div className="p-10 md:p-6 space-y-6">

      {/* Page Title */}
      <motion.h2
        className="text-3xl font-semibold text-gray-800"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.5 } }}
      >
        All DeliveryMen
      </motion.h2>

      {/* Filter Bar */}
      <motion.div
        className="sticky top-4 z-20 backdrop-blur-md bg-white/70 border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row gap-4 shadow-sm"
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <input
          type="text"
          placeholder="Search name, email, phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 border rounded-md px-3 py-2 focus:ring-indigo-400 focus:outline-none"
        />
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="w-40 border rounded-md px-3 py-2 focus:ring-indigo-400 focus:outline-none"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={ordering}
          onChange={e => setOrdering(e.target.value)}
          className="w-52 border rounded-md px-3 py-2 focus:ring-indigo-400 focus:outline-none"
        >
          <option value="">Sort: Newest</option>
          <option value="joined_at">Joined ↑</option>
          <option value="-joined_at">Joined ↓</option>
          <option value="total_deliveries">Deliveries ↑</option>
          <option value="-total_deliveries">Deliveries ↓</option>
        </select>
      </motion.div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <motion.div
          className="backdrop-blur-sm bg-white/60 border border-gray-200 rounded-lg shadow-lg overflow-auto"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-white/80 backdrop-blur-md">
              <tr>
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Deliveries</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array(6).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-3"><div className="h-4 bg-gray-300 rounded w-12" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-gray-300 rounded w-32" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-gray-300 rounded w-8" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-gray-300 rounded w-16" /></td>
                    </tr>
                  ))
                : deliverymen.map((dm) => (
                    <motion.tr
                      key={dm.id}
                      variants={itemVariants}
                      className="border-t hover:bg-white/80 cursor-pointer transition"
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setDeliverymanDetail(dm.id)}
                    >
                      <td className="px-4 py-3">{dm.id}</td>
                      <td className="px-4 py-3 font-medium">{dm.full_name}</td>
                      <td className="px-4 py-3">{dm.total_deliveries}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-sm ${
                            dm.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {dm.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </motion.tr>
                  ))
              }
            </tbody>
          </table>
        </motion.div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        <AnimatePresence>
          {loading
            ? Array(4).fill(0).map((_, i) => (
                <motion.div key={i} className="h-24 rounded-lg bg-gray-200 animate-pulse" />
              ))
            : deliverymen.map((dm) => (
                <motion.div
                  key={dm.id}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="backdrop-blur-sm bg-white/60 border border-gray-200 shadow-lg rounded-lg p-4 cursor-pointer hover:shadow-2xl transition"
                  onClick={() => setDeliverymanDetail(dm.id)}
                >
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">{dm.full_name}</h3>
                    <span
                      className={`px-2 py-1 rounded-full text-sm ${
                        dm.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {dm.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">Deliveries: {dm.total_deliveries}</p>
                </motion.div>
              ))
          }
        </AnimatePresence>
      </div>

      {/* Pagination */}
      <div className="flex justify-center gap-6 mt-4">
        <motion.button
          disabled={!previousPage}
          onClick={() => setPage(page - 1)}
          whileTap={{ scale: 0.9 }}
          className="px-4 py-2 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 transition"
        >
          ← Prev
        </motion.button>
        <motion.span className="font-medium text-gray-700" animate={{ scale: [1, 1.15, 1] }}>
          Page {page}
        </motion.span>
        <motion.button
          disabled={!nextPage}
          onClick={() => setPage(page + 1)}
          whileTap={{ scale: 0.9 }}
          className="px-4 py-2 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 transition"
        >
          Next →
        </motion.button>
      </div>

      {/* Modal */}
      {deliverymanDetail && (
        <AllDeliverymanDetailModal
          deliverymanID={deliverymanDetail}
          onClose={() => {
            setDeliverymanDetail(null)
            fetchDeliverymen()
          }}
        />
      )}
    </div>
  )
}

export default AllDeliveryMan
