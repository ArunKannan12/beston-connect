import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { useNavigate, useLocation } from "react-router-dom";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaUser } from "react-icons/fa";
import GoogleAuth from "./GoogleAuth";
import axiosInstance from "../../api/axiosinstance";
import { useAuth } from "../../contexts/authContext";
import { AnimatePresence, motion } from "framer-motion";
import Lottie from "lottie-react";
import ShoppingCart from "../../../ShoppingCart.json";

const LoginAndSignup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const inputFocus = useRef(null);
  const [showPassword, setShowPassword] = useState({
    password: false,
    re_password: false,
  });
  // Login state
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [loginErrors, setLoginErrors] = useState({});
  const [rememberMe, setRememberMe] = useState(false);

  // Signup state
  const [signupData, setSignupData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    password: "",
    re_password: "",
  });
  const [signupErrors, setSignupErrors] = useState({});

  // Toggle password visibility
  const togglePassword = (field) =>
  setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));

  /*** LOGIN FUNCTIONS ***/
  const handleLoginChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
    setLoginErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const validateLogin = () => {
    const errors = {};
    if (!loginData.email.trim()) errors.email = "Email is required";
    if (!loginData.password.trim()) errors.password = "Password is required";
    return errors;
  };

  const handleLoginSubmit = async (e) => {
    console.log("Login page state:", location.state);
    e.preventDefault();
    const errors = validateLogin();
    if (Object.keys(errors).length > 0) {
      setLoginErrors(errors);
      return;
    }

    try {
      setLoading(true);
      const redirectFrom = location.state?.from || "/";
      const res = await login(loginData, null, redirectFrom,navigate);

      if (res.success) {
        toast.success("Login successful");
        navigate(res.from, { replace: true });
      } else if (res.reason === "unverified") {
        navigate("/verify-email", { state: { email: res.email } });
      } else if (res.reason === "inactive") {
        toast.info("Your account is inactive. Contact support.");
      }
    } catch (err) {
      const backendMessage =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "❌ Login failed. Please check your credentials.";
      toast.error(backendMessage);
    } finally {
      setLoading(false);
    }
  };

  /*** SIGNUP FUNCTIONS ***/
  const handleSignupChange = (e) => {
    const { name, value } = e.target;
    setSignupData((prev) => ({ ...prev, [name]: value }));

    setSignupErrors((prev) => {
      const newErrors = { ...prev };

      switch (name) {
        case "email":
          if (!value) newErrors.email = "Email is required";
          else if (!/\S+@\S+\.\S+/.test(value)) newErrors.email = "Invalid email format";
          else delete newErrors.email;
          break;

        case "first_name":
          if (!value) newErrors.first_name = "First name is required";
          else delete newErrors.first_name;
          break;

        case "last_name":
          if (!value) newErrors.last_name = "Last name is required";
          else delete newErrors.last_name;
          break;

        case "password":
          if (!value) newErrors.password = "Password is required";
          else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(value))
            newErrors.password = "Password must be 8+ chars, uppercase, lowercase, number & special char.";
          else delete newErrors.password;

          // Live confirm password check
          if (signupData.re_password && value !== signupData.re_password)
            newErrors.re_password = "Passwords do not match";
          else if (signupData.re_password) delete newErrors.re_password;

          break;

        case "re_password":
          if (!value) newErrors.re_password = "Confirm your password";
          else if (value !== signupData.password) newErrors.re_password = "Passwords do not match";
          else delete newErrors.re_password;
          break;

        default:
          break;
      }

      return newErrors;
    });
  };


  const validateSignup = () => {
    const errors = {};
    const { email, first_name, last_name, password, re_password } = signupData;

    if (!email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Invalid email format";

    if (!first_name.trim()) errors.first_name = "First name is required";
    if (!last_name.trim()) errors.last_name = "Last name is required";

    if (!password.trim()) errors.password = "Password is required";
    else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(password))
      errors.password = "Password must be 8+ chars, uppercase, lowercase, number & special char.";

    if (!re_password.trim()) errors.re_password = "Confirm password is required";
    else if (password !== re_password) errors.re_password = "Passwords do not match";

    return errors;
  };
  const payload = {
    first_name: signupData.first_name.trim(),
    last_name: signupData.last_name.trim(),
    email: signupData.email.trim(),
    password: signupData.password,
    re_password: signupData.re_password,
  };


