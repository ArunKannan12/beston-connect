import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { useNavigate, useLocation } from "react-router-dom";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaUser } from "react-icons/fa";
import GoogleAuth from "./GoogleAuth";
import FacebookAuth from "./FacebookAuth";
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
    e.preventDefault();
    const errors = validateLogin();
    if (Object.keys(errors).length > 0) {
      setLoginErrors(errors);
      return;
    }

    try {
      setLoading(true);
      const redirectFrom = location.state?.from || "/";
      const res = await login(loginData, null, redirectFrom);

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
      const res = await axiosInstance.post("auth/users/", payload);
      if (res.status === 201) {
        toast.success("Registration successful! Please check your email to verify.");
        setSignupErrors({});
        const from = location.state?.from || "/";
        setTimeout(() => navigate("/verify-email", { state: { email: signupData.email, from } }), 200);
      }
    } catch (err) {
      console.log(err);
      
      if (err.response?.data) {
        const apiErrors = {};
        for (const key in err.response.data) {
          apiErrors[key] = Array.isArray(err.response.data[key])
            ? err.response.data[key][0]
            : err.response.data[key];
        }
        setSignupErrors(apiErrors);
      } else setSignupErrors({ api: "Registration failed. Please try again later." });
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 grid grid-cols-1 lg:grid-cols-2">
      {/* Left Section */}
      <div className="hidden lg:flex items-center justify-center bg-gradient-to-tr from-indigo-500 to-blue-600 text-white p-12">
        <div className="max-w-md text-center space-y-6">
          <Lottie animationData={ShoppingCart} loop className="w-80 mx-auto" />
          <h1 className="text-4xl font-extrabold">Welcome to Beston Connect</h1>
          <p className="text-lg opacity-90">Shop smarter. Live better.</p>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-start lg:items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md sm:max-w-lg md:max-w-xl bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-gray-200 p-6 sm:p-8 overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 3rem)" }}
        >
          <h2 className="text-3xl font-extrabold text-center text-gray-900 mb-2">
            {isLogin ? "Welcome Back 👋" : "Create Account 🚀"}
          </h2>
          <p className="text-center text-gray-500 mb-6">
            {isLogin ? "Login to continue shopping" : "Join us and start shopping today"}
          </p>

          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.form
                key="login"
                onSubmit={handleLoginSubmit}
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -50, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {/* Email */}
                <div className="relative">
                  <FaEnvelope className="absolute left-3 top-3 text-gray-400" />
                  <input
                    ref={inputFocus}
                    type="email"
                    name="email"
                    value={loginData.email}
                    onChange={handleLoginChange}
                    placeholder="Email"
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      loginErrors.email ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {loginErrors.email && (
                    <p className="text-sm text-red-500 mt-1">{loginErrors.email}</p>
                  )}
                </div>

                {/* Password */}
                <div className="relative">
                  <FaLock className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type={showPassword.password ? "text" : "password"}
                    name="password"
                    value={loginData.password}
                    onChange={handleLoginChange}
                    placeholder="Password"
                    className={`w-full pl-10 pr-10 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      loginErrors.password ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  <span
                    onClick={()=>togglePassword('password')}
                    className="absolute right-3 top-3 text-gray-500 cursor-pointer"
                  >
                    {showPassword.password ? <FaEyeSlash /> : <FaEye />}
                  </span>
                  {loginErrors.password && (
                    <p className="text-sm text-red-500 mt-1">{loginErrors.password}</p>
                  )}
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={() => setRememberMe(!rememberMe)}
                      className="accent-blue-600"
                    />
                    Remember Me
                  </label>
                  <a href="/forgot-password" className="text-blue-600 hover:underline font-medium">
                    Forgot Password?
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 rounded-xl font-semibold shadow hover:opacity-90 transition"
                >
                  {loading ? "Logging in..." : "Login"}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="signup"
                onSubmit={handleSignupSubmit}
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -50, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {/* Email */}
                <div className="relative">
                  <FaEnvelope className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={signupData.email}
                    onChange={handleSignupChange}
                    placeholder="Email"
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 ${
                      signupErrors.email ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {signupErrors.email && (
                    <p className="text-sm text-red-500 mt-1">{signupErrors.email}</p>
                  )}
                </div>

                {/* First & Last Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {["first_name", "last_name"].map((field) => (
                    <div key={field} className="relative">
                      <FaUser className="absolute left-3 top-3 text-gray-400" />
                      <input
                        type="text"
                        name={field}
                        value={signupData[field]}
                        onChange={handleSignupChange}
                        placeholder={field === "first_name" ? "First Name" : "Last Name"}
                        className={`w-full pl-10 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 ${
                          signupErrors[field] ? "border-red-500" : "border-gray-300"
                        }`}
                      />
                      {signupErrors[field] && (
                        <p className="text-sm text-red-500 mt-1">{signupErrors[field]}</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Password */}
                <div className="relative">
                  <FaLock className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type={showPassword.password ? "text" : "password"}
                    name="password"
                    value={signupData.password}
                    onChange={handleSignupChange}
                    placeholder="Password"
                    className={`w-full pl-10 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 ${
                      signupErrors.password ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  <span
                    onClick={() => togglePassword('password')}
                    className="absolute right-3 top-3 text-gray-500 cursor-pointer"
                  >
                    {showPassword.password ? <FaEyeSlash /> : <FaEye />}
                  </span>
                  {signupErrors.password && (
                    <p className="text-sm text-red-500 mt-1">{signupErrors.password}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="relative">
                  <FaLock className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type={showPassword.re_password ? "text" : "password"}
                    name="re_password"
                    value={signupData.re_password}
                    onChange={handleSignupChange}
                    placeholder="Confirm Password"
                    className={`w-full pl-10 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 ${
                      signupErrors.re_password ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  <span
                    onClick={() => togglePassword('re_password')}
                    className="absolute right-3 top-3 text-gray-500 cursor-pointer"
                  >
                    {showPassword.re_password ? <FaEyeSlash /> : <FaEye />}
                  </span>
                  {signupErrors.re_password && (
                    <p className="text-sm text-red-500 mt-1">{signupErrors.re_password}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 rounded-xl font-semibold shadow hover:opacity-90 transition"
                >
                  {loading ? "Registering..." : "Register"}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Divider */}
          <div className="flex items-center my-5">
            <hr className="flex-grow border-gray-300" />
            <span className="px-3 text-gray-400 text-sm">or continue with</span>
            <hr className="flex-grow border-gray-300" />
          </div>

          {/* Social Auth */}
          <div className="flex justify-center w-full px-4 sm:px-0 space-x-4">
            <GoogleAuth />
           
          </div>

          {/* Toggle Login/Signup */}
          <p className="text-center text-gray-600 mt-6">
            {isLogin ? "Don’t have an account?" : "Already have an account?"}{" "}
            <span
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 font-semibold cursor-pointer hover:underline"
            >
              {isLogin ? "Sign Up" : "Login"}
            </span>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginAndSignup;
