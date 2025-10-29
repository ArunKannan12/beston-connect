import { motion } from "framer-motion";
import React from "react";

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return null;
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hr ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const stepIcons = {
  pending: "🕒",
  processing: "💳",
  packed: "📦",
  shipped: "🚚",
  out_for_delivery: "📍",
  delivered: "✅",
  cancelled: "❌",
  returned: "↩️",
  replacement: "🔁",
};

const OrderTracker = ({
  status,
  paymentMethod,
  timestamps = {},
  cancel_info,
  return_request,
  replacement_request,
}) => {
  const isCOD = paymentMethod?.toLowerCase() === "cod";
  const isCancelled = status?.toLowerCase() === "cancelled";

  const baseSteps = [
    { key: isCOD ? "pending" : "processing", label: isCOD ? "Pending" : "Processing" },
    { key: "packed", label: "Packed" },
    { key: "shipped", label: "Shipped" },
    { key: "out_for_delivery", label: "Out for Delivery" },
    { key: "delivered", label: "Delivered" },
  ];

  const postSteps = [];

  if (isCancelled) {
    baseSteps.splice(1);
    baseSteps.push({ key: "cancelled", label: "Cancelled", detached: false });
  }

  if (return_request?.status) {
    postSteps.push({
      key: "returned",
      label: "Return Requested",
      detached: true,
      status: return_request.status,
      finalized: return_request.status === "refunded",
    });
  }

  if (replacement_request?.status) {
    postSteps.push({
      key: "replacement",
      label: "Replacement Requested",
      detached: true,
      status: replacement_request.status,
      finalized: replacement_request.status === "shipped",
    });
  }

  const allSteps = [...baseSteps, ...postSteps];
  const currentStepIndex = allSteps.findIndex((s) => s.key === status?.toLowerCase());

  return (
    <div className="w-full px-4 py-6">
  <div className="max-w-6xl mx-auto">
    <h3 className="text-xl sm:text-2xl font-bold text-center mb-8 text-gray-900">
      📍 Order Status Tracker
    </h3>

    <div className="relative flex flex-col sm:flex-row sm:justify-between sm:items-start gap-10 sm:gap-0">
      {/* Horizontal connector line for desktop */}
      <div className="hidden sm:block absolute top-5 left-0 right-0 h-[2px] bg-gray-200 z-0" />

      {allSteps.map((step, idx) => {
        const isDetached = step.detached;
        const isCompleted = idx < currentStepIndex && !isDetached && !isCancelled;
        const isCurrent = idx === currentStepIndex && !isDetached && !isCancelled;
        const timeText = formatRelativeTime(timestamps[step.key]);

        const isPostFinalized = step.finalized;
        const isPostPending = step.status && !step.finalized;

        const circleColor = isCancelled
          ? "bg-red-500 border-red-500 text-white"
          : isCompleted
          ? "bg-green-600 border-green-600 text-white"
          : isCurrent
          ? "bg-white border-blue-500 text-blue-600 animate-pulse"
          : isPostFinalized
          ? "bg-green-600 border-green-600 text-white"
          : isPostPending
          ? "bg-yellow-100 border-yellow-400 text-yellow-700"
          : "bg-white border-gray-300 text-gray-500";

        return (
          <motion.div
            key={step.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.3 }}
            className="relative z-10 flex flex-col sm:flex-1 items-center text-center"
          >
            {/* Step Circle */}
            <div
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center font-bold text-lg sm:text-xl ${circleColor}`}
            >
              {stepIcons[step.key] || "•"}
            </div>

            {/* Connector line for mobile (vertical) */}
            {idx < allSteps.length - 1 && !step.detached && (
              <div className="sm:hidden w-[2px] h-6 bg-gray-300 mt-1"></div>
            )}

            {/* Step Label */}
            <p className="mt-2 text-xs sm:text-sm md:text-base font-semibold text-gray-800">
              {step.label}
            </p>
            {timeText && !isDetached && (
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-500">
                {timeText}
              </p>
            )}

            {/* Cancel Info */}
            {step.key === "cancelled" && cancel_info && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="mt-4 px-4 py-4 border border-red-200 text-sm text-red-700 text-center max-w-[300px]"
              >
                <div className="flex flex-col items-center mb-2">
                  <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xl">
                    ❌
                  </div>
                  <p className="font-bold mt-2">Order Cancelled</p>
                </div>

                <p className="italic mb-2">
                  Reason: {cancel_info.cancel_reason || "No reason provided"}
                </p>

                <p className="text-xs text-red-600 mb-1">
                  Cancelled {formatRelativeTime(cancel_info.cancelled_at)} by{" "}
                  <span className="font-medium">{cancel_info.cancelled_by_role}</span>
                </p>

                {timestamps.refunded && (
                  <p className="text-xs text-green-600 font-medium mt-2">
                    💸 Refund initiated {formatRelativeTime(timestamps.refunded)}
                  </p>
                )}
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </div>
  </div>
</div>

  );
};

export default OrderTracker;