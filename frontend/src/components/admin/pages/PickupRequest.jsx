import React, { useState, useEffect } from "react";
import axiosInstance from "../../../api/axiosinstance";

const PickupRequestPage = () => {
  const [pickupDate, setPickupDate] = useState("");
  const [slot, setSlot] = useState("");
  const [expectedPackageCount, setExpectedPackageCount] = useState(1);
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
        "delhivery/pickup-requests/" // make sure this endpoint exists
      );
      setEligibleOrders(data.results || []);
      console.log(data.results);
       // assuming DRF pagination
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to fetch eligible orders.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pickupDate || !slot) {
      setErrorMessage("Pickup date and slot are required.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { data } = await axiosInstance.post("delhivery/pickup-request/create/", {
        pickup_date: pickupDate,
        slot,
        expected_package_count: expectedPackageCount,
      });

      setSuccessMessage(
        `Pickup request created successfully! Linked orders: ${data.linked_orders_count}, Pickup ID: ${data.pickup_request_id}`
      );

      // Refresh eligible orders
      fetchEligibleOrders();
      setPickupDate("");
      setSlot("");
      setExpectedPackageCount(1);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.response?.data?.error || "Failed to create pickup request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Create Delhivery Pickup Request</h1>

      {errorMessage && <div className="text-red-600 mb-4">{errorMessage}</div>}
      {successMessage && <div className="text-green-600 mb-4">{successMessage}</div>}

      <form onSubmit={handleSubmit} className="mb-6 space-y-4">
        <div>
          <label className="block mb-1">Pickup Date</label>
          <input
            type="date"
            value={pickupDate}
            min={new Date().toISOString().split("T")[0]} // disable past dates
            onChange={(e) => setPickupDate(e.target.value)}
            className="border p-2 w-full"
            required
          />
        </div>

        <div>
          <label className="block mb-1">Slot</label>
          <select
            value={slot}
            onChange={(e) => setSlot(e.target.value)}
            className="border p-2 w-full"
            required
          >
            <option value="">Select Slot</option>
            <option value="midday">Midday (10:00-14:00)</option>
            <option value="evening">Evening (14:00-18:00)</option>
          </select>
        </div>

        <div>
          <label className="block mb-1">Expected Package Count</label>
          <input
            type="number"
            value={expectedPackageCount}
            min={1}
            onChange={(e) => setExpectedPackageCount(Number(e.target.value))}
            className="border p-2 w-full"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {loading ? "Creating..." : "Create Pickup Request"}
        </button>
      </form>

      <h2 className="text-xl font-semibold mb-2">Eligible Orders</h2>
      {eligibleOrders.length === 0 ? (
        <p>No eligible orders for pickup.</p>
      ) : (
        <table className="w-full border-collapse border">
          <thead>
            <tr>
              <th className="border p-2">Order Number</th>
              <th className="border p-2">User</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {eligibleOrders.map((order) => (
              <tr key={order.id}>
                <td className="border p-2">{order.order_number}</td>
                <td className="border p-2">{order.user_email}</td>
                <td className="border p-2">{order.status}</td>
                <td className="border p-2">{order.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default PickupRequestPage;
