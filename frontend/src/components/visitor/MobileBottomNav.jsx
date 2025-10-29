// BottomNav.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, ShoppingBag, ShoppingCart, User } from "lucide-react";

const BottomNav = ({ isAuthenticated, totalItems }) => {
  const location = useLocation();

  const navItems = [
    { name: "Home", icon: <Home size={20} />, path: "/" },
    { name: "Products", icon: <ShoppingBag size={20} />, path: "/store" },
    { name: "Cart", icon: <ShoppingCart size={20} />, path: "/cart" },
    {
      name: isAuthenticated ? "Profile" : "Login",
      icon: <User size={20} />,
      path: isAuthenticated ? "/profile" : "/login",
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-md z-50 md:hidden">
      <nav className="flex justify-around items-center py-2">
        {navItems.map((item, idx) => (
          <Link
            key={idx}
            to={item.path}
            className={`relative flex flex-col items-center text-gray-700 ${
              location.pathname === item.path ? "text-blue-600" : ""
            }`}
          >
            {item.icon}
            {item.name === "Cart" && totalItems > 0 && (
              <span className="absolute -top-1 -right-2 bg-red-600 text-white rounded-full px-2 text-xs font-semibold">
                {totalItems}
              </span>
            )}
            <span className="text-xs">{item.name}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default BottomNav;
