import React, { useEffect, useState } from "react";
import axiosInstance from "../../api/axiosinstance";
import { toast } from "react-toastify";
import CategoryShimmer from '../../shimmer/CategoryShimmer.jsx'

const Category = ({ onSelectCategory, selectedCategorySlug }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    try {
      const response = await axiosInstance.get("categories/");
            
      setCategories(response.data.results || response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to load categories!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return (
    <div className="w-full md:w-40 p-4">
      
  {loading ? (
    <CategoryShimmer />
  ) : categories.length === 0 ? (
    <p className="text-center text-gray-500 text-lg mt-8">No categories found.</p>
  ) : (
    <div className="grid grid-cols-2 sm:grid-cols-36 md:grid-cols-1 gap-6">
      {
      
      categories.map(category => (
        <div
          key={category.id}
          onClick={() => onSelectCategory && onSelectCategory(category.slug)}
          // On md and up → card styling; on smaller → no border, no shadow
          className={`cursor-pointer overflow-hidden transition duration-300 ease-in-out transform hover:-translate-y-1
            ${selectedCategorySlug === category.slug ? "ring-4 ring-blue-500" : "ring-0"}
            md:border md:rounded-lg md:shadow-sm md:hover:shadow-md`}
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === "Enter") onSelectCategory && onSelectCategory(category.slug);
          }}
        >
          <img
            src={category.image_url || "/placeholder.png"}
            alt={category.name}
            className="w-full h-28 object-cover md:rounded-t-lg"
          />
          <div className="p-3 text-center font-semibold text-gray-800 truncate" title={category.name}>
            {category.name}
          </div>
        </div>
      ))}
    </div>
  )}
</div>



  );
};


export default Category;
