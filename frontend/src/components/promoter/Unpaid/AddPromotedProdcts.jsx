import React, { useEffect, useState } from 'react';
import axiosInstance from '../../../api/axiosinstance.jsx';
import PromotedProducts from './PromotedProducts.jsx';

const AddPromotedProducts = () => {
  const [activeTab, setActiveTab] = useState('available'); 
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [refreshPromoted, setRefreshPromoted] = useState(false);

  const fetchProductsForPromotion = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('available-products/');
      setProducts(res.data);
    } catch (error) {
      console.error(error);
      setMessage('Failed to fetch products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'available') fetchProductsForPromotion();
  }, [activeTab]);

  const toggleSelectProduct = (id) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  const handlePromote = async () => {
    if (!selectedProducts.length) {
      setMessage('Select at least one product.');
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      await axiosInstance.post('promote/multiple-products/', {
        product_variant_ids: selectedProducts,
      });
      setMessage('Products promoted successfully!');
      setTimeout(() => setMessage(''), 2000);
      fetchProductsForPromotion();
      setSelectedProducts([]);
      setRefreshPromoted((prev) => !prev);
    } catch (error) {
      console.error(error);
      setMessage('Failed to promote products.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">
        Promoter Dashboard
      </h2>

      {/* Tabs */}
      <div className="flex justify-center mb-6 space-x-4">
        {['available', 'promoted'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 font-semibold rounded-lg transition-all duration-300 ${
              activeTab === tab
                ? 'bg-blue-600 text-white shadow-lg scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab === 'available' ? 'Available Products' : 'Promoted Products'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'available' ? (
        <>
          {message && (
            <div className="mb-4 text-center text-white bg-blue-500 p-2 rounded animate-pulse">
              {message}
            </div>
          )}

          {loading ? (
            <p className="text-center text-gray-600 animate-pulse">Loading products...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.length === 0 ? (
                <p className="text-center col-span-full text-gray-500">
                  No products available for promotion.
                </p>
              ) : (
                products.map((product) => (
                  <div
                    key={product.id}
                    className={`relative border rounded-lg cursor-pointer transform transition-transform duration-300 hover:scale-105 hover:shadow-lg ${
                      selectedProducts.includes(product.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300'
                    }`}
                    onClick={() => toggleSelectProduct(product.id)}
                  >
                    <input
                      type="checkbox"
                      className="absolute top-3 right-3 w-5 h-5"
                      checked={selectedProducts.includes(product.id)}
                      readOnly
                    />
                    <img
                      src={product.primary_image_url}
                      alt={product.variant_name}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                    <div className="p-3">
                      <p className="font-medium text-lg">{product.product_name}</p>
                      <p className="text-sm text-gray-600">Variant: {product.variant_name}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Price: ₹{product.final_price}{' '}
                        {product.discount_percent > 0 && (
                          <span className="line-through text-gray-400 ml-2">
                            ₹{product.base_price}
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Stock: {product.stock}{' '}
                        {product.is_low_stock && (
                          <span className="text-red-500 font-semibold">(Low stock!)</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Button at bottom-right */}
          <div className="flex justify-end mt-6">
            <button
              onClick={handlePromote}
              disabled={submitting || selectedProducts.length === 0}
              className="px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-md"
            >
              {submitting ? 'Promoting...' : 'Promote Selected Products'}
            </button>
          </div>
        </>
      ) : (
        <PromotedProducts refresh={refreshPromoted} />
      )}
    </div>
  );
};

export default AddPromotedProducts;
