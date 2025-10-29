import React, { useEffect, useState } from "react";
import axiosInstance from "../../../api/axiosinstance";
import { toast } from "react-toastify";
import moment from "moment";
import { AnimatePresence, motion } from "framer-motion";
import { FaUser, FaClock } from "react-icons/fa";
import WarehouseLogModal from "../modals/WarehouseLogModal";
import TimelineCard from "../modals/TimelineCard";

const STATUS_COLORS = {
  shipped: "bg-blue-100 text-blue-700",
  packed: "bg-yellow-100 text-yellow-700",
  out_for_delivery: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  failed: "bg-gray-100 text-gray-700",
  picked: "bg-purple-100 text-purple-700",
  pending: "bg-gray-50 text-gray-500",
};

const ACTION_ICONS = {
  shipped: "🚚",
  packed: "📦",
  out_for_delivery: "🛵",
  delivered: "✅",
  cancelled: "❌",
  failed: "⚠️",
  picked: "📥",
  pending: "⏳",
};

const AdminWarehouseLogs = () => {
  const [activeTab,setActiveTab] = useState('logs')
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [nextPage, setNextPage] = useState(null);
  const [prevPage, setPrevPage] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [ordering, setOrdering] = useState("-timestamp");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);
  
  const [warehouseLogs, setWarehouseLogs] = useState([]);
  const [timelineData,setTimelineData] = useState([])
  const [debouncedSearch,setDebouncedSearch] = useState(search)
  
  useEffect(()=>{
    const timer = setTimeout(()=>setDebouncedSearch(search),300);
    return ()=> clearTimeout(timer)
  },[search])

    useEffect(()=>{
      setPage(1)
    },[status,ordering,activeTab,startDate,endDate])

    useEffect(() => {
      if (activeTab === 'logs') {
        fetchWarehouseLogs(debouncedSearch)
      }else{
        fetchTimelineData(debouncedSearch);
      }
    }, [status, debouncedSearch, ordering, page,activeTab,startDate,endDate]);

  const fetchWarehouseLogs = async (searchTerm) => {
    setLoading(true);
    try {
      let params = { page };
      if (searchTerm) params.search = searchTerm;
      if (status) params.action = status;
      if (ordering) params.ordering = ordering;

      const res = await axiosInstance.get("admin/warehouse-logs/", { params });
      setWarehouseLogs(res.data.results || []);
      setNextPage(res.data.next);
      setPrevPage(res.data.previous);
      
      
    } catch (error) {
      console.log(error);
      
      toast.error(error.response?.data?.detail || "Failed to load warehouse logs");
    } finally {
      setLoading(false);
    }
  };



  const handleNextPage = () => {
    if (nextPage) setPage((prev) => prev + 1);
  };

  const handlePrevPage = () => {
    if (prevPage && page > 1) setPage((prev) => prev - 1);
  };

  const fetchTimelineData = async (searchTerm)=>{
    setLoading(true);
    try {
      const params = {page}
      if (searchTerm) params.order_number = searchTerm;
      if(status) params.status = status;
      if(ordering) params.ordering = ordering;
      if (startDate && endDate){
        params.start_date = startDate;
        params.end_date = endDate;
      }
      const res = await axiosInstance.get('admin/warehouse-timeline/',{params});
      setTimelineData(res.data.results || []);
      console.log(res.data.results,'timeln');
      
      setNextPage(res.data.next);
      setPrevPage(res.data.previous);
    } catch (error) {
      const errMsg = error?.response?.data?.detail || 'Failed to load timeline data.';
      toast.error(errMsg)
    }finally{
      setLoading(false)
    }
  }

  
  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">📦 Warehouse Dashboard</h2>

      {/* Tab Buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-5 py-2 rounded-lg font-semibold border transition-all duration-200 cursor-pointer
            ${activeTab === "logs"
              ? "bg-indigo-500 text-white border-indigo-600 shadow-md transform scale-105"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100 hover:shadow-sm"
            }`}
        >
          📦 Logs
        </button>

        <button
          onClick={() => setActiveTab("timeline")}
          className={`px-5 py-2 rounded-lg font-semibold border transition-all duration-200 cursor-pointer
            ${activeTab === "timeline"
              ? "bg-indigo-500 text-white border-indigo-600 shadow-md transform scale-105"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100 hover:shadow-sm"
            }`}
        >
          📊 Timeline
        </button>
      </div>


     {/* Filters */}
        <div className="flex flex-col gap-4 mb-6 md:flex-row md:flex-wrap md:items-center">
          {/* Search */}
          <div className="w-full md:flex-1">
            <input
              type="text"
              placeholder={
                activeTab === "timeline"
                  ? "Search by order number..."
                  : "Search by product, order, or user..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            />
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-auto">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            >
              <option value="">All Statuses</option>
              {Object.keys(STATUS_COLORS).map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Ordering Filter */}
          <div className="w-full md:w-auto">
            <select
              value={ordering}
              onChange={(e) => setOrdering(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            >
              {activeTab === "logs" ? (
                <>
                  <option value="-timestamp">Latest First</option>
                  <option value="timestamp">Oldest First</option>
                  <option value="order__order_number">Order Number Asc</option>
                  <option value="-order__order_number">Order Number Desc</option>
                </>
              ) : (
                <>
                  <option value="-picked_at">Latest Picked</option>
                  <option value="picked_at">Oldest Picked</option>
                  <option value="-delivered_at">Latest Delivered</option>
                  <option value="delivered_at">Oldest Delivered</option>
                </>
              )}
            </select>
          </div>

          {/* Date Filters (Timeline only) */}
          {activeTab === "timeline" && (
            <div className="w-full flex flex-col gap-2 sm:flex-row md:w-auto">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
              />
            </div>
          )}
        </div>


      {/* Content */}
      {loading ? (
        <p className="text-gray-500 animate-pulse">Loading {activeTab}...</p>
      ) : activeTab === "logs" ? (
        warehouseLogs.length ? (
          <>
            {/* Desktop Table */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              
              className="hidden md:block overflow-x-auto bg-white shadow-lg rounded-lg"
            >
              <table className="w-full text-sm text-left text-gray-700">
                <thead className="bg-gray-100 text-gray-800 uppercase text-xs font-semibold">
                  <tr>
                    <th className="px-4 py-3">Image</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Updated By</th>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {warehouseLogs.map((log, i) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedLog(log.id)}
                    >
                      <td className="px-4 py-3">
                        <img
                          src={log.order_item.product_image || "/placeholder.png"}
                          alt={log.order_item.product}
                          className="w-12 h-12 rounded-lg object-cover border"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium">{log.order_item.product}</td>
                      <td className="px-4 py-3">{log.order.order_number}</td>
                      <td className="px-4 py-3">{log.updated_by.name}</td>
                      <td className="px-4 py-3">{moment(log.timestamp).format("DD MMM YYYY, hh:mm A")}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                            STATUS_COLORS[log.action] || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {ACTION_ICONS[log.action]} {log.action_display}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </motion.div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {warehouseLogs.map((log, i) => (
                <motion.div
                  key={log.id}
                  onClick={() => setSelectedLog(log.id)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, type: "spring", stiffness: 100 }}
                  className="bg-white rounded-lg shadow-md border border-gray-100 p-4 flex flex-col gap-3 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={log.order_item.product_image || "/placeholder.png"}
                      alt={log.order_item.product}
                      className="w-14 h-14 rounded-lg object-cover border"
                    />
                    <div>
                      <p className="font-semibold text-gray-800">{log.order_item.product}</p>
                      <p className="text-sm text-gray-500">{log.order.order_number}</p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <FaUser /> {log.updated_by.name}
                  </p>
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <FaClock /> {moment(log.timestamp).format("DD MMM YYYY, hh:mm A")}
                  </p>

                  <span
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium w-fit ${
                      STATUS_COLORS[log.action] || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {ACTION_ICONS[log.action]} {log.action_display}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center items-center gap-4 mt-6">
              <button
                onClick={handlePrevPage}
                disabled={!prevPage}
                className={`px-4 py-2 rounded-lg border transition ${
                  prevPage ? "bg-indigo-500 text-white hover:bg-indigo-600" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                Prev
              </button>
              <span className="text-gray-700 font-medium">Page {page}</span>
              <button
                onClick={handleNextPage}
                disabled={!nextPage}
                className={`px-4 py-2 rounded-lg border transition ${
                  nextPage ? "bg-indigo-500 text-white hover:bg-indigo-600" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <p className="text-gray-500">No warehouse logs found.</p>
        )
      ) : timelineData.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {timelineData.map((timeline,index) => (
            <TimelineCard key={index} timeline={timeline} />
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No timeline data found.</p>
      )}

      {/* Modal */}
      <AnimatePresence>
        {selectedLog && <WarehouseLogModal warehouseLogID={selectedLog} onClose={() => setSelectedLog(null)} />}
      </AnimatePresence>
    </div>
  );
};

export default AdminWarehouseLogs;
