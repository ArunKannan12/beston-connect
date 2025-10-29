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
        console.error("failed to fetch banner", error);
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
        {/* Maintain aspect ratio and responsive height */}
        <div className="relative w-full aspect-[16/9] max-h-[60vh] sm:max-h-[50vh] md:max-h-[40vh] lg:max-h-[35vh] xl:max-h-[45vh] overflow-hidden">
          <img
            src={item.image_url}
            alt={item.title || "banner"}
            className="w-full h-full object-contain bg-white"
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex flex-col justify-end items-start text-white px-4 sm:px-6 md:px-12 lg:px-20 py-6">
            {item.title && (
              <h2 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2">
                {item.title}
              </h2>
            )}
            {item.subtitle && (
              <p className="text-sm sm:text-lg md:text-xl lg:text-2xl">
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
