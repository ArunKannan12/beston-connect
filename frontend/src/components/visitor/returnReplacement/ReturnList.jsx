import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../../../api/axiosinstance";
import { toast } from "react-toastify";
import ReturnListShimmer from "../../../shimmer/ReturnListShimmer";

const ReturnList = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("returns/");
      setReturns(res.data.results);
    } catch (error) {
      const errMsg = error.response?.data?.detail || "Failed to load returns";
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  if (loading)
    return <ReturnListShimmer/>;

  if (!returns.length)
    return (
      <p className="text-center py-10 text-gray-500">
        You have no return requests yet.
      </p>
    );

  return (
    <div className="max-w-5xl mx-auto mt-8 px-4 sm:px-6 py-6 font-sans">
      <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 mb-6 text-center tracking-tight">
        My Returns
      </h1>

      <div className="space-y-8">
        {returns.map((ret) => (
          <Link
            to={`/returns/${ret.id}`}
            key={ret.id}
            className="block border-b border-gray-200 pb-4"
          >
            <div className="flex flex-row items-center gap-4">
              <img
                src={ret.product_image || ret.variant_images?.[0]}
                alt={ret.variant}
                className="w-20 h-20 sm:w-24 sm:h-24 aspect-square object-contain rounded  flex-shrink-0"
              />

              <div className="flex-1 space-y-1">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                  {ret.product} {ret.variant && `- ${ret.variant}`}
                </h2>
                <p className="text-gray-600 text-sm">Qty: {ret.order_item.quantity}</p>
                <p className="text-gray-600 text-sm">Price Paid: ₹{ret.order_item.price}</p>
                <p className="text-gray-500 text-sm">Order: #{ret.order.order_number}</p>
                <p className="text-gray-500 text-sm">
                  Requested On: {new Date(ret.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="text-sm text-center sm:text-right">
                <span
                  className={`inline-block px-3 py-1 rounded-full font-semibold text-white ${
                    ret.status === "pending"
                      ? "bg-yellow-500"
                      : ret.status === "approved"
                      ? "bg-green-600"
                      : ret.status === "refunded"
                      ? "bg-blue-600"
                      : "bg-gray-500"
                  }`}
                >
                  {ret.status.toUpperCase()}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ReturnList;
