import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axiosInstance from '../../api/axiosinstance';
import { toast } from 'react-toastify';
import ProductDetailShimmer from '../../shimmer/ProductDetailShimmer';
import { useAddToCartMutation, useGetCartQuery } from '../../contexts/cartSlice';
import { useAuth } from '../../contexts/authContext';
import VariantDropdown from '../helpers/VariantDropDown';

const ProductDetail = () => {
  const { productSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const [product, setProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [currentImg, setCurrentImg] = useState(0);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inCart,setInCart] = useState(false)

  const [addToCartMutation, { isLoading }] = useAddToCartMutation();
  const { refetch: refetchCart } = useGetCartQuery(undefined, { skip: !isAuthenticated });

  
  // 1️⃣ Fetch product & related products
useEffect(() => {
  const fetchProduct = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`products/${productSlug}/`);
      const data = res.data;
      setProduct(data);

      const relatedRes = await axiosInstance.get(`products/${productSlug}/related/`);
      setRelatedProducts(relatedRes.data.results || []);
    } catch (error) {
      console.error("Failed to load product", error);
      toast.error("Product not found");
      navigate("/store");
    } finally {
      setLoading(false);
    }
  };

  fetchProduct();
}, [productSlug, navigate]);

// 2️⃣ Update selected variant whenever URL changes or product loads
useEffect(() => {
  if (!product) return;

  const params = new URLSearchParams(location.search);
  const variantName = params.get("variant");

  // ---- Variant Selection Logic ----
  if (variantName) {
    const foundVariant = product.variants.find(
      v => v.variant_name === decodeURIComponent(variantName)
    );
    setSelectedVariant(foundVariant || product.variants[0]);
  } else if (product.variants?.length > 0) {
    setSelectedVariant(product.variants[0]);
  }

  // ---- Call Promoter Click API ----
  const referral_code = localStorage.getItem("referral_code");

  // Wait until selectedVariant is set
  if (referral_code && selectedVariant?.id) {
    axiosInstance.post("/promoter/click/", {
      referral_code,
      promoter_product_id: selectedVariant.id,
    })
    .then(res => console.log("Click tracked"))
    .catch(err => console.log("Click tracking failed", err));
  }

}, [product, location.search, selectedVariant]);


  // Quantity helpers
  const productQuantity = (task) => {
    const stock = selectedVariant?.stock ?? product?.stock ?? 0;
    setQuantity(q => {
      if (task === 'add') return q < stock ? q + 1 : q;
      if (task === 'sub') return q > 1 ? q - 1 : 1;
      return q;
    });
  };

  useEffect(() => {
  if (!selectedVariant?.id) return;
  if (!isAuthenticated) {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const found = cart.some(item => {
      return item.variant_id == selectedVariant.id;
    });
    setInCart(found);
  } else {
    refetchCart().then((res) => {
      const items = res?.data || []; // assuming res.data is the array directly
      const found = items.some(item => {
        return item.variant_id == selectedVariant.id;
      });
      setInCart(found);
    });
  }
}, [selectedVariant, isAuthenticated, refetchCart]);
  

  // Guest cart helper (localStorage)
 const addToLocalCart = (variantId, quantity) => {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];

    // ❌ DO NOT use sessionStorage referral here  
    //    Cart items should only take referral from URL when added
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref');   // Only take from URL

    const index = cart.findIndex(item => item.product_variant_id === variantId);

    if (index > -1) {
      cart[index].quantity += quantity;
      if (ref) cart[index].referral_code = ref; // update only if URL has ref
    } else {
      cart.push({
        product_variant_id: variantId,
        quantity,
        source: "add_to_cart",
        referral_code: ref || null, // URL-only
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));
    toast.success("Added to cart");
  };


  // Add to cart
  const addToCart = async (variantId) => {
    if (!variantId) return toast.error("No variant selected");

    const params = new URLSearchParams(location.search);
    const ref = params.get("ref");

    if (!isAuthenticated) {
      addToLocalCart(variantId, quantity);
      return;
    }

    try {
      await addToCartMutation({ product_variant_id: variantId, quantity,...(ref ? { referral_code: ref } : {})  }).unwrap();
      toast.success("Added to cart");
      refetchCart();
    } catch (error) {
      const variantError = error?.data?.product_variant?.[0];
      toast.error(variantError || error?.data?.detail || "Failed to add to cart");
    }
  };

