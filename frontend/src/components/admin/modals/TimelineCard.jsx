import React from 'react';
import moment from 'moment';
import { motion } from 'framer-motion';

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

const TimelineCard = ({ timeline }) => {
  const stages = [
    { label: "Picked", key: "picked_at", icon: "📥" },
    { label: "Packed", key: "packed_at", icon: "📦" },
    { label: "Shipped", key: "shipped_at", icon: "🚚" },
    { label: "Out for Delivery", key: "out_for_delivery_at", icon: "🛵" },
    { label: "Delivered", key: "delivered_at", icon: "✅" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm w-full max-w-xl mx-auto mb-6"
    >
      {/* Product Preview at Top */}
      {timeline.products?.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-4 justify-start">
            {timeline.products.map((p, i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-md shadow-sm w-full sm:w-auto">
                <img src={p.product_image} alt={p.variant_name} className="w-14 h-14 object-cover rounded" />
                <div className="text-xs text-gray-600">
                  <p className="font-medium">{p.product_name}</p>
                  <p>{p.variant_name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order Header */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3 className="text-lg font-semibold text-gray-800">{timeline.order_number}</h3>
        <span
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[timeline.current_status] || "bg-gray-100 text-gray-700"}`}
        >
          {ACTION_ICONS[timeline.current_status]} {timeline.current_status.replace(/_/g, " ")}
        </span>
      </div>

      {/* Timeline Stages */}
      <div className="relative border-l-2 border-gray-200 pl-4 space-y-6">
        {stages.map(({ label, key, icon }) => {
          const isCurrent = timeline.current_status === key.replace('_at', '');
          return (
            <div key={key} className={`flex items-start gap-3 ${isCurrent ? 'bg-indigo-50 p-2 rounded-md' : ''}`}>
              <div className="text-lg">{icon}</div>
              <div>
                <p className="text-sm font-medium text-gray-700">{label}</p>
                <p className="text-xs text-gray-500">
                  {timeline[key] ? moment(timeline[key]).format("DD MMM YYYY, hh:mm A") : "—"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Duration Metrics */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-600">
        {timeline.time_to_pack && (
          <div className="bg-gray-50 p-2 rounded-md shadow-sm">⏱ Time to Pack: {timeline.time_to_pack}</div>
        )}
        {timeline.time_to_ship && (
          <div className="bg-gray-50 p-2 rounded-md shadow-sm">⏱ Time to Ship: {timeline.time_to_ship}</div>
        )}
        {timeline.time_to_delivery && (
          <div className="bg-gray-50 p-2 rounded-md shadow-sm">⏱ Time to Delivery: {timeline.time_to_delivery}</div>
        )}
      </div>
    </motion.div>
  );
};

export default TimelineCard;