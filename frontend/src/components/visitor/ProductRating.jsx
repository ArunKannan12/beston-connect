import React, { useEffect, useState } from "react";
import axiosInstance from "../../api/axiosinstance";

const ProductRatings = ({ productId }) => {
  const [ratings, setRatings] = useState([]);
  const [average, setAverage] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRatings = async () => {
      try {
        const res = await axiosInstance.get(`products/${productId}/ratings/`);

        setRatings(res.data.results || []);
        setAverage(res.data.average_rating || 0);
        setCount(res.data.rating_count || 0);
        console.log(res.data);
        
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchRatings();
    }
  }, [productId]);

  const formatName = (name) =>
    name
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());

  if (loading) {
    return <p className="text-gray-500 mt-4">Loading reviews...</p>;
  }

  return (
    <div className="mt-12 w-full">
  {/* Header */}
  <hr />
  <h3 className="text-2xl font-bold text-gray-900 mb-6">Customer Reviews</h3>

  {/* Average Rating */}
  {count > 0 && (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div className="flex items-center gap-4">
        <span className="text-4xl font-extrabold text-gray-900">{average}</span>
        <div>
          <div className="flex items-center gap-1 text-yellow-500 text-lg">
            {"★".repeat(Math.round(average))}
            <span className="text-gray-300">{"★".repeat(5 - Math.round(average))}</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">Based on {count} reviews</p>
        </div>
      </div>
    </div>
  )}

  {/* Reviews List */}
  <div className="space-y-6">
    {ratings.length === 0 ? (
      <div className="text-center py-10 text-gray-400">No reviews yet</div>
    ) : (
      ratings.map((r) => (
        <div
          key={r.id}
          className="p-5 rounded-2xl bg-gray-50 shadow-sm hover:shadow-md transition-shadow"
        >
          {/* User Info + Date */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700">
                {r.user_name?.charAt(0).toUpperCase()}
              </div>

              <div>
                <p className="font-medium text-gray-900 flex items-center gap-2 text-sm">
                  {formatName(r.user_name)}
                </p>
                <p className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Stars */}
            <div className="flex items-center gap-1 text-yellow-500 text-sm">
              {"★".repeat(r.rating)}
              <span className="text-gray-300">{"★".repeat(5 - r.rating)}</span>
            </div>
          </div>

          {/* Review Text */}
          {r.review && <p className="text-gray-800 text-sm leading-relaxed">{r.review}</p>}
        </div>
      ))
    )}
  </div>
</div>


  );
};

export default ProductRatings;
