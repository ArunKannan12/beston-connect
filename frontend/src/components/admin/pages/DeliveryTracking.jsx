import React, { useEffect, useState } from 'react'
import axiosInstance from '../../../api/axiosinstance'
import { toast } from 'react-toastify'
import { motion, AnimatePresence } from 'framer-motion'
import TrackingModal from '../modals/TrackingModal'

const statusColors = {
  pending: 'bg-gray-100 text-gray-700',
  picked: 'bg-blue-100 text-blue-700',
  packed: 'bg-purple-100 text-purple-700',
  shipped: 'bg-yellow-100 text-yellow-700',
  out_for_delivery: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700'
}

const DeliveryTracking = () => {
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [nextPage, setNextPage] = useState(null)
  const [previousPage, setPreviousPage] = useState(null)
  const [selectedTracking,setSelectedTracking] = useState(null)
  

  useEffect(() => {
    const timer = setTimeout(fetchDeliveries, 500)
    return () => clearTimeout(timer)
  }, [search, page, statusFilter])

  const fetchDeliveries = async () => {
    setLoading(true)
    try {
      const params = { page }
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter

      const res = await axiosInstance.get('admin/delivery-tracking/', { params })
      setDeliveries(res.data.results)
      setNextPage(res.data.next)
      setPreviousPage(res.data.previous)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load deliveries')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-10 md:p-6 space-y-6">
      <h2 className="text-3xl font-semibold text-gray-800">Delivery Tracking</h2>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="Search order / customer / deliveryman..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 border rounded-md px-3 py-2 focus:ring-indigo-400 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="w-40 border rounded-md px-3 py-2 focus:ring-indigo-400 focus:outline-none"
        >
          <option value="">All Status</option>
          <option value="picked">Picked</option>
          <option value="packed">Packed</option>
          <option value="shipped">Shipped</option>
          <option value="out_for_delivery">Out for Delivery</option>
          <option value="delivered">Delivered</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <motion.div className="overflow-auto border rounded-lg shadow-lg" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <table className="w-full text-left">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="px-4 py-2">Order</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Deliveryman</th>
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2">Quantity</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array(6).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array(6).fill(0).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-300 rounded w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                : deliveries.map(delivery => (
                    <motion.tr
                      key={delivery.id}
                      onClick={(e)=>setSelectedTracking(delivery.id)}
                      className="border-t hover:bg-gray-50 cursor-pointer transition"
                    >
                      <td className="px-4 py-3">{delivery.order_number}</td>
                      <td className="px-4 py-3">{delivery.customer_name}</td>
                      <td className="px-4 py-3">
                        {delivery.deliveryman_name || '-'} <br />
                        {delivery.deliveryman_phone || ''}
                      </td>
                      <td className="px-4 py-3">{delivery.product_name}</td>
                      <td className="px-4 py-3">{delivery.quantity}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-sm ${statusColors[delivery.status] || 'bg-gray-100 text-gray-700'}`}>
                          {delivery.status.replace(/_/g, ' ')}
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
                <motion.div key={i} className="h-28 rounded-lg bg-gray-200 animate-pulse" />
              ))
            : deliveries.map(delivery => (
                <motion.div
                  key={delivery.id}
                  onClick={()=>setSelectedTracking(delivery.id)}
                  className="backdrop-blur-sm bg-white/60 border border-gray-200 shadow-lg rounded-lg p-4 cursor-pointer hover:shadow-2xl transition"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">{delivery.order_number}</h3>
                    <span className={`px-2 py-1 rounded-full text-sm ${statusColors[delivery.status] || 'bg-gray-100 text-gray-700'}`}>
                      {delivery.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Customer: {delivery.customer_name}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Deliveryman: {delivery.deliveryman_name || '-'} {delivery.deliveryman_phone || ''}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Product: {delivery.product_name} (Qty: {delivery.quantity})
                  </p>
                </motion.div>
              ))
          }
        </AnimatePresence>
      </div>

      {/* Pagination */}
      <div className="flex justify-center gap-6 mt-4">
        <button
          disabled={!previousPage}
          onClick={() => setPage(page - 1)}
          className="px-4 py-2 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 transition"
        >
          ← Prev
        </button>
        <span className="font-medium text-gray-700">Page {page}</span>
        <button
          disabled={!nextPage}
          onClick={() => setPage(page + 1)}
          className="px-4 py-2 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 transition"
        >
          Next →
        </button>
      </div>
      {selectedTracking && (
        <TrackingModal
          trackingID={selectedTracking}
          onClose={() => {
            setSelectedTracking(null)
            fetchDeliveries()
          }}
        />
      )}

    </div>
  )
}

export default DeliveryTracking
