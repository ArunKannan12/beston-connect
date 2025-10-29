import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";
import axiosInstance from "../../../api/axiosinstance";
import { toast } from "react-toastify";
import moment from "moment";

const WarehouseLogModal = ({ warehouseLogID, onClose }) => {
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!warehouseLogID) return;

    const fetchLog = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get(
          `admin/warehouse-logs/${warehouseLogID}/`
        );
        setLog(res.data);
      } catch (error) {
        const errMsg =
          error.response?.data?.detail || "Failed to fetch log details";
        toast.error(errMsg);
      } finally {
        setLoading(false);
      }
    };
    fetchLog();
  }, [warehouseLogID]);
  console.log(log,'log');
  

  return (
    <AnimatePresence>
  {warehouseLogID && (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Modal content */}
      <motion.div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl relative overflow-hidden"
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 120 }}
      >
        {/* Close Button */}
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
          onClick={onClose}
        >
          <FaTimes size={20} />
        </button>

        {/* Header */}
        <div className="px-8 py-6 border-b">
          <h3 className="text-2xl font-bold text-gray-800">
            Warehouse Log Details
          </h3>
          <p className="text-gray-500 text-sm mt-1">
            Detailed information of this log entry
          </p>
        </div>

        {/* Body */}
        <div className="px-8 py-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-700 text-sm">
          {/* Left column: Product */}
          <div className="space-y-3 flex flex-col items-center md:items-start">
            <img
              src={log?.order_item?.product_image || "/placeholder.png"}
              alt={log?.order_item?.product}
              className="w-40 h-40 rounded-lg object-cover border shadow-sm"
            />
            <p>
              <strong>Product:</strong> {log?.order_item?.product}
            </p>
            <p>
              <strong>Variant:</strong> {log?.order_item?.variant}
            </p>
            <p>
              <strong>Quantity:</strong> {log?.order_item?.quantity}
            </p>
            <p>
              <strong>Status:</strong> {log?.order_item?.status}
            </p>
          </div>

          {/* Right column: Order & action */}
          <div className="space-y-3">
            <p>
              <strong>Order Number:</strong> {log?.order?.order_number}
            </p>
            <p>
              <strong>Order Status:</strong> {log?.order?.status}
            </p>
            <p>
              <strong>Order Total:</strong> ₹{log?.order?.total}
            </p>
            <p>
              <strong>Action:</strong> {log?.action_display}
            </p>
            <p>
              <strong>Updated By:</strong> {log?.updated_by?.name} (
              {log?.updated_by?.email})
            </p>
            <p>
              <strong>Timestamp:</strong>{" "}
              {moment(log?.timestamp).format("DD MMM YYYY, hh:mm A")}
            </p>
            {log?.comment && (
              <p>
                <strong>Comment:</strong> {log.comment}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition font-medium"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>

  );
};

export default WarehouseLogModal;
