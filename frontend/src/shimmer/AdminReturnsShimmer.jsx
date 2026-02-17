import React from "react";

const AdminReturnsShimmer = () => {
  return (
    <div className="space-y-6">
      {/* Header Shimmer */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
        <div className="w-48 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
      </div>

      {/* Stats Cards Shimmer */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-16 h-6 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters Shimmer */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="flex gap-2">
            <div className="flex-1 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="flex-1 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="flex-1 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Table Shimmer */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-100 px-4 py-3">
          <div className="grid grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-300 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="px-4 py-4">
              <div className="grid grid-cols-6 gap-4 items-center">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination Shimmer */}
      <div className="flex justify-between items-center">
        <div className="w-20 h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="w-32 h-4 bg-gray-200 rounded animate-pulse"></div>
        <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
      </div>
    </div>
  );
};

export default AdminReturnsShimmer;
