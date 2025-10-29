import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { toast } from 'react-toastify';
import { useLocation, useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosinstance';
import { useAuth } from '../../contexts/authContext';

const GoogleAuth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const handleGoogleLogin = async (credentialResponse) => {
    try {
      await axiosInstance.post(
        'auth/social/google/',
        { id_token: credentialResponse.credential },
        { withCredentials: true }
      );

      const { success } = await login();

      if (success) {
        toast.success('Logged in with Google!');
        const from = location.state?.from || '/';
        navigate(from, { replace: true });
      } else {
        toast.error('Failed to fetch user after Google login');
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || 'Google login failed');
    }
  };

  return (
    <div className="flex justify-center w-full mb-4">
      <div className="w-full max-w-sm">
        <GoogleLogin
          onSuccess={handleGoogleLogin}
          onError={() => toast.error('Google sign-in failed')}
        />
      </div>
    </div>
  );
};

export default GoogleAuth;