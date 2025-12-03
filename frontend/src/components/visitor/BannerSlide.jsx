import React, { useEffect, useState } from "react";
import Slider from "react-slick";
import axiosInstance from "../../api/axiosinstance";

export default function BannerSlider() {
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const res = await axiosInstance.get("banner/active");
        setBanners(res.data.results);
      } catch (error) {
        console.error("Failed to fetch banner", error);
      }
    };
    fetchBanners();
  }, []);

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    autoplay: true,
    autoplaySpeed: 4000,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
  };

  return (
    <div className="w-full">
      <Slider {...settings}>
        {banners.map((item) => (
          <div key={item.id} className="relative w-full">
            {/* Responsive height for different screens */}
            <div className="relative w-full h-[200px] sm:h-[300px] md:h-[400px] lg:h-[500px] xl:h-[600px] overflow-hidden">
              <img
                src={item.image_url}
                alt={item.title || "banner"}
                className="w-full h-full object-cover"
              />

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex flex-col justify-end items-start text-white px-4 sm:px-6 md:px-12 lg:px-20 py-6">
                {item.title && (
                  <h2 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-2">
                    {item.title}
                  </h2>
                )}
                {item.subtitle && (
                  <p className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl">
                    {item.subtitle}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
}
