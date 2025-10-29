import React, { useEffect, useState } from "react"
import axiosInstance from "../../../api/axiosinstance"
import { toast } from "react-toastify"
import { motion, AnimatePresence } from "framer-motion"
import moment from "moment"

const statusColors = {
  pending: "bg-gray-100 text-gray-700",
  picked: "bg-blue-100 text-blue-700",
  packed: "bg-purple-100 text-purple-700",
  shipped: "bg-yellow-100 text-yellow-700",
  out_for_delivery: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
}

const steps = [
  { key: "packed_at", label: "Packed" },
  { key: "shipped_at", label: "Shipped" },
  { key: "out_for_delivery_at", label: "Out for Delivery" },
  { key: "delivered_at", label: "Delivered" },
]

const TrackingModal = ({ trackingID, onClose }) => {
  const [trackingDetail, setTrackingDetail] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchTrackingDetail = async () => {
    if (!trackingID) return
    setLoading(true)
    try {
      const res = await axiosInstance.get(`admin/delivery-tracking/${trackingID}/`)
      setTrackingDetail(res.data)
    } catch (error) {
      const errMsg =
        error.response?.data?.detail || "Failed to load delivery tracking"
      toast.error(errMsg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrackingDetail()
  }, [trackingID])

  if (!trackingID) return null

  return (
    <AnimatePresence>
        <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
            className="bg-white rounded-lg shadow-lg w-full max-w-lg mx-3 md:mx-0 relative
                        max-h-[90vh] overflow-y-auto p-4 md:p-6"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            >
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
                ✕
            </button>

            {loading ? (
                <p className="text-center text-gray-600">Loading...</p>
            ) : trackingDetail ? (
                <div className="space-y-4">
                {/* Title + Status */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <h2 className="text-lg md:text-xl font-semibold text-gray-800">
                    Order #{trackingDetail.order_number}
                    </h2>
                    <span
                    className={`px-3 py-1 rounded-full text-sm font-medium self-start md:self-center
                        ${statusColors[trackingDetail.status] || "bg-gray-100 text-gray-700"}`}
                    >
                    {trackingDetail.status.replace(/_/g, " ")}
                    </span>
                </div>

                {/* Customer & Deliveryman */}
                <div className="bg-gray-50 rounded-md p-3 space-y-2 text-sm md:text-base">
                    <p>
                    <strong>Customer:</strong> {trackingDetail.customer_name}
                    </p>
                    <p>
                    <strong>Deliveryman:</strong>{" "}
                    {trackingDetail.deliveryman_name || "-"}{" "}
                    {trackingDetail.deliveryman_phone
                        ? `(${trackingDetail.deliveryman_phone})`
                        : ""}
                    </p>
                </div>

                {/* Product Info */}
                <div className="bg-gray-50 rounded-md p-3 text-sm md:text-base">
                    <p>
                    <strong>Product:</strong> {trackingDetail.product_name}
                    </p>
                    <p>
                    <strong>Quantity:</strong> {trackingDetail.quantity}
                    </p>
                </div>

                {/* Timeline */}
                <div className="mt-6">
                    <h3 className="text-base md:text-lg font-medium text-gray-700 mb-3">
                    Delivery Timeline
                    </h3>
                    <div className="relative border-l-2 border-gray-200 pl-4 space-y-4">
                    {steps.map((step) => {
                        const time = trackingDetail[step.key]
                        const isDone = Boolean(time)
                        return (
                        <div key={step.key} className="relative">
                            {/* Dot */}
                            <span
                            className={`absolute -left-[9px] top-1 w-3 h-3 md:w-4 md:h-4 rounded-full ${
                                isDone ? "bg-green-500" : "bg-gray-300"
                            }`}
                            />
                            {/* Label + Time */}
                            <div>
                            <p
                                className={`font-medium text-sm md:text-base ${
                                isDone ? "text-green-700" : "text-gray-500"
                                }`}
                            >
                                {step.label}
                            </p>
                            {time && (
                                <p className="text-xs md:text-sm text-gray-500">
                                {moment(time).format("MMM DD, YYYY • hh:mm A")}
                                </p>
                            )}
                            </div>
                        </div>
                        )
                    })}
                    </div>
                </div>
                </div>
            ) : (
                <p className="text-center text-red-500">No details found</p>
            )}
            </motion.div>
        </motion.div>
    </AnimatePresence>

  )
}

export default TrackingModal
