import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import axiosInstance from "../../api/axiosinstance";

const VerifyEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Retrieve email from location.state or localStorage fallback
  const preFilledEmail = location.state?.email || localStorage.getItem("pendingEmail") || "";
  const [email, setEmail] = useState(preFilledEmail);
  const [loading, setLoading] = useState(false);

  // Redirect if no email is available
  useEffect(() => {
    if (!preFilledEmail) {
      toast.error("Email not found. Please sign up again.");
      navigate('/login', { state: { mode: 'signup' } });
    }
  }, [preFilledEmail, navigate]);

  const handleResend = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.post("auth/resend-activation/", { email });
      toast.success("Activation email resent successfully!");
    } catch (error) {
      console.error("Resend activation error:", error.response ? error.response.data : error.message);
      toast.error(error.response?.data?.detail || "Failed to resend activation email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-20">
      <div className="flex justify-center">
        <div className="w-full sm:w-10/12 md:w-2/3 lg:w-1/3">
          <div className="text-center bg-white p-6 rounded shadow">
            <h4 className="mb-4 text-blue-600 text-xl font-semibold">Email Verification</h4>
            <p className="mb-6 text-gray-700">Please check your inbox for an activation email.</p>

            <input
              type="email"
              className="mb-4 w-full px-4 py-2 border border-gray-300 rounded bg-gray-100 cursor-not-allowed"
              placeholder="Enter your email"
              value={email}
              disabled
              readOnly
            />

            <button
              onClick={handleResend}
              disabled={loading}
              className={`w-full mb-4 bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {loading ? "Resending..." : "Resend Activation Email"}
            </button>

            <p className="mb-0 text-gray-600">
              Back to{" "}
              <span
                className="text-blue-600 underline cursor-pointer"
                onClick={() => navigate("/")}
              >
                Login
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;