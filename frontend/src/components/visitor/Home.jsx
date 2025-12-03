import React, { useEffect, useState } from "react";
import BannerSlider from "./BannerSlide";
import axiosInstance from "../../api/axiosinstance";
import FeaturedShimmer from "../../shimmer/FeaturedShimmer.jsx";
import { Link } from "react-router-dom";

const Home = () => {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchFeaturedProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axiosInstance.get("products/featured/");
      const data = res.data.results;
      setFeatured(data);
    } catch (err) {
      setError(err.message || "Failed to load featured products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);
 
  
  return (
   <>
  {/* Full width banner */}
  <div className="w-full">
    <BannerSlider />
  </div>

  {/* Responsive main content */}
  <div className="w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
    <h1 className="text-2xl sm:text-4xl font-bold mb-4 sm:mb-6">
      Welcome to Beston!
    </h1>
    <p className="mb-6 sm:mb-10 text-gray-700 text-sm sm:text-base">
      Explore our categories and find your favorite products.
    </p>

    <section>
  <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">
    Featured Products
  </h2>

  {error && <p className="text-red-600 mb-4 font-semibold">{error}</p>}

  {loading ? (
  <FeaturedShimmer />
) : featured.length === 0 ? (
  <p className="text-gray-600">No featured products</p>
) : (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
    {featured.map((variant) => {
      const finalPrice = parseFloat(variant.final_price || "0");
      const basePrice = parseFloat(variant.base_price || "0");
      const isDiscounted = basePrice > 0 && finalPrice < basePrice;
      const discountPercent = isDiscounted
        ? Math.round(((basePrice - finalPrice) / basePrice) * 100)
        : 0;

      const imageUrl =
        variant.primary_image_url ||
        variant.images?.[0]?.image_url ||
        variant.product_category?.image_url ||
        "/placeholder.png";
      console.log(featured);
      
      return (
        <Link
          key={variant.id}
          to={`/products/${variant.product_slug}?variant=${encodeURIComponent(variant.variant_name)}`}
          className="group block bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition duration-300"
        >

          {/* Image */}
          <div className="relative w-full aspect-[4/3]">
            <img
              src={imageUrl}
              alt={variant.variant_name}
              loading="lazy"
              className="object-cover w-full h-full transition duration-300 group-hover:scale-105"
            />
            {variant.featured && (
              <span className="absolute top-2 left-2 bg-yellow-500 text-white text-xs font-semibold px-2 py-1 rounded">
                Featured
              </span>
            )}
            {variant.is_new && (
              <span className="absolute top-2 right-2 bg-pink-600 text-white text-xs font-semibold px-2 py-1 rounded">
                New
              </span>
            )}
          </div>

          {/* Info */}
          <div className="p-2 sm:p-3">
            <h2 className="text-sm sm:text-base font-semibold text-gray-900 mb-1 line-clamp-2">
              {variant.product_name}
            </h2>
            <p className="text-xs text-gray-600 mb-1 line-clamp-2">
              {variant.variant_name}
            </p>

            {/* Pricing */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm sm:text-base font-bold text-gray-800">
                ₹{finalPrice.toFixed(2)}
              </span>
              {isDiscounted && (
                <>
                  <span className="text-xs line-through text-red-500">
                    ₹{basePrice.toFixed(2)}
                  </span>
                  <span className="text-[10px] sm:text-xs font-medium text-green-600 bg-green-100 px-1 py-0.5 rounded-full">
                    {discountPercent}% OFF
                  </span>
                </>
              )}
            </div>

            {/* Stock */}
            {variant.stock > 0 && variant.stock < 5 && (
              <p className="mt-1 text-[10px] sm:text-xs text-red-600 font-medium">
                Only {variant.stock} left!
              </p>
            )}
          </div>
        </Link>
      );
    })}
  </div>
)}
</section>
  </div>
</>


  );
};

export default Home;
