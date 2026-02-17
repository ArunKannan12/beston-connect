// Navbar.jsx
import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, User } from "lucide-react";
import { useAuth } from "../../contexts/authContext";
import { useCartCount } from "../../utils/useCartCount";
import Beston from '../../../Beston.png';
import axiosInstance from "../../api/axiosinstance";

const Navbar = () => {
  const [query, setQuery] = useState("");
  const debounceTimeout = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout, user } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const totalItems = useCartCount();

  // Sync search query with URL
  useEffect(() => {
    if (location.pathname.startsWith("/store")) {
      const params = new URLSearchParams(location.search);
      setQuery(params.get("search") || "");
    } else setQuery("");
  }, [location]);

  // Debounced search navigation
  useEffect(() => {
    if (!location.pathname.startsWith("/store")) return;
    const trimmed = query.trim();
    const currentSearch = new URLSearchParams(location.search).get("search") || "";
    if (trimmed === currentSearch) return;

    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      navigate(trimmed ? `/store?search=${encodeURIComponent(trimmed)}` : "/store", {
        replace: true,
      });
    }, 500);

    return () => clearTimeout(debounceTimeout.current);
  }, [query, navigate, location.pathname, location.search]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!location.pathname.startsWith("/store")) {
      navigate(trimmed ? `/store?search=${encodeURIComponent(trimmed)}` : "/store");
    }
  };

  const handleRoleSwitch = async (targetRole, redirectTo) => {
    try {
      if (user.active_role !== targetRole) {
        await axiosInstance.post('auth/switch-role/', { role: targetRole });
        user.active_role = targetRole
      }
      setAccountOpen(false)
      navigate(redirectTo)
    } catch (error) {
      console.error(error);

    }
  }


  return (
    <nav className="bg-white border-gray-200 ">
      <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">

        {/* Logo */}
        <Link to="/" className="flex items-center space-x-3 rtl:space-x-reverse">
          <img src={Beston} className="h-10" alt="Beston Logo" />
        </Link>

        {/* Search */}
        <div className="flex md:order-2 flex-grow max-w-xl mx-4">
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center border border-gray-300 rounded-full overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-blue-500 w-full"
          >
            <input
              type="search"
              placeholder="Search products..."
              className="px-4 py-2 w-full text-gray-700 placeholder-gray-400 focus:outline-none transition-all"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-5 py-2 font-semibold hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex md:items-center md:space-x-6 text-gray-800 font-medium md:order-1">
          <Link to="/" className="hover:text-blue-600 transition-colors">Home</Link>
          <Link to="/store" className="hover:text-blue-600 transition-colors">Products</Link>
          <Link to="/cart" className="relative hover:text-blue-600 transition-colors">
            Cart
            {totalItems > 0 && (
              <span className="ml-2 inline-block bg-red-600 text-white rounded-full px-2 text-xs font-semibold animate-pulse">
                {totalItems}
              </span>
            )}
          </Link>

          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setAccountOpen((prev) => !prev)}
                className="flex items-center space-x-2 hover:text-blue-600 transition-colors"
              >
                <User size={18} />
                <span>Account</span>
                <ChevronDown
                  size={16}
                  className={`${accountOpen ? "rotate-180" : "rotate-0"} transition-transform duration-300`}
                />
              </button>

              <div
                className={`absolute right-0 mt-2 w-48 bg-white border rounded-md shadow-xl z-50 transform origin-top-right transition-all duration-300 ease-out
                  ${accountOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}`}
              >
                <Link to="/profile" className="block px-4 py-2 hover:bg-gray-100" onClick={() => setAccountOpen(false)}>Profile</Link>
                <Link to="/orders" className="block px-4 py-2 hover:bg-gray-100" onClick={() => setAccountOpen(false)}>My Orders</Link>
                <Link to="/returns" className="block px-4 py-2 hover:bg-gray-100" onClick={() => setAccountOpen(false)}>My Returns</Link>
                <Link to="/replacements" className="block px-4 py-2 hover:bg-gray-100" onClick={() => setAccountOpen(false)}>My Replacements</Link>

                {isAuthenticated && user && (
                  <>
                    {/* No Promoter Profile */}
                    {!user.promoter_profile && (
                      <Link
                        to="/become-a-promoter"
                        className="block px-4 py-2 hover:bg-gray-100"
                        onClick={() => setAccountOpen(false)}
                      >
                        🚀 Join Promoter Program
                      </Link>
                    )}

                    {/* Pending Application */}
                    {user.promoter_profile && !user.promoter_profile.is_approved && (
                      <div className="px-4 py-2 text-yellow-600 font-medium">
                        ⏳ Application Pending
                      </div>
                    )}

                    {/* Approved but Not Active */}
                    {user.promoter_profile?.is_approved && user.active_role !== "promoter" && (
                      <button
                        onClick={() => handleRoleSwitch("promoter", "/promoter/dashboard")}
                        className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-emerald-600 font-medium"
                      >
                        🔄 Switch to Promoter
                      </button>
                    )}

                    {/* Active Promoter */}
                    {user.active_role === "promoter" && (
                      <div className="px-4 py-2 text-emerald-600 font-medium">
                        ✅ Active Promoter
                      </div>
                    )}
                  </>
                )}

                <button
                  onClick={() => {
                    logout();
                    setAccountOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
                >
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <Link to="/login" className="hover:text-blue-600 transition-colors">Login</Link>
          )}

        </div>

      </div>
    </nav>
  );
};

export default Navbar;