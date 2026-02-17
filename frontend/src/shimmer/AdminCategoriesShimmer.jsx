import React from "react";

const AdminCategoriesShimmer = () => {
  return (
    <div className="space-y-6">
      {/* Header Shimmer */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="w-48 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
        <div className="w-full lg:w-80 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
      </div>

      {/* Categories Grid Shimmer */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Image Shimmer */}
            <div className="w-full aspect-[4/3] bg-gray-200 animate-pulse"></div>
            
            {/* Content Shimmer */}
            <div className="p-4 space-y-3">
              <div className="space-y-2">
                <div className="w-3/4 h-6 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-1/2 h-4 bg-gray-200 rounded animate-pulse"></div>
              </div>
              
              {/* Actions Shimmer */}
              <div className="flex justify-end gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
                <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminCategoriesShimmer;
