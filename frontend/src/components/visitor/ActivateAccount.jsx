import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axiosInstance from "../../api/axiosinstance";
import LoadingScreen from "../helpers/LoadinScreen";

const ActivateAccount = () => {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const hasActivated = useRef(false); // prevent double execution

  useEffect(() => {
    if (hasActivated.current) return;

    const activateUser = async () => {
      try {
        const response = await axiosInstance.post("auth/users/activation/", {
          uid,
          token,
        });

        toast.dismiss();

        if (response.status === 204) {
          toast.success("✅ Account activated successfully!");
          // Wait 2 seconds before redirecting to login
          setTimeout(() => {
            navigate("/");
          }, 2000);
        } else {
          toast.error("⚠️ Unexpected server response.");
          setTimeout(() => {
            navigate("/signup");
          }, 2000);
        }
      } catch (error) {
        toast.dismiss();
        toast.error("❌ Activation failed. Please try again.");
        setTimeout(() => {
          navigate("/");
        }, 2000);
      }
    };

    activateUser();
    hasActivated.current = true;
  }, [uid, token, navigate]);

  return (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: '100vh' }}
    >
      <LoadingScreen/>
    </div>
  );
};

export default ActivateAccount;