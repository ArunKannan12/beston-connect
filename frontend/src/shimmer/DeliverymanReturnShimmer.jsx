import { motion } from "framer-motion";


const DeliverymanReturnShimmer = () => {
 
  return (
    <div className="w-full space-y-6">
      {/* Desktop Table Shimmer */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full table-auto  border-gray-200 rounded-lg shadow-sm">
          <thead className="bg-gray-100">
            <tr>
              {["Product", "Variant", "Quantity", "Reason", "Status"].map((h, idx) => (
                <th key={idx} className="px-4 py-2 text-left">
                  <div className="h-4 bg-gray-300 rounded w-3/4 animate-pulse"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array(5)
              .fill(0)
              .map((_, idx) => (
                <motion.tr
                  key={idx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="border-b border-gray-200"
                >
                  {Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <td key={i} className="px-4 py-2">
                        <div className="h-4 bg-gray-300 rounded w-3/4 animate-pulse"></div>
                      </td>
                    ))}
                </motion.tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Mobile/Tablet Card Shimmer */}
      <div className="flex flex-wrap justify-center gap-4 lg:hidden">
        {Array(4)
          .fill(0)
          .map((_, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="p-4  rounded-lg shadow-sm w-80 bg-white"
            >
              <div className="h-5 bg-gray-300 rounded w-1/2 mb-2 animate-pulse"></div>
              <div className="h-3 bg-gray-300 rounded w-2/3 mb-1 animate-pulse"></div>
              <div className="h-3 bg-gray-300 rounded w-1/4 mb-1 animate-pulse"></div>
              <div className="h-3 bg-gray-300 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-gray-300 rounded w-1/4 mt-2 animate-pulse"></div>
            </motion.div>
          ))}
      </div>
    </div>
  );
};

export default DeliverymanReturnShimmer;
