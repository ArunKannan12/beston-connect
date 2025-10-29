const CategoryShimmer = () => {
  return (
    <>
      <style>
        {`
          @keyframes shimmer {
            0% {
              background-position: -200px 0;
            }
            100% {
              background-position: 200px 0;
            }
          }
          .animate-shimmer {
            animation: shimmer 1.5s infinite linear;
            background-size: 400px 100%;
          }
        `}
      </style>

      <div className="cursor-pointer shadow-md rounded-lg overflow-hidden">
        <div
          className="h-36 w-full mb-3 rounded animate-shimmer bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300"
          style={{ backgroundSize: "400px 100%", backgroundPosition: "-200px 0" }}
        ></div>
        <div
          className="h-6 mx-4 rounded animate-shimmer bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300"
          style={{ backgroundSize: "400px 100%", backgroundPosition: "-200px 0" }}
        ></div>
      </div>
    </>
  );
};

export default CategoryShimmer;
