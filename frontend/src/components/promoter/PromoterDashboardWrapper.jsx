import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axiosinstance";

const PromoterDashboardWrapper = () => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [error,setError] = useState('')

  useEffect(() => {
    let isMounted = true;

    const fetchPromoter = async () => {
      try {
        const res = await axiosInstance.get("promoters/me/");
        if(!isMounted) return;

        const promoterType = res.data.promoter_profile?.promoter_type; // "paid" or "unpaid"
        console.log(res.data,'data');
        
        if (promoterType === "paid") {
          navigate("/promoter/dashboard/paid", { replace: true });
        } else if (promoterType === "unpaid") {
          navigate("/promoter/dashboard/unpaid", { replace: true });
        } else {
          console.error("Unknown promoter type:", promoterType);
        }
      } catch (error) {
        console.error("Error fetching promoter data:", error);
        if(!isMounted) return;

        if (error.response?.status === 404 || error.response?.status === 403){
          setError('you are not a registered promoter.')
          setTimeout(() => {
            navigate('/become-a-promoter',{replace:true})
          }, 2000);
        }else{
          setError("failed to load dashboard. Please try again later.")
        }
      } finally {
        if(isMounted) setLoading(false);
      }
    };

    fetchPromoter();

    return ()=>{
      isMounted=false
    }
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-500">
        Loading promoter dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen text-red-500 text-lg font-medium">
        {error}
      </div>
    );
  }

  return null; // No need to render anything because redirect happens
};

export default PromoterDashboardWrapper;
