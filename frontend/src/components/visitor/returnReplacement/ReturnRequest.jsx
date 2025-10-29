import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import axiosInstance from "../../../api/axiosinstance";
import { toast } from "react-toastify";

const ReturnRequest = () => {
  const { returnId, orderNumber } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [request, setRequest] = useState(null);
  const [upi, setUpi] = useState("");
  const [loading, setLoading] = useState(true);

  const predefinedReasons = [
    "Damaged product",
    "Wrong item delivered",
    "Product not as described",
    "Ordered by mistake",
    "Other"
  ];
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  const itemId = searchParams.get("item");

  useEffect(() => {
    const fetchData = async () => {
      if (!returnId && !orderNumber) {
        toast.error("No order specified");
        navigate("/orders");
        return;
      }

      setLoading(true);
      try {
        if (returnId) {
          // Fetch existing return request
          const res = await axiosInstance.get(`/returns/${returnId}/`);
          setRequest(res.data);
          setOrder(res.data.order);

          // Prefill reason
          if (res.data.reason) {
            const matchedReason = predefinedReasons.find(r => r === res.data.reason);
            if (matchedReason) {
              setSelectedReason(matchedReason);
              setCustomReason("");
            } else {
              setSelectedReason("Other");
              setCustomReason(res.data.reason);
            }
          }
        } else if (orderNumber) {
          // Fetch order for new return
          const res = await axiosInstance.get(`/orders/${orderNumber}/`);
          setOrder(res.data);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch order or return request");
        navigate("/orders");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [returnId, orderNumber, navigate]);

  // Select the first returnable product
  const returnableItem = order?.items?.find(
    (item) => item.product_variant.is_returnable
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const reasonToSubmit = selectedReason === "Other" ? customReason : selectedReason;
    if (!reasonToSubmit.trim()) return toast.error("Please provide a reason");

    if (order?.payment_method?.toLowerCase() === "cod" && !upi.trim()) {
      return toast.error("Please provide your UPI ID for COD payment");
    }

    const payload = {
      order_number: orderNumber,
      order_item_id: itemId || returnableItem?.id,
      reason: reasonToSubmit,
      ...(order?.payment_method?.toLowerCase() === "cod" && { user_upi: upi }),
    };

    try {
      setLoading(true);
      const res = await axiosInstance.post("/returns/create/", payload);
      setRequest(res.data);
      toast.success("Return request submitted successfully");
      navigate(`/returns/${res.data.id}`);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to submit return request");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p className="text-center py-10 text-gray-500">Loading...</p>;
  if (!order) return <p className="text-center py-10 text-gray-500">Order not found.</p>;

  // Viewing existing return request
  if (request) {
    return (
      <div className="max-w-4xl mx-auto mt-12 px-4 sm:px-6 py-8 font-sans">
  <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 mb-10 text-center tracking-tight">
    Return Request Summary
  </h1>

  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
      <div className="w-32 h-32 flex-shrink-0">
        <img
          src={request.product_image || request.variant_images?.[0]}
          alt={request.variant}
          className="w-full h-full object-contain rounded-xl border border-gray-200"
        />
      </div>
      <div className="flex-1">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">
          {request.product} {request.variant && `- ${request.variant}`}
        </h2>
        <p className="text-gray-600 text-sm mt-1">
          Quantity: <span className="font-medium">{request.order_item?.quantity}</span>
        </p>
        <p className="text-gray-600 text-sm">
          Price Paid: <span className="font-medium text-gray-800">₹{request.order_item?.price}</span>
        </p>
      </div>
    </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm mb-8">
    <div className="space-y-2">
      <p><strong className="text-gray-700">Reason:</strong> <span className="text-gray-800">{request.reason}</span></p>
      <p>
        <strong className="text-gray-700">Status:</strong>{" "}
        <span
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-white ${
            request.status === "pending" ? "bg-yellow-500" :
            request.status === "approved" ? "bg-green-600" :
            "bg-gray-500"
          }`}
        >
          {request.status === "pending" && "⏳"}
          {request.status === "approved" && "✅"}
          {request.status === "rejected" && "❌"}
          {request.status?.toUpperCase()}
        </span>
      </p>
    </div>
    <div className="space-y-2">
      <p><strong className="text-gray-700">Refund Amount:</strong> <span className="text-gray-800 font-medium">₹{request.refund_amount}</span></p>
      <p><strong className="text-gray-700">Refund Method:</strong> <span className="text-gray-800 font-medium">{request.refund_method_display}</span></p>
    </div>
  </div>

  <div className="text-center">
    <button
      onClick={() => navigate(-1)}
      className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition"
    >
      ← Go Back
    </button>
  </div>
</div>


    );
  }

  // Creating new return request
  return (
    <div className="max-w-4xl mx-auto mt-8 px-4 sm:px-6 py-6 bg-white rounded-3xl shadow-2xl font-sans">
      <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 mb-8 text-center tracking-tight">
        Initiate a Return
      </h1>

      {returnableItem ? (
        <>
          {/* Product Overview */}
          <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl shadow-md mb-6">
            <img
              src={returnableItem.product_variant.primary_image_url}
              alt={returnableItem.product_variant.variant_name}
              className="w-28 h-28 object-cover rounded-xl border"
            />
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                {returnableItem.product_variant.product_name}{" "}
                {returnableItem.product_variant.variant_name && `- ${returnableItem.product_variant.variant_name}`}
              </h2>
              <p className="text-gray-600 text-sm">Qty: {returnableItem.quantity}</p>
              <p className="text-gray-600 text-sm">Price Paid: ₹{returnableItem.price}</p>
            </div>
          </div>

          {/* Reason & UPI Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            <div>
              <p className="font-medium mb-2">Reason for Return</p>
              <div className="space-y-2">
                {predefinedReasons.map((reasonOption, idx) => (
                  <label key={idx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="returnReason"
                      value={reasonOption}
                      checked={selectedReason === reasonOption}
                      onChange={() => setSelectedReason(reasonOption)}
                      className="w-4 h-4"
                    />
                    <span>{reasonOption}</span>
                  </label>
                ))}
              </div>
              {selectedReason === "Other" && (
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Please describe your reason"
                  rows={4}
                  className="w-full border border-gray-300 rounded-xl p-3 mt-2 focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-sm"
                />
              )}
            </div>

            {order.payment_method?.toLowerCase() === "cod" && (
              <div>
                <label className="block font-medium mb-2">UPI ID (required)</label>
                <input
                  type="text"
                  value={upi}
                  onChange={(e) => setUpi(e.target.value)}
                  placeholder="Enter your UPI ID"
                  className="w-full border border-gray-300 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Required for COD refunds</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 transition font-semibold shadow-md disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Submit Return Request"}
            </button>
          </form>
        </>
      ) : (
        <p className="text-center text-gray-500">No returnable products in this order.</p>
      )}
    </div>
  );
};

export default ReturnRequest;
