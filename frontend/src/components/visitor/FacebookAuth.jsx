import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaFacebook } from 'react-icons/fa';
import axiosInstance from '../../api/axiosinstance';
import { useAuth } from '../../contexts/authContext';

const FacebookAuth = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const loadFacebookSDK = () => {
      if (document.getElementById('facebook-jssdk')) {
        initializeFacebook();
        return;
      }

      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.onload = initializeFacebook;
      document.body.appendChild(script);
    };

    const initializeFacebook = () => {
      if (!window.FB) return;
      window.FB.init({
        appId: '1270551067968843',
        cookie: true,
        xfbml: false,
        version: 'v18.0',
      });
    };

    loadFacebookSDK();
  }, []);

  const handleLogin = () => {
    if (!window.FB) {
      toast.error('Facebook SDK not ready');
      return;
    }

    window.FB.login(
      (response) => {
        if (response.authResponse) {
          const accessToken = response.authResponse.accessToken;

          window.FB.api('/me', { fields: 'id,name,email' }, async (user) => {
            try {
              // Call backend which sets httponly cookies
              await axiosInstance.post(
                'auth/social/facebook/',
                {
                  access_token: accessToken,
                  user_id: user.id,
                  email: user.email,
                  name: user.name,
                },
                { withCredentials: true } // important for httponly cookies
              );

              // Optionally fetch user profile after login
              const profileRes = await axiosInstance.get('auth/users/me/', {
                withCredentials: true,
              });

              login(null, profileRes.data, true); // token handled by cookie
              toast.success(`Welcome ${profileRes.data.first_name}`);
              navigate('/'); // redirect to home
            } catch (err) {
              console.error('Facebook login failed', err);
              toast.error('Facebook login failed. Please try again.');
            }
          });
        } else {
          toast.warning('Facebook login cancelled');
        }
      },
      { scope: 'public_profile,email' }
    );
  };

  return (
    <button
      onClick={handleLogin}
      className="w-full flex items-center justify-center gap-2 mb-3 px-3 py-2 bg-[#1877F2] text-white rounded hover:bg-blue-700 transition-all"
    >
      <FaFacebook size={20} />
      <span className="hidden sm:inline">Continue with Facebook</span>
      <span className="inline sm:hidden">Login</span>
    </button>
  );
};

export default FacebookAuth;
