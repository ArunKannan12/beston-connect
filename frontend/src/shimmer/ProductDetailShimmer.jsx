// ProductDetailShimmer.jsx
import React from "react";

const ProductDetailShimmer = () => {
  return (
    <div className="animate-pulse p-4 max-w-5xl mx-auto">
      {/* Image + Info layout */}
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Left: Product Image */}
        <div className="flex-1">
          <div className="w-full h-80 bg-gray-300 rounded-xl"></div>
        </div>

        {/* Right: Product Info */}
        <div className="flex-1 space-y-4">
          <div className="h-8 bg-gray-300 rounded w-3/4"></div>
          <div className="h-6 bg-gray-300 rounded w-1/2"></div>
          <div className="h-10 bg-gray-300 rounded w-1/3"></div>

          {/* Description */}
          <div className="space-y-2">
            <div className="h-4 bg-gray-300 rounded w-full"></div>
            <div className="h-4 bg-gray-300 rounded w-5/6"></div>
            <div className="h-4 bg-gray-300 rounded w-4/6"></div>
          </div>

          {/* Button */}
          <div className="h-12 bg-gray-300 rounded-lg w-1/2"></div>
        </div>
      </div>

      {/* Related Products Placeholder */}
      <div className="mt-10">
        <div className="h-6 bg-gray-300 rounded w-40 mb-4"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 bg-gray-300 rounded-lg"></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailShimmer;
