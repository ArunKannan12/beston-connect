import React from 'react'

const CartShimmer = ({ count = 3 }) => {
    
   const shimmerStyle = {
    background: "linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite",
  };
  return (
   <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <style>
        {`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}
      </style>


      <div className="space-y-6">
        {[...Array(count)].map((_, i) => (
          <div
            key={i}
            style={{ border: "1px solid #d1d5db", borderRadius: "1rem", padding: "1.5rem" }}
            className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 bg-white"
          >
            {/* Image placeholder */}
            <div
              style={{ ...shimmerStyle, width: "5rem", height: "5rem", borderRadius: "0.375rem", minWidth: "5rem" }}
            ></div>

            {/* Content */}
            <div className="flex-1 space-y-3 w-full">
              <div style={{ ...shimmerStyle, width: "75%", height: "1.25rem", borderRadius: "0.25rem" }}></div>
              <div style={{ ...shimmerStyle, width: "50%", height: "1rem", borderRadius: "0.25rem" }}></div>

              {/* Quantity + Price */}
              <div className="flex flex-wrap sm:flex-row items-center gap-2 sm:gap-4 mt-2">
                <div style={{ ...shimmerStyle, width: "4rem", height: "1.5rem", borderRadius: "0.25rem" }}></div>
                <div style={{ ...shimmerStyle, width: "5rem", height: "1.5rem", borderRadius: "0.25rem" }}></div>
              </div>
            </div>

            {/* Remove button placeholder */}
            <div
              style={{ ...shimmerStyle, width: "2rem", height: "2rem", borderRadius: "9999px" }}
            ></div>
          </div>
        ))}

        {/* Checkout placeholder */}
        <div
          className="mt-10 border-t border-gray-200 pt-6 flex flex-col sm:flex-row justify-between items-center bg-gray-50 p-6 rounded-2xl"
        >
          <div style={{ ...shimmerStyle, width: "10rem", height: "2rem", borderRadius: "0.5rem", marginBottom: "1rem" }}></div>
          <div style={{ ...shimmerStyle, width: "12rem", height: "3rem", borderRadius: "1.5rem" }}></div>
        </div>
      </div>
    </div>
  )
}

export default CartShimmer