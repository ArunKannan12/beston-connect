import React, { useEffect, useState } from "react";
import axiosInstance from "../../../api/axiosinstance";
import { toast } from "react-toastify";
import OrderDrawer from "../modals/OrderDrawer";
import { AnimatePresence } from "framer-motion";

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [nextPage, setNextPage] = useState(null);
  const [prevPage, setPrevPage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [sortField, setSortField] = useState("created_at"); // which field to sort
  const [sortOrder, setSortOrder] = useState("desc"); // asc or desc

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = { page };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (sortField) params.ordering = sortOrder === "asc" ? sortField : `-${sortField}`;

      const res = await axiosInstance.get("/admin/orders/", { params });

      setOrders(res.data.results);
     
      setNextPage(res.data.next);
      setPrevPage(res.data.previous);
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to load orders");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [page, search, statusFilter, sortField, sortOrder]);

  const handleNextPage = () => {
    if (nextPage) setPage(page + 1);
  };

  const handlePrevPage = () => {
    if (prevPage && page > 1) setPage(page - 1);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      // toggle order if same field clicked
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const renderSortArrow = (field) => {
    if (sortField !== field) return "⇅";
    return sortOrder === "asc" ? "↑" : "↓";
  };

  return (
    <div className="p-6 sm:p-10 bg-gradient-to-br from-white to-gray-50 min-h-screen">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6 tracking-tight">
        Admin Orders
      </h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8 bg-white/60 backdrop-blur-md p-4 rounded-xl shadow-md">
        {/* Search */}
        <input
          type="text"
          placeholder="Search by name, email, or tracking number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 p-3 rounded-lg flex-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 p-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {/* Sort Dropdown */}
        <select
          value={`${sortField}:${sortOrder}`}
          onChange={(e) => {
            const [field, order] = e.target.value.split(":");
            setSortField(field);
            setSortOrder(order);
          }}
          className="border border-gray-300 p-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="created_at:desc">Newest First</option>
          <option value="created_at:asc">Oldest First</option>
          <option value="id:asc">Order ID (Asc)</option>
          <option value="id:desc">Order ID (Desc)</option>
          <option value="total:asc">Total (Low → High)</option>
          <option value="total:desc">Total (High → Low)</option>
          <option value="status:asc">Status (A → Z)</option>
          <option value="status:desc">Status (Z → A)</option>
        </select>

      </div>

      {/* Desktop Table */}
      {!loading && orders.length > 0 && (
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full border-collapse text-sm rounded-xl overflow-hidden shadow-md">
            <thead>
              <tr className="bg-gray-100 text-left text-gray-700">
                <th className="p-4">Order ID</th>
                <th className="p-4">User</th>
                <th className="p-4">Total</th>
                <th className="p-4">Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-gray-50 transition-all duration-200"
                >
                  <td className="p-4 font-medium text-gray-800">{order.order_number}</td>
                  <td className="p-4 text-gray-700">{order.user}</td>
                  <td className="p-4 text-gray-700">₹{order.total}</td>
                  <td className="p-4 capitalize text-gray-700">{order.status}</td>
                  <td className="p-4">
                    <button
                      onClick={() => setSelectedOrder(order.order_number)}
                      className="text-blue-600 hover:text-blue-800 font-medium transition"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile Card Layout */}
      {!loading && orders.length > 0 && (
        <div className="sm:hidden space-y-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-xl shadow-md p-5 transition hover:shadow-lg"
            >
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-[13px] font-bold text-gray-600">
                  Order #{order.order_number}
                </h2>
                <span className="text-xs text-gray-500">
                  {new Date(order.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-gray-700">
                <strong>User:</strong> {order.user}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Total:</strong> ₹{order.total}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Status:</strong> {order.status}
              </p>
              <button
                onClick={() => setSelectedOrder(order.order_number)}
                className="mt-3 text-blue-600 text-sm font-medium hover:underline"
              >
                View Details
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Loading & Empty States */}
      {loading && (
        <p className="text-center text-gray-500 text-sm mt-6">Loading...</p>
      )}
      {!loading && orders.length === 0 && (
        <p className="text-center text-gray-500 text-sm mt-6">No orders found.</p>
      )}

      {/* Pagination */}
      <div className="flex justify-center gap-4 mt-10">
        <button
          onClick={handlePrevPage}
          disabled={!prevPage || page === 1}
          className="px-5 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={handleNextPage}
          disabled={!nextPage}
          className="px-5 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <OrderDrawer
            orderNumber={selectedOrder}
            onClose={() => setSelectedOrder(null)}
          />
        )}
      </AnimatePresence>
    </div>

  );
};

export default AdminOrders;