const handleBuyNow = () => {
  if (!selectedVariant) return toast.error("Select a variant first");

  const params = new URLSearchParams(location.search);
  const ref = params.get('ref');

  const minimalPayload = [{
    product_variant_id: selectedVariant.id,
    quantity,
    source: "buy_now",
    timestamp: Date.now(),
    referral_code: ref || null,
  }];

  console.log("[DEBUG BuyNow] minimalPayload to store:", minimalPayload);

  sessionStorage.setItem("buyNowMinimal", JSON.stringify(minimalPayload));
  sessionStorage.setItem("BUY_NOW_ACTIVE", "true"); // ✅ important

  if (ref) {
    sessionStorage.setItem('referral_code',ref)
  }
  const checkoutUrl = "/checkout";
 
  
  if (!isAuthenticated) {
    navigate("/login", { state: { from: "/checkout" } });
  } else {
    navigate(checkoutUrl);
  }
};


  if (loading || !product) return <ProductDetailShimmer />;

  const variantImageUrls =
  selectedVariant?.images?.length > 0
    ? selectedVariant.images.map(img => img.image_url) // use image_url from API
    : product?.image_url
      ? [product.image_url] // fallback to main product image
      : [];


  // 🟢 Price & discount logic
  const basePrice = Number(selectedVariant?.base_price || 0);
  const finalPrice = Number(selectedVariant?.final_price || basePrice);
  const discount =
    basePrice > 0 && finalPrice < basePrice
      ? Math.round(((basePrice - finalPrice) / basePrice) * 100)
      : 0;


  return (
    <div className="p-6">
  <div className="flex flex-col md:flex-row gap-10 w-full px-4 lg:px-12">
    {/* Images */}
    <div className="w-full md:w-2/3">
      {variantImageUrls.length > 0 ? (
        <>
          <div className="w-full h-[400px] sm:h-[550px] lg:h-[750px] flex items-center justify-center bg-white border-none rounded-xl shadow-sm overflow-hidden">
            <img
              src={variantImageUrls[currentImg] || product.image_url || "/placeholder.png"}
              alt={selectedVariant?.variant_name || product?.name}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Thumbnails */}
          <div className="flex gap-3 mt-4 overflow-x-auto">
            {variantImageUrls.map((imgUrl, idx) => (
              <div
                key={idx}
                className={`min-w-[70px] sm:min-w-[90px] lg:min-w-[110px] h-[70px] sm:h-[90px] lg:h-[110px] flex items-center justify-center rounded-md border cursor-pointer ${idx === currentImg ? "border-blue-500" : "border-gray-300"} bg-gray-100`}
                onClick={() => setCurrentImg(idx)}
              >
                <img
                  src={imgUrl || product.image_url || "/placeholder.png"}
                  alt=""
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="w-full h-[400px] sm:h-[550px] lg:h-[750px] bg-gray-200 flex items-center justify-center text-gray-400 rounded-xl">
          No Image Available
        </div>
      )}
    </div>

    {/* Details */}
    <div className="w-full md:w-1/3 space-y-4">
      <h1 className="text-3xl font-bold capitalize">{product.name}</h1>
      <p className="text-sm text-gray-500">
        Category: <span className="font-medium">{product.category?.name}</span>
      </p>

      {/* Price + Discount */}
      <div className="flex items-center gap-3">
        <p className="text-2xl font-bold text-green-700">₹{finalPrice}</p>
        {discount > 0 && (
          <>
            <p className="text-lg text-gray-500 line-through">₹{basePrice}</p>
            <span className="bg-red-100 text-red-600 text-sm font-semibold px-2 py-1 rounded-md">
              {discount}% OFF
            </span>
          </>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1">
        {selectedVariant?.description?.trim() ? (
          <>
            <span className="font-semibold text-gray-900">About this variant:</span>
            <p className="text-gray-700">{selectedVariant.description}</p>
          </>
        ) : (
          <>
            <span className="font-semibold text-gray-900">About this product:</span>
            <p className="text-gray-700">{product.description}</p>
          </>
        )}
      </div>

      {/* Variant selector */}
      {(product.variants?.length > 1 ||
        (product.variants?.length === 1 && product.variants[0]?.variant_name?.toLowerCase() !== 'default')) && (
        <div>
          <label className="block font-semibold mb-2">Select Variant:</label>
          <VariantDropdown
            product={product}
            selectedVariant={selectedVariant}
            setSelectedVariant={setSelectedVariant}
            setQuantity={setQuantity}
            setCurrentImg={setCurrentImg}
          />
        </div>
      )}

      {/* Stock / Quantity / Cart Buttons */}
      {selectedVariant?.stock > 0 ? (
        <>
          {/* Quantity controls */}
          <div className="flex items-center space-x-4 mt-4">
            <button
              onClick={() => productQuantity('sub')}
              disabled={quantity <= 1}
              className="w-10 h-10 flex justify-center items-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              -
            </button>
            <span className="min-w-[30px] text-center text-lg font-medium">{quantity}</span>
            <button
              onClick={() => productQuantity('add')}
              disabled={quantity >= selectedVariant.stock}
              className="w-10 h-10 flex justify-center items-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              +
            </button>
          </div>

          {/* Add to Cart / Buy Now */}
          <div className="flex gap-4 mt-6">
            {inCart ? (
              <button
                onClick={() => navigate("/cart")}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                Go to Cart
              </button>
            ) : (
              <button
                onClick={() => addToCart(selectedVariant?.id)}
                disabled={isLoading || !selectedVariant}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Adding..." : "Add to Cart"}
              </button>
            )}

            <button
              onClick={handleBuyNow}
              disabled={!selectedVariant}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Buy Now
            </button>
          </div>
        </>
      ) : (
        <p className="text-red-600 font-bold mt-2">Out of Stock</p>
      )}

      {/* Return & Replacement Info */}
      {selectedVariant && (
        <div className="mt-6 bg-gray-50 border rounded-xl p-4 sm:p-5 text-sm text-gray-700 space-y-2">
          <h3 className="text-base font-semibold text-gray-800 mb-2">Return & Replacement Policy</h3>
          
          {/* ✅ Both return & replacement available */}
          {selectedVariant.allow_return && selectedVariant.allow_replacement && (
            <ul className="list-disc list-inside space-y-1">
              <li>
                <span className="font-medium text-gray-900">Return available:</span> within {selectedVariant.return_days} days of delivery
              </li>
              <li>
                <span className="font-medium text-gray-900">Replacement available:</span> within {selectedVariant.replacement_days} days of delivery
              </li>
            </ul>
          )}

          {/* ✅ Only return available */}
          {selectedVariant.allow_return && !selectedVariant.allow_replacement && (
            <p className="text-gray-700">
              <span className="font-medium">Return available:</span> within {selectedVariant.return_days} days of delivery. <br />
              <span className="text-red-500 font-semibold">Replacement is not available for this product.</span>
            </p>
          )}

          {/* ✅ Only replacement available */}
          {!selectedVariant.allow_return && selectedVariant.allow_replacement && (
            <p className="text-gray-700">
              <span className="font-medium">Replacement available:</span> within {selectedVariant.replacement_days} days of delivery. <br />
              <span className="text-red-500 font-semibold">Return is not available for this product.</span>
            </p>
          )}

          {/* ✅ Neither return nor replacement */}
          {!selectedVariant.allow_return && !selectedVariant.allow_replacement && (
            <p className="text-red-500 font-semibold">Return and Replacement are not available for this product.</p>
          )}

          <p className="text-xs text-gray-500 mt-2">
            Please ensure the item is unused and in original packaging to be eligible.
          </p>
        </div>
      )}



    </div>
  </div>

  {/* Related Products */}
  <div className="mt-8 px-4 sm:px-6 lg:px-12">
  <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">Related Products</h2>

  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
    {relatedProducts.map((rp) => {
      const minBasePrice = rp.variants?.length
        ? Math.min(...rp.variants.map(v => parseFloat(v.base_price)))
        : null;
      const minOfferPrice = rp.variants?.length
        ? Math.min(...rp.variants.map(v => parseFloat(v.final_price)))
        : null;
      const discount =
        minBasePrice && minOfferPrice
          ? Math.round(((minBasePrice - minOfferPrice) / minBasePrice) * 100)
          : 0;

      return (
        <div
          key={rp.id}
          className="group relative bg-white border rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer flex flex-col"
          onClick={() => {
            const variantName = encodeURIComponent(rp.variants[0]?.variant_name || '');
            navigate(`/products/${rp.slug}/?variant=${variantName}`);
          }}
        >
          <div className="w-full aspect-[4/3] flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
            {rp.variants?.[0]?.images?.[0]?.image_url ? (
              <img
                src={rp.variants[0].images[0].image_url}
                alt={rp.name}
                className="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-300"
              />
            ) : rp.image_url ? (
              <img
                src={rp.image_url}
                alt={rp.name}
                className="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="text-gray-400 text-center w-full">No Image</div>
            )}
          </div>

          <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
            <h3 className="text-sm sm:text-base font-semibold text-gray-800 group-hover:text-[#155dfc] truncate">
              {rp.name}
            </h3>

            {minOfferPrice !== null && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className="text-base sm:text-lg font-bold text-green-700">
                  ₹{minOfferPrice}
                </p>

                {minBasePrice && minBasePrice > minOfferPrice && (
                  <>
                    <p className="text-sm text-gray-500 line-through">
                      ₹{minBasePrice}
                    </p>
                    <span className="text-sm font-semibold text-red-600 whitespace-nowrap">
                      {discount}% OFF
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      );
    })}
  </div>

  {/* Add bottom spacer for mobile so last row isn't hidden */}
  <div className="h-[100px] sm:hidden"></div>
</div>


</div>

  );
};

export default ProductDetail;
