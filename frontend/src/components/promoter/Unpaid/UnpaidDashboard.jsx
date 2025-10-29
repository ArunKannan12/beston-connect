import React, { useEffect, useState } from 'react'
import axiosInstance from "../../../api/axiosinstance";
import BuyPremium from './BuyPremium';
import { useNavigate } from 'react-router-dom';

const UnpaidDashboard = () => {
  const [stats,setStats] = useState({promoted_products:0,total_clicks:0})
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [promoterType, setPromoterType] = useState("unpaid");
  const navigate = useNavigate()

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {

        const promoterRes = await axiosInstance.get('promoters/me/')
        setPromoterType(promoterRes.data.promoter_profile.promoter_type);

        // Fetch promoter stats (promoted products count + total clicks)
        const statsRes = await axiosInstance.get("unpaid/dashboard/");
        setStats(statsRes.data);

        // Fetch list of promoted products
        const productsRes = await axiosInstance.get("promoted-products/");
        setProducts(productsRes.data);
        
      } catch (err) {
        console.error(err);
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  const isPremium = promoterType === "paid";

  return (
   <div className="p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto mt-6 relative">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          📊 Promoter Dashboard
          {isPremium && (
            <span className="text-yellow-500 text-sm font-medium bg-yellow-100 px-2 py-1 rounded">
              ⭐ Premium Promoter
            </span>
          )}
        </h2>

        {/* Show "Become Premium" button only if unpaid */}
        {!isPremium && (
          <button
            onClick={() => navigate('/promoter/become-premium-promoter')}
            className="px-4 py-2 bg-yellow-400 text-white font-medium rounded hover:bg-yellow-500 text-sm"
          >
            Become Premium
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-6 mb-6">
        <div className="p-4 bg-gray-100 rounded shadow flex-1 text-center">
          <p className="text-gray-600">Promoted Products</p>
          <p className="text-xl font-bold">{stats.promoted_products}</p>
        </div>
        <div className="p-4 bg-gray-100 rounded shadow flex-1 text-center">
          <p className="text-gray-600">Total Clicks</p>
          <p className="text-xl font-bold">{stats.total_clicks}</p>
        </div>
      </div>

      {/* Promoted products list */}
      <h3 className="text-xl font-semibold mb-2">Your Promoted Products</h3>
      {products.length === 0 ? (
        <p className="text-gray-500">You haven’t promoted any products yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="border p-3 rounded hover:shadow relative"
            >
              <img
                src={product.primary_image_url}
                alt={product.variant_name}
                className="w-full h-40 object-cover rounded mb-2"
              />
              <p className="font-medium">{product.product_name}</p>
              <p className="text-sm text-gray-600">Variant: {product.variant_name}</p>
              <p className="text-sm text-gray-600">
                Price: ₹{product.final_price}{' '}
                {product.discount_percent > 0 && (
                  <span className="line-through text-gray-400 ml-2">₹{product.base_price}</span>
                )}
              </p>
              <p className="text-sm text-gray-600">
                Stock: {product.stock}{' '}
                {product.is_low_stock && (
                  <span className="text-red-500 font-semibold">(Low stock!)</span>
                )}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
);

}

export default UnpaidDashboard