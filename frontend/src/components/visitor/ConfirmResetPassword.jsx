import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import axiosInstance from '../../api/axiosinstance';
import { useAuth } from '../../contexts/authContext';

const ConfirmResetPassword = () => {
  const { uid, token } = useParams();
  const navigate = useNavigate();
 const {login} = useAuth()
  const [formData, setFormData] = useState({
    new_password: '',
    re_new_password: '',
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { new_password, re_new_password } = formData;

  const handleOnChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOnSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axiosInstance.post('auth/users/reset_password_confirm/', {
        uid,
        token,
        new_password,
        re_new_password,
      });
      const email = localStorage.getItem('reset_email')
      if (email) {
        await login({email,password:new_password})
        toast.success('password reset & login successfull')
        localStorage.removeItem('reset_email')
        navigate('/');
      }else{
        toast.success('Password reset successful.Please log in');
        navigate('/login')

      }
    } catch (error) {
      console.error(error);
      const errMsg =
        error?.response?.data?.new_password?.[0] ||
        error?.response?.data?.non_field_errors?.[0] ||
        'Reset failed. Please try again.';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-[80px] px-4 bg-gray-100 min-h-screen">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6 mx-auto">
        <h2 className="text-2xl font-semibold text-center text-blue-600 mb-6">
          Reset Password
        </h2>
        <form onSubmit={handleOnSubmit} className="space-y-4">
          {/* New Password */}
          <div>
            <label
              htmlFor="new_password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              New Password
            </label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                name="new_password"
                id="new_password"
                placeholder="Enter your new password"
                value={new_password}
                onChange={handleOnChange}
                disabled={loading}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
                className="absolute right-3 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="re_new_password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Confirm Password
            </label>
            <div className="relative flex items-center">
              <input
                type={showConfirm ? 'text' : 'password'}
                name="re_new_password"
                id="re_new_password"
                placeholder="Confirm your new password"
                value={re_new_password}
                onChange={handleOnChange}
                disabled={loading}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((prev) => !prev)}
                tabIndex={-1}
                className="absolute right-3 text-gray-500 hover:text-gray-700"
              >
                {showConfirm ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 text-white rounded-md transition ${
              loading
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Resetting password...
              </span>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ConfirmResetPassword;