import { motion } from "framer-motion";

const OrderListShimmer = ({ count = 3 }) => {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl sm:text-3xl font-extrabold mb-6 text-gray-900 text-center sm:text-left">
            Your Orders
        </h1>

      <ul className="space-y-8">
        {Array.from({ length: count }).map((_, idx) => (
          <motion.li
            key={idx}
            className="bg-white/70 backdrop-blur-md shadow-xl rounded-2xl p-6 flex justify-between items-center border border-gray-100 animate-pulse"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { delay: idx * 0.1 } }}
          >
            <div className="flex items-center space-x-4">
              {/* Images Placeholder */}
              <div className="flex -space-x-2">
                <div className="w-16 h-16 bg-gray-200 rounded-xl border border-gray-300" />
                <div className="w-16 h-16 bg-gray-200 rounded-xl border border-gray-300" />
                <div className="w-16 h-16 bg-gray-200 rounded-xl border border-gray-300" />
              </div>

              {/* Text Placeholder */}
              <div className="space-y-2 flex-1">
                <div className="h-5 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-4 bg-gray-200 rounded w-1/3" />
              </div>
            </div>

            {/* Button Placeholder */}
            <div className="w-32 h-10 bg-gray-200 rounded-xl" />
          </motion.li>
        ))}
      </ul>
    </div>
  );
};

export default OrderListShimmer;
