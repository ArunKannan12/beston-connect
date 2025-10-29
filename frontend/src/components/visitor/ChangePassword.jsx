import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosinstance';

const ChangePassword = () => {
  const [form, setForm] = useState({
    current_password: '',
    new_password: '',
    re_new_password: ''
  });

  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const [loading, setLoading] = useState(false);
  const [backLoading, setBackLoading] = useState(false);
  const navigate = useNavigate();

  const toggleVisibility = (field) => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.new_password !== form.re_new_password) {
      toast.error("New password does not match");
      return;
    }

    setLoading(true);

    try {
      await axiosInstance.post('auth/users/set_password/', form);
      toast.success("Password reset successful");
      navigate('/');
    } catch (error) {
      const data = error.response?.data || {};
      const errorMsg =
        data.current_password?.[0] ||
        data.new_password?.[0] ||
        data.re_new_password?.[0] ||
        'Password reset failed';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleBackClick = () => {
    setBackLoading(true);
    setTimeout(() => navigate('/'), 500);
  };

  return (
    <div className="flex justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <h4 className="text-center text-2xl font-bold mb-6">Reset Password</h4>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div className="relative">
            <label className="block text-gray-700 font-medium mb-1">Current Password</label>
            <input
              type={showPassword.current ? 'text' : 'password'}
              name="current_password"
              value={form.current_password}
              onChange={handleChange}
              minLength={8}
              required
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span
              onClick={() => toggleVisibility('current')}
              className="absolute top-2.5 right-3 text-gray-400 cursor-pointer"
            >
              {showPassword.current ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          {/* New Password */}
          <div className="relative">
            <label className="block text-gray-700 font-medium mb-1">New Password</label>
            <input
              type={showPassword.new ? 'text' : 'password'}
              name="new_password"
              value={form.new_password}
              onChange={handleChange}
              minLength={8}
              required
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span
              onClick={() => toggleVisibility('new')}
              className="absolute top-2.5 right-3 text-gray-400 cursor-pointer"
            >
              {showPassword.new ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <label className="block text-gray-700 font-medium mb-1">Confirm New Password</label>
            <input
              type={showPassword.confirm ? 'text' : 'password'}
              name="re_new_password"
              value={form.re_new_password}
              onChange={handleChange}
              minLength={8}
              required
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span
              onClick={() => toggleVisibility('confirm')}
              className="absolute top-2.5 right-3 text-gray-400 cursor-pointer"
            >
              {showPassword.confirm ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-semibold py-2 rounded-md hover:bg-blue-700 transition"
          >
            {loading ? 'Processing...' : 'Reset Password'}
          </button>
        </form>

        <div className="text-center mt-4">
          <button
            onClick={handleBackClick}
            className="text-blue-600 hover:underline flex items-center justify-center"
          >
            {backLoading ? 'Redirecting...' : '← Back to Profile'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
