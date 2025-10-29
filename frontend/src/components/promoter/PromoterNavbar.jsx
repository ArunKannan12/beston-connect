import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axiosinstance";
import { useAuth } from "../../contexts/authContext";
import { HiMenu, HiX } from "react-icons/hi";

const PromoterNavbar = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [promoterType, setPromoterType] = useState(null);
  const [switching, setSwitching] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (user?.active_role !== "promoter") return;

    const fetchPromoterType = async () => {
      try {
        const res = await axiosInstance.get("promoters/me/");
        setPromoterType(res.data.promoter_profile?.promoter_type);
      } catch (err) {
        console.error(err);
      }
    };

    fetchPromoterType();
  }, [user]);

  const handleRoleSwitch = async () => {
    setSwitching(true);
    try {
      await axiosInstance.post("auth/switch-role/", { role: "customer" });
      const { data } = await axiosInstance.get("auth/profile/");
      setUser(data);
      navigate("/");
    } catch (err) {
      console.error(err);
    } finally {
      setSwitching(false);
    }
  };

  const renderNavLink = (to, label, color = "blue") => (
    <NavLink
      key={to}
      to={to}
      className={({ isActive }) =>
        `block px-4 py-2 rounded-lg font-medium transition-colors hover:bg-${color}-600 hover:text-white ${
          isActive ? `bg-${color}-500 text-white` : "text-gray-200 hover:text-white"
        }`
      }
      onClick={() => setSidebarOpen(false)}
    >
      {label}
    </NavLink>
  );

  const commonLinks = [
    { to: "/promoter/add-promoted-products", label: "Add Promoted Products", color: "green" },
    { to: "/promoter/profile", label: "Profile", color: "blue" },
  ];

  const paidLinks = [
    { to: "/promoter/dashboard/paid", label: "Dashboard", color: "yellow" },
    { to: "/promoter/performance", label: "Performance", color: "yellow" },
    { to: "/promoter/withdrawals", label: "Withdrawals", color: "yellow" },
  ];

  const unpaidLinks = [
    { to: "/promoter/dashboard/unpaid", label: "Dashboard", color: "green" },
  ];

  const linksToRender = () => {
    if (promoterType === "paid") return [...paidLinks, ...commonLinks];
    if (promoterType === "unpaid") return [...unpaidLinks, ...commonLinks];
    return [];
  };

  return (
    <div className="flex h-screen bg-gray-100 border">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-gray-900 text-white">
        <div className="p-6 border-b border-gray-700 text-center">
          <span className="text-2xl font-bold">Promoter Panel</span>
          <p className="text-sm text-gray-400 mt-1 capitalize">{promoterType || "loading..."}</p>
        </div>

        <nav className="flex-1 p-4 flex flex-col space-y-3 overflow-y-auto">
          {linksToRender().map((link) => renderNavLink(link.to, link.label, link.color))}
        </nav>

        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleRoleSwitch}
            disabled={switching}
            className={`w-full px-4 py-2 rounded-lg font-semibold transition ${
              switching ? "bg-gray-500 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {switching
              ? "Switching..."
              : `Switch to ${user?.active_role === "promoter" ? "Customer" : "Promoter"}`}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <div className="md:hidden">
        {/* Hamburger */}
        <button
          className="fixed top-4 left-4 z-50 p-2 bg-blue-700 text-white rounded-lg shadow"
          onClick={() => setSidebarOpen(true)}
        >
          <HiMenu className="w-6 h-6" />
        </button>

        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black opacity-40 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Drawer */}
        <aside
          className={`fixed top-0 left-0 z-50 w-64 h-screen bg-gray-900 text-white p-6 flex flex-col transition-transform ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between mb-6">
            <span className="text-2xl font-bold">Promoter Panel</span>
            <button onClick={() => setSidebarOpen(false)}>
              <HiX className="w-6 h-6 text-gray-400 hover:text-white" />
            </button>
          </div>

          <p className="text-sm text-gray-400 mb-6 capitalize">{promoterType || "loading..."}</p>

          <nav className="flex-1 overflow-y-auto flex flex-col space-y-3">
            {linksToRender().map((link) => renderNavLink(link.to, link.label, link.color))}
          </nav>

          <div className="mt-4 border-t border-gray-700 pt-4">
            <button
              onClick={handleRoleSwitch}
              disabled={switching}
              className={`w-full px-4 py-2 rounded-lg font-semibold transition ${
                switching ? "bg-gray-500 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {switching
                ? "Switching..."
                : `Switch to ${user?.active_role === "promoter" ? "Customer" : "Promoter"}`}
            </button>
          </div>
        </aside>
      </div>

      {/* Main content */}
      <main className="flex-1 min-h-screen p-6 bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
};

export default PromoterNavbar;
