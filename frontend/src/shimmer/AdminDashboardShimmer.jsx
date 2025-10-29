// components/admin/AdminDashboardShimmer.jsx
import React from "react";

const AdminDashboardShimmer = () => {
  return (
    <div className="space-y-8 p-6 bg-gray-50 min-h-screen animate-pulse">
      {/* 1. Summary Cards Shimmer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="p-6 rounded-2xl shadow-lg bg-white flex flex-col space-y-3"
          >
            <div className="h-6 w-10 bg-gray-200 rounded"></div>
            <div className="h-4 w-20 bg-gray-200 rounded"></div>
            <div className="h-6 w-16 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>

      {/* 2. Charts Shimmer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-white rounded-2xl shadow h-[350px] flex flex-col">
          <div className="h-5 w-32 bg-gray-200 rounded mb-4"></div>
          <div className="flex-1 bg-gray-200 rounded"></div>
        </div>
        <div className="p-6 bg-white rounded-2xl shadow h-[350px] flex flex-col">
          <div className="h-5 w-40 bg-gray-200 rounded mb-4"></div>
          <div className="flex-1 bg-gray-200 rounded-full"></div>
        </div>
      </div>

      {/* 3. Tables Shimmer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-white rounded-2xl shadow h-[250px] flex flex-col">
          <div className="h-5 w-32 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3 flex-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
        <div className="p-6 bg-white rounded-2xl shadow h-[250px] flex flex-col">
          <div className="h-5 w-40 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3 flex-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardShimmer;
