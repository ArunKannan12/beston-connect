import React, { useEffect, useState } from "react";
import axiosInstance from "../../../api/axiosinstance";

const PAGE_SIZE = 8;

const AdminOrdersToPack = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchOrders(1);
  }, []);

  const fetchOrders = async (pageNo) => {
    try {
      const { data } = await axiosInstance.get(
        `admin/packing-list/`
      );
      setOrders(data.pending_orders || []);
      console.log(data);
      
      setCount(data.pending_count || 0);
      setPage(pageNo);
      setSelectedOrders([]);
    } catch {
      setErrorMessage("Failed to fetch orders.");
    }
  };

  const toggleOrderSelect = (orderNumber) => {
    setSelectedOrders((prev) =>
      prev.includes(orderNumber)
        ? prev.filter((o) => o !== orderNumber)
        : [...prev, orderNumber]
    );
  };

  const handleMarkPacked = async () => {
    if (!selectedOrders.length) return;

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { data } = await axiosInstance.post(
        "admin/mark-packed-bulk/",
        { order_numbers: selectedOrders }
      );

      if (data.success) {
        setSuccessMessage("Orders marked as packed successfully.");
        fetchOrders(page);
      }
    } catch {
      setErrorMessage("Failed to mark orders as packed.");
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(count / PAGE_SIZE);

  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 pt-8 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">
          Orders to Pack
        </h1>
        <p className="text-gray-600 mt-1">
          Select orders and mark all items as packed
        </p>
      </div>

      {/* Messages */}
      <div className="max-w-7xl mx-auto px-4">
        {errorMessage && (
          <div className="bg-red-100 text-red-700 px-4 py-3 rounded mb-4">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="bg-green-100 text-green-700 px-4 py-3 rounded mb-4">
            {successMessage}
          </div>
        )}
      </div>

      {/* Orders */}
      <div className="max-w-7xl mx-auto px-4 pb-40 space-y-6">
        {orders.length === 0 ? (
          <p className="text-gray-500">No pending orders.</p>
        ) : (
          orders.map((order) => {
            const allPacked = order.products.every(p => p.is_packed);

            return (
              <div
                key={order.order_number}
                className="bg-white rounded-xl shadow-sm border p-5"
              >
                {/* Order Header */}
                <div className="flex justify-between items-center mb-4">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      disabled={allPacked}
                      checked={selectedOrders.includes(order.order_number)}
                      onChange={() =>
                        toggleOrderSelect(order.order_number)
                      }
                      className="w-5 h-5 accent-blue-600"
                    />
                    <span className="font-semibold text-gray-800">
                      {order.order_number}
                    </span>
                  </label>

                  <span className="text-sm text-gray-600">
                    Total: ₹{order.total}
                  </span>
                </div>

                {/* Products */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {order.products.map((item) => (
                    <div
                      key={item.item_id}
                      className="bg-gray-50 rounded-lg p-4 text-center"
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.variant}
                          className="w-20 h-20 mx-auto rounded object-cover mb-2"
                        />
                      ) : (
                        <div className="w-20 h-20 mx-auto bg-gray-200 rounded mb-2" />
                      )}

                      <p className="font-medium text-gray-800">
                        {item.product_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {item.variant}
                      </p>
                      <p className="text-sm text-gray-600">
                        Qty: {item.quantity}
                      </p>

                      {item.is_packed && (
                        <span className="inline-block mt-1 text-xs font-semibold text-green-600">
                          Packed
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <span className="text-sm text-gray-600">
            Selected Orders: {selectedOrders.length}
          </span>

          <button
            onClick={handleMarkPacked}
            disabled={loading || !selectedOrders.length}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Processing..." : "Mark Selected as Packed"}
          </button>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="max-w-7xl mx-auto px-4 pb-28 flex justify-center gap-4">
          <button
            disabled={page === 1}
            onClick={() => fetchOrders(page - 1)}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Previous
          </button>

          <span className="text-sm text-gray-600 self-center">
            Page {page} of {totalPages}
          </span>

          <button
            disabled={page >= totalPages}
            onClick={() => fetchOrders(page + 1)}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersToPack;
