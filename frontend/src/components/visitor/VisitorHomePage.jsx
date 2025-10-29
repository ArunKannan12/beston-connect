import React from "react";
import Navbar from "./Navbar";
import { Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/authContext";
import BottomNav from "./MobileBottomNav";
import { useCartCount } from "../../utils/useCartCount";

const VisitorHomePage = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const totalItems = useCartCount();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar handles its own fixed positioning */}
      <Navbar
        isAuthenticated={isAuthenticated}
        totalItems={totalItems}
        logout={logout}
      />

      {/* Main content */}
      <div className="pb-16 md:pb-0">
        <Outlet />
      </div>



      {/* Mobile bottom nav */}
      <BottomNav
        isAuthenticated={isAuthenticated}
        totalItems={totalItems}
        logout={logout}
      />
    </div>
  );
};

export default VisitorHomePage;