const handleSignupSubmit = async (e) => {
  e.preventDefault();
  const errors = validateSignup();
  if (Object.keys(errors).length > 0) {
    setSignupErrors(errors);
    return;
  }

  try {
    setLoading(true);
    console.log("🟢 Sending signup payload:", payload);

    const res = await axiosInstance.post("auth/users/", payload);
    console.log("✅ Signup Response:", res);

    const { needs_activation, email, message } = res.data || {};
    console.log("📦 Extracted Data:", { needs_activation, email, message });

    // Always store API message in state
    setSignupErrors((prev) => ({ ...prev, api: message || "" }));

    if (res.status === 201) {
      console.log("🎉 Signup success response with status 201");

      // ✅ Use backend message directly in toast
      if (message) toast.success(message);

      if (needs_activation) {
        const from = location.state?.from || "/";
        // Slight delay so toast is visible before navigation (optional)
        setTimeout(() => {
          navigate("/verify-email", { state: { email, from } });
        }, 1000);
      } else {
        navigate("/");
      }
    } else {
      console.warn("⚠️ Unexpected response status:", res.status);
      toast.warn("Unexpected response from server.");
    }

  } catch (err) {
    console.error("❌ Signup error caught:", err);

    if (err.response?.data) {
      const data = err.response.data;
      console.log("🔴 Backend error data:", data);

      // ✅ Show backend message if exists
      if (data.message) {
        toast.error(data.message);
        setSignupErrors((prev) => ({ ...prev, api: data.message }));
      }

      if (data?.needs_activation) {
        // Some backends may still send this
        setTimeout(() => {
          navigate("/verify-email", { state: { email: payload.email } });
        }, 1000);
        return;
      }

      // Field-level validation errors
      const apiErrors = {};
      for (const key in data) {
        if (!["message", "needs_activation"].includes(key)) {
          apiErrors[key] = Array.isArray(data[key]) ? data[key][0] : data[key];
        }
      }
      console.log("🧾 Parsed field errors:", apiErrors);
      setSignupErrors((prev) => ({ ...prev, ...apiErrors }));

    } else {
      console.error("🚨 Unknown signup error (no response data)");
      toast.error("Registration failed. Please try again later.");
      setSignupErrors({ api: "Registration failed. Please try again later." });
    }
  } finally {
    setLoading(false);
  }
};


  // Focus input and redirect if authenticated
  useEffect(() => {
    inputFocus.current?.focus();
    if (isAuthenticated) {
      const from = location.state?.from || "/";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 85%)' }}></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-300 rounded-full filter blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-300 rounded-full filter blur-3xl opacity-20"></div>
      </div>

      <div className="relative min-h-screen flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center"
        >
          {/* Left Side - Branding */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden lg:block text-center space-y-8"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl transform rotate-3 opacity-20"></div>
              <div className="relative bg-white/80 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20">
                <Lottie animationData={ShoppingCart} loop className="w-64 h-64 mx-auto" />
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
                  Beston Connect
                </h1>
                <p className="text-gray-600 text-lg mb-6">Your Premium Shopping Experience</p>
                
                <div className="space-y-4 text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white">
                      ✓
                    </div>
                    <span className="text-gray-700">Premium Quality Products</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white">
                      ✓
                    </div>
                    <span className="text-gray-700">Fast & Secure Delivery</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white">
                      ✓
                    </div>
                    <span className="text-gray-700">24/7 Customer Support</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Side - Login/Signup Form */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="w-full max-w-md mx-auto"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl transform -rotate-2 opacity-10"></div>
              <div className="relative bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8">
                {/* Header */}
                <div className="text-center mb-8">
                  <motion.div
                    key={isLogin ? "login" : "signup"}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                      {isLogin ? "Welcome Back" : "Create Account"}
                    </h2>
                    <p className="text-gray-600">
                      {isLogin ? "Sign in to continue your shopping journey" : "Join us and start your shopping experience"}
                    </p>
                  </motion.div>
                </div>

                {/* Toggle Tabs */}
                <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
                  <button
                    onClick={() => setIsLogin(true)}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                      isLogin 
                        ? "bg-white text-purple-600 shadow-md" 
                        : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setIsLogin(false)}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                      !isLogin 
                        ? "bg-white text-purple-600 shadow-md" 
                        : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    Sign Up
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {isLogin ? (
                    <motion.form
                      key="login"
                      onSubmit={handleLoginSubmit}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      {/* Email */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Email Address</label>
                        <div className="relative">
                          <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            ref={inputFocus}
                            type="email"
                            name="email"
                            value={loginData.email}
                            onChange={handleLoginChange}
                            placeholder="Enter your email"
                            className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
                              loginErrors.email ? "border-red-500 bg-red-50" : "border-gray-200 hover:border-gray-300"
                            }`}
                          />
                          {loginErrors.email && (
                            <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                              <span className="text-xs">⚠️</span> {loginErrors.email}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Password */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Password</label>
                        <div className="relative">
                          <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type={showPassword.password ? "text" : "password"}
                            name="password"
                            value={loginData.password}
                            onChange={handleLoginChange}
                            placeholder="Enter your password"
                            className={`w-full pl-10 pr-12 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
                              loginErrors.password ? "border-red-500 bg-red-50" : "border-gray-200 hover:border-gray-300"
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => togglePassword('password')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            {showPassword.password ? <FaEyeSlash /> : <FaEye />}
                          </button>
                          {loginErrors.password && (
                            <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                              <span className="text-xs">⚠️</span> {loginErrors.password}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Remember Me & Forgot Password */}
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={() => setRememberMe(!rememberMe)}
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <span className="text-sm text-gray-700">Remember me</span>
                        </label>
                        <a href="/forgot-password" className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                          Forgot password?
                        </a>
                      </div>

                      {/* Submit Button */}
                      <motion.button
                        type="submit"
                        disabled={loading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Signing in...
                          </span>
                        ) : (
                          "Sign In"
                        )}
                      </motion.button>
                    </motion.form>
                  ) : (
                    <motion.form
                      key="signup"
                      onSubmit={handleSignupSubmit}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      {/* Email */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Email Address</label>
                        <div className="relative">
                          <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type="email"
                            name="email"
                            value={signupData.email}
                            onChange={handleSignupChange}
                            placeholder="Enter your email"
                            className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
                              signupErrors.email ? "border-red-500 bg-red-50" : "border-gray-200 hover:border-gray-300"
                            }`}
                          />
                          {signupErrors.email && (
                            <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                              <span className="text-xs">⚠️</span> {signupErrors.email}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Name Fields */}
                      <div className="grid grid-cols-2 gap-4">
                        {["first_name", "last_name"].map((field) => (
                          <div key={field} className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                              {field === "first_name" ? "First Name" : "Last Name"}
                            </label>
                            <div className="relative">
                              <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                              <input
                                type="text"
                                name={field}
                                value={signupData[field]}
                                onChange={handleSignupChange}
                                placeholder={field === "first_name" ? "First name" : "Last name"}
                                className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
                                  signupErrors[field] ? "border-red-500 bg-red-50" : "border-gray-200 hover:border-gray-300"
                                }`}
                              />
                              {signupErrors[field] && (
                                <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                                  <span className="text-xs">⚠️</span> {signupErrors[field]}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Password */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Password</label>
                        <div className="relative">
                          <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type={showPassword.password ? "text" : "password"}
                            name="password"
                            value={signupData.password}
                            onChange={handleSignupChange}
                            placeholder="Create a strong password"
                            className={`w-full pl-10 pr-12 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
                              signupErrors.password ? "border-red-500 bg-red-50" : "border-gray-200 hover:border-gray-300"
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => togglePassword('password')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            {showPassword.password ? <FaEyeSlash /> : <FaEye />}
                          </button>
                          {signupErrors.password && (
                            <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                              <span className="text-xs">⚠️</span> {signupErrors.password}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Confirm Password */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Confirm Password</label>
                        <div className="relative">
                          <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type={showPassword.re_password ? "text" : "password"}
                            name="re_password"
                            value={signupData.re_password}
                            onChange={handleSignupChange}
                            placeholder="Confirm your password"
                            className={`w-full pl-10 pr-12 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
                              signupErrors.re_password ? "border-red-500 bg-red-50" : "border-gray-200 hover:border-gray-300"
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => togglePassword('re_password')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            {showPassword.re_password ? <FaEyeSlash /> : <FaEye />}
                          </button>
                          {signupErrors.re_password && (
                            <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                              <span className="text-xs">⚠️</span> {signupErrors.re_password}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* API Error */}
                      {signupErrors.api && (
                        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl text-sm">
                          {signupErrors.api}
                        </div>
                      )}

                      {/* Submit Button */}
                      <motion.button
                        type="submit"
                        disabled={loading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Creating account...
                          </span>
                        ) : (
                          "Create Account"
                        )}
                      </motion.button>
                    </motion.form>
                  )}
                </AnimatePresence>

                {/* Social Login */}
                <div className="mt-8">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500">Or continue with</span>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-center">
                    <GoogleAuth />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginAndSignup;
