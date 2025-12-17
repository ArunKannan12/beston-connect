import React, { useState, useEffect } from "react";
import axiosInstance from "../../../api/axiosinstance";

const PickupRequestPage = () => {
  const [pickupDate, setPickupDate] = useState("");
  const [slot, setSlot] = useState("");
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [eligibleOrders, setEligibleOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch eligible orders for pickup
  useEffect(() => {
    fetchEligibleOrders();
  }, []);

  const fetchEligibleOrders = async () => {
    try {
      const { data } = await axiosInstance.get(
        "delhivery/eligible-for-pickup/"
      );
      setEligibleOrders(data.results || []);
      console.log(data.results);
      
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to fetch eligible orders.");
    }
  };

  const handleOrderSelect = (orderNumber) => {
    setSelectedOrders((prev) =>
      prev.includes(orderNumber)
        ? prev.filter((o) => o !== orderNumber)
        : [...prev, orderNumber]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pickupDate || !slot) {
      setErrorMessage("Pickup date and slot are required.");
      return;
    }
    if (selectedOrders.length === 0) {
      setErrorMessage("Select at least one order for pickup.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { data } = await axiosInstance.post(
        "delhivery/pickup-request/create/",
        {
          pickup_date: pickupDate,
          slot,
          order_numbers: selectedOrders,
        }
      );

      if (data.success) {
        setSuccessMessage(
          `Pickup request created successfully! Pickup ID: ${data.pickup_request_id}`
        );
        setSelectedOrders([]);
        setPickupDate("");
        setSlot("");
        fetchEligibleOrders();
      } else {
        setErrorMessage(data.error || "Failed to create pickup request.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(
        err.response?.data?.error || "Failed to create pickup request."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-extrabold mb-6 text-gray-900">
        Create Delhivery Pickup Request
      </h1>

      {errorMessage && (
        <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4 shadow">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="bg-green-100 text-green-700 px-4 py-2 rounded mb-4 shadow">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mb-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Pickup Date
            </label>
            <input
              type="date"
              value={pickupDate}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setPickupDate(e.target.value)}
              className="w-full border rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Slot
            </label>
            <select
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
              className="w-full border rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select Slot</option>
              <option value="midday">Midday (10:00-14:00)</option>
              <option value="evening">Evening (14:00-18:00)</option>
            </select>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            Eligible Orders
          </h2>
          {eligibleOrders.length === 0 ? (
            <p className="text-gray-500">No eligible orders for pickup.</p>
          ) : (
            <div className="grid gap-6">
              {eligibleOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-xl shadow-md p-5 hover:shadow-lg transition-shadow duration-200"
                >
                  <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center mb-4">
                    <div className="flex items-center mb-3 md:mb-0">
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order.order_number)}
                        onChange={() => handleOrderSelect(order.order_number)}
                        className="mr-3 w-5 h-5 text-blue-600 rounded"
                      />
                      <div>
                        <p className="font-semibold text-gray-800">
                          {order.order_number}
                        </p>
                        <p className="text-gray-500 text-sm">
                          {order.customer_name} ({order.user_email})
                        </p>
                      </div>
                    </div>
                    <div className="text-gray-700 text-sm">
                      Total: <span className="font-medium">{order.total}</span> |{" "}
                      Weight: <span className="font-medium">{order.total_weight_grams}g</span> |{" "}
                      Status: <span className="font-medium">{order.status}</span>
                    </div>
                  </div>

                  {order.products && order.products.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {order.products.map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-gray-50 rounded-lg p-3 flex flex-col items-center shadow-sm"
                        >
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.variant}
                              className="w-24 h-24 object-cover rounded mb-2"
                            />
                          ) : (
                            <div className="w-24 h-24 bg-gray-200 rounded mb-2 flex items-center justify-center text-gray-400">
                              No Image
                            </div>
                          )}
                          <p className="font-semibold text-gray-800 text-center">
                            {item.product_name}
                          </p>
                          <p className="text-gray-500 text-sm">{item.variant}</p>
                          <p className="text-gray-600 mt-1">Qty: {item.quantity}</p>
                          <p className="text-gray-400 text-xs mt-1">
                            Packed At: {item.packed_at || "-"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {order.waybill && (
                    <div className="mt-3 text-blue-600 font-medium">
                      Waybill:{" "}
                      <a
                        href={order.tracking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        {order.waybill}
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full md:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold shadow hover:bg-blue-700 transition-colors duration-200"
        >
          {loading ? "Creating..." : "Create Pickup Request"}
        </button>
      </form>
    </div>
  );
};

export default PickupRequestPage;
