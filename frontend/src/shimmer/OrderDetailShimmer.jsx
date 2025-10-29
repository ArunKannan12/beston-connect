import React from "react";
import { motion } from "framer-motion";

const Shimmer = ({ className }) => (
  <div className={`relative overflow-hidden rounded bg-gray-200 ${className}`}>
    {/* Moving gradient overlay */}
    <motion.div
      className="absolute inset-0"
      style={{
        background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%)",
      }}
      initial={{ x: "-100%" }}
      animate={{ x: "100%" }}
      transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
    />
  </div>
);

const OrderDetailShimmer = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg space-y-6">
      {/* Header */}
      <Shimmer className="h-8 w-40 mb-4" />

      {/* Shipping Address */}
      <div className="p-4 bg-gray-50 rounded-lg border space-y-2">
        <Shimmer className="h-6 w-48" />
        <Shimmer className="h-4 w-72" />
        <Shimmer className="h-4 w-60" />
        <Shimmer className="h-4 w-80" />
        <Shimmer className="h-4 w-40" />
      </div>

      {/* Items */}
      <div>
        <Shimmer className="h-6 w-40 mb-3" />
        <div className="divide-y border rounded-lg overflow-hidden">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="flex justify-between items-center p-4 space-x-4"
            >
              <Shimmer className="w-20 h-20 rounded-md" />
              <div className="flex-1 space-y-2">
                <Shimmer className="h-5 w-40" />
                <Shimmer className="h-4 w-24" />
              </div>
              <Shimmer className="h-5 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="p-4 bg-gray-50 rounded-lg border space-y-3">
        <Shimmer className="h-6 w-36 mb-2" />
        <Shimmer className="h-4 w-64" />
        <Shimmer className="h-4 w-52" />
        <Shimmer className="h-4 w-40" />
        <Shimmer className="h-4 w-56" />
      </div>

      {/* Buttons */}
      <div className="flex gap-3 justify-end">
        <Shimmer className="h-10 w-28 rounded-lg" />
        <Shimmer className="h-10 w-28 rounded-lg" />
      </div>
    </div>


  );
};



export default OrderDetailShimmer
