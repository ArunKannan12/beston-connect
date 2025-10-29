import React from "react";

const ProfileShimmer = () => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-6 bg-white rounded-xl shadow-lg border border-gray-200 animate-pulse">
      {/* Profile Header */}
      <div className="text-center mb-8">
        <div className="relative inline-block">
          {/* Avatar circle */}
          <div className="w-28 h-28 rounded-full bg-gray-300 mx-auto"></div>
          {/* Edit button shimmer */}
          <div className="absolute bottom-0 right-0 w-16 h-6 bg-gray-300 rounded-full"></div>
        </div>

        {/* Name */}
        <div className="mt-4 h-6 w-40 bg-gray-300 rounded mx-auto"></div>
        {/* Email */}
        <div className="mt-2 h-4 w-56 bg-gray-200 rounded mx-auto"></div>
        {/* Role */}
        <div className="mt-3 h-5 w-24 bg-gray-300 rounded-full mx-auto"></div>
        {/* Auth provider */}
        <div className="mt-2 h-3 w-40 bg-gray-200 rounded mx-auto"></div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-8">
        <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
        <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div className="h-5 w-32 bg-gray-300 rounded mb-3"></div>
            <div className="h-14 w-full bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProfileShimmer;
