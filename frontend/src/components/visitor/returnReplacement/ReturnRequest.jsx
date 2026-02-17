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
  const [refundProcessed, setRefundProcessed] = useState(false);

  // Refund status
  const [refundStatus, setRefundStatus] = useState(null);
  const [refundLoading, setRefundLoading] = useState(false);

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

  // ----------------- FETCH DATA -----------------
  useEffect(() => {
    const fetchData = async () => {
      if (!returnId && !orderNumber) {
        toast.error("No order specified");
        navigate("/orders/");
        return;
      }

      setLoading(true);
      try {
        if (returnId) {
          const res = await axiosInstance.get(`/returns/${returnId}/`);
          setRequest(res.data);
          setOrder(res.data.order);

          const reason = res.data.reason;
          const matched = predefinedReasons.find(r => r === reason);
          if (matched) {
            setSelectedReason(matched);
            setCustomReason("");
          } else {
            setSelectedReason("Other");
            setCustomReason(reason);
          }
        } else if (orderNumber) {
          const res = await axiosInstance.get(`/order-details/${orderNumber}/`);
          setOrder(res.data);
        }
      } catch (err) {
        toast.error("Failed to fetch order or return request");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [returnId, orderNumber]);


  // ----------------- REFUND STATUS CHECK -----------------
  const checkRefundStatus = async () => {
    console.log("Checking refund status...");

    if (!order?.order_number) return;

    setRefundLoading(true);

    try {
      const res = await axiosInstance.get(`/refund-status/${order.order_number}/`);
      setRefundStatus(res.data);

      if (res.data.success) {
        setRefundProcessed(true);
        toast.success("Refund completed successfully!");
      } else {
        toast.info("Refund is still pending");
      }

    } catch (err) {
      toast.error("Failed to check refund status");
    } finally {
      setRefundLoading(false);
    }
  };


  // ----------------- CREATE RETURN -----------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    const reason = selectedReason === "Other" ? customReason : selectedReason;
    if (!reason.trim()) return toast.error("Please provide a reason");

    if (order?.payment_method?.toLowerCase() === "cod" && !upi.trim()) {
      return toast.error("UPI ID is required for COD refunds");
    }

    const payload = {
      order_number: orderNumber,
      order_item_id: itemId,
      reason: reason,
      ...(order?.payment_method?.toLowerCase() === "cod" && { user_upi: upi }),
    };

    try {
      setLoading(true);
      const res = await axiosInstance.post("/returns/create/", payload);
      setRequest(res.data);
      toast.success("Return request submitted!");
      navigate(`/returns/${res.data.id}`);
    } catch (err) {
      toast.error("Failed to submit return request");
    } finally {
      setLoading(false);
    }
  };



  // ----------------- LOADING OR ORDER NOT FOUND -----------------
  if (loading) return <p className="text-center py-10">Loading...</p>;
  if (!order) return <p className="text-center py-10">Order not found</p>;

  console.log(request);


  // ----------------- VIEW EXISTING RETURN REQUEST -----------------
  if (request) {
    return (
      <div className="max-w-4xl mx-auto mt-12 px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">Return Request Summary</h1>

        <div className="flex gap-6 mb-8">
          <img
            src={request.product_image}
            alt=""
            className="w-32 h-32 object-contain "
          />
          <div>
            <h2 className="text-xl font-semibold">{request.product}-{request.variant}</h2>
            <p className="text-gray-600">Qty: {request.order_item?.quantity}</p>
            <p className="text-gray-600">Price: ₹{request.order_item?.price}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <p><strong>Reason:</strong> {request.reason}</p>
            <p><strong>Return Status:</strong> {request.status}</p>
          </div>
          <div>
            <p><strong>Refund Amount:</strong> ₹{request.refund_amount}</p>
          </div>
        </div>

        {/* ----------------- REFUND STATUS SECTION ----------------- */}
        {["delivered_to_warehouse", "refunded"].includes(request.status) && (
          <div className="mt-6 p-4  bg-gray-50">
            <h3 className="font-semibold mb-2">Refund Status</h3>

            {/* Status Message */}
            {request.status === "refunded" ? (
              <p className="text-green-600">Refund completed successfully</p>
            ) : refundLoading ? (
              <p>Checking refund status...</p>
            ) : refundStatus ? (
              <p
                className={
                  refundStatus.success ? "text-green-600" : "text-yellow-600"
                }
              >
                {refundStatus.success
                  ? "Refund completed successfully"
                  : refundStatus.message || "Refund not completed yet"}
              </p>
            ) : (
              <p className="text-gray-600">Refund not checked yet</p>
            )}

            {/* Check Refund Button (only if not yet refunded) */}
            {!refundProcessed && request.status !== "refunded" && (
              <button
                onClick={checkRefundStatus}
                className="mt-3 px-4 py-2 bg-yellow-500 text-white rounded-lg"
              >
                {refundLoading
                  ? "Validating refund with Razorpay..."
                  : refundProcessed
                    ? "Refund confirmed."
                    : "Click button to check refund status."
                }
              </button>
            )}

          </div>
        )}

        <div className="text-center mt-10">
          <button
            onClick={() => navigate(-1)}
            className="px-8 py-3 bg-gray-900 text-white rounded-xl"
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }


  // ----------------- CREATE NEW RETURN REQUEST -----------------
  const returnableItem = order.items.find(i => i.product_variant.is_returnable);

  return (
    <div className="max-w-4xl mx-auto mt-10 px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-6">Initiate a Return</h1>

      {returnableItem ? (
        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="p-4 flex gap-4">
            <img
              src={returnableItem.product_variant.primary_image_url}
              className="w-28 h-28 rounded-xl object-cover"
            />
            <div>
              <h3 className="font-semibold">
                {returnableItem.product_variant.product_name}
              </h3>
              <p>Qty: {returnableItem.quantity}</p>
              <p>Price: ₹{returnableItem.price}</p>
            </div>
          </div>

          <div>
            <p className="font-medium mb-2">Reason for Return</p>
            {predefinedReasons.map((r, i) => (
              <label key={i} className="flex gap-2 mb-1">
                <input
                  type="radio"
                  name="reason"
                  value={r}
                  checked={selectedReason === r}
                  onChange={() => setSelectedReason(r)}
                />
                {r}
              </label>
            ))}

            {selectedReason === "Other" && (
              <textarea
                rows={3}
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Describe your reason"
                className="w-full border rounded-xl p-3 mt-2"
              />
            )}
          </div>

          {order.payment_method.toLowerCase() === "cod" && (
            <div>
              <p className="font-medium mb-1">UPI ID (for COD refunds)</p>
              <input
                type="text"
                value={upi}
                onChange={(e) => setUpi(e.target.value)}
                className="w-full border rounded-xl p-3"
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-yellow-500 text-white py-3 rounded-xl"
          >
            Submit Return Request
          </button>
        </form>
      ) : (
        <p className="text-center text-gray-600">No returnable items.</p>
      )}
    </div>
  );
};

export default ReturnRequest;
