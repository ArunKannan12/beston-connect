import React from "react";

const AdminCustomersShimmer = () => {
  return (
    <div className="space-y-6">
      {/* Header Shimmer */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
        <div className="w-48 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
      </div>

      {/* Filters Shimmer */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="w-32 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="w-32 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="w-40 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      </div>

      {/* Desktop Table Shimmer */}
      <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-100 px-4 py-3">
          <div className="grid grid-cols-9 gap-4">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-300 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="px-4 py-4">
              <div className="grid grid-cols-9 gap-4 items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="w-32 h-3 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
                {[...Array(8)].map((_, j) => (
                  <div key={j} className="h-4 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Cards Shimmer */}
      <div className="sm:hidden space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="w-32 h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-40 h-3 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-24 h-3 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-20 h-3 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminCustomersShimmer;
