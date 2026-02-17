import React, { useState, useEffect } from "react";
import axiosInstance from "../../../api/axiosinstance";
import { toast } from "react-toastify";

const AddRating = ({ productId }) => {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [hasRated, setHasRated] = useState(false);
  const [loading, setLoading] = useState(false);

  // 🔹 Fetch existing rating (GET /ratings/me/)
  useEffect(() => {
    const fetchMyRating = async () => {
      try {
        const { data } = await axiosInstance.get(
          `products/${productId}/ratings/me/`
        );
        setRating(data.rating);
        setReview(data.review || "");
        setHasRated(true);
      } catch (err) {
        if (err.response?.status === 404) {
          setHasRated(false); // user hasn't rated yet
        } else {
          toast.error("Failed to load your rating");
        }
      }
    };

    fetchMyRating();
  }, [productId]);

  // 🔹 Submit or update rating
  const handleSubmit = async () => {
    if (!rating) {
      toast.error("Please select a rating");
      return;
    }

    setLoading(true);
    try {
      const url = hasRated
        ? `products/${productId}/ratings/me/`
        : `products/${productId}/ratings/`;

      const method = hasRated ? "patch" : "post";

      const { data } = await axiosInstance[method](url, { rating, review });

      toast.success(data.detail);
      setHasRated(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Delete rating (DELETE /ratings/me/)
  const handleDelete = async () => {
    setLoading(true);
    try {
      await axiosInstance.delete(`products/${productId}/ratings/me/`);
      toast.success("Rating deleted");
      setRating(0);
      setReview("");
      setHasRated(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-2xl shadow-md">
      <h3 className="font-semibold mb-2 text-gray-900">
        {hasRated ? "Update your rating" : "Rate this product"}
      </h3>

      {/* ⭐ Rating Stars */}
      <div className="flex gap-1 mb-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            onClick={() => setRating(star)}
            className={`text-2xl cursor-pointer ${
              star <= rating ? "text-yellow-500" : "text-gray-300"
            }`}
          >
            ★
          </span>
        ))}
      </div>

      {/* 📝 Review Text */}
      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        placeholder="Write a review (optional)"
        className="w-full border border-gray-200 rounded-md p-2 mb-3 text-sm resize-none"
        rows={3}
      />

      {/* 🔘 Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {loading ? "Saving..." : hasRated ? "Update" : "Submit"}
        </button>

        {hasRated && (
          <button
            onClick={handleDelete}
            disabled={loading}
            className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition disabled:opacity-50"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
};

export default AddRating;