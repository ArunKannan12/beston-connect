import React, { useState, useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/authContext";
import Sidebars from "./helpers/Sidebars";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Image as BannerIcon,
  Menu,
  Megaphone,
  WarehouseIcon,
  MailIcon,
  MessagesSquare,Inbox,
  X,
  Settings,
  TrendingUp,
  Bell,
  Search,
  ChevronDown,
  LogOut,
  Home,
} from "lucide-react";

const adminSections = [
  { label: "Dashboard", to: "/admin/dashboard", icon: LayoutDashboard },
  {
    label: "Products",
    icon: Package,
    subLinks: [
      { name: "All Products", to: "/admin/products" },
      { name: "Categories", to: "/admin/categories" },
    ],
  },
  {
    label: "Customers",
    icon: Users,
    subLinks: [
      { name: "All Customers", to: "/admin/customers" },
    ],
  },
  {
    label: "Promoters",
    icon: Megaphone,
    subLinks: [
      { name: "All Promoters", to: "/admin/promoters" },
      { name: "Premium Amount", to: "/admin/premium-settings" },
      { name: "Commission Levels", to: "/admin/commission-levels" },
      { name: "Withdrawal requests", to: "/admin/withdrawal-requests" },
    ],
  },

  {
    label: "Orders",
    icon: ShoppingCart,
    subLinks: [
      { name: "All Orders", to: "/admin/orders" },
      { name: "Returns", to: "/admin/returns" },
      {name:"Replacements",to:"/admin/replacements"},
      {name:"orders to pack",to:"/admin/orders-to-pack"},
      {name: "Delhivery Pickup Requests", to: "/admin/delhivery-pickup-requests"}

    ],
  },
  {
    label: "Contact Messages",
    icon: MessagesSquare, // choose an icon (e.g., Envelope, MessageSquare, Inbox)
    subLinks: [
      { name: "All Messages", to: "/admin/contact-messages" },
    ],
  },

  // {
  //   label: "Warehouses",
  //   icon: WarehouseIcon, // choose any icon you use (e.g., Home, Building, Store)
  //   subLinks: [
  //     { name: "All Warehouses", to: "/admin/warehouses" },
  //   ],
  // },
  { label: "Banners", to: "/admin/banners", icon: BannerIcon },
];

const AdminDashboard = () => {
  const { logout, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Prevent background scroll when sidebar is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "auto";
  }, [sidebarOpen]);

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Mobile hamburger */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-3 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all"
        >
          <Menu className="w-6 h-6 text-gray-700" />
        </button>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-white/95 backdrop-blur-xl shadow-2xl flex flex-col
                    transform transition-all duration-300 ease-in-out
                    ${sidebarOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"}
                    lg:translate-x-0 lg:opacity-100 lg:static lg:shadow-none`}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-200/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <LayoutDashboard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Admin Panel
                </h1>
                <p className="text-sm text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Main</p>
            {adminSections.slice(0, 1).map((section) => (
              <NavLink
                key={section.label}
                to={section.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive 
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg" 
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`
                }
              >
                {section.icon && <section.icon className="w-5 h-5" />}
                <span className="font-medium">{section.label}</span>
              </NavLink>
            ))}
          </div>

          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Management</p>
            {adminSections.slice(1, 5).map((section) =>
              section.subLinks ? (
                <Sidebars
                  key={section.label}
                  label={section.label}
                  subLinks={section.subLinks}
                  icon={section.icon}
                  onClose={() => setSidebarOpen(false)}
                />
              ) : (
                <NavLink
                  key={section.label}
                  to={section.to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActive 
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg" 
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    }`
                  }
                >
                  {section.icon && <section.icon className="w-5 h-5" />}
                  <span className="font-medium">{section.label}</span>
                </NavLink>
              )
            )}
          </div>

          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Content</p>
            {adminSections.slice(5).map((section) =>
              section.subLinks ? (
                <Sidebars
                  key={section.label}
                  label={section.label}
                  subLinks={section.subLinks}
                  icon={section.icon}
                  onClose={() => setSidebarOpen(false)}
                />
              ) : (
                <NavLink
                  key={section.label}
                  to={section.to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActive 
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg" 
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    }`
                  }
                >
                  {section.icon && <section.icon className="w-5 h-5" />}
                  <span className="font-medium">{section.label}</span>
                </NavLink>
              )
            )}
          </div>
        </nav>

        {/* User Actions */}
        <div className="p-4 border-t border-gray-200/50">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              {/* User Profile */}
              <div className="flex items-center gap-3">
                <div className="text-right hidden md:block">
                  <p className="text-sm font-semibold text-gray-800">{user?.first_name || 'Admin'}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {user?.first_name?.[0]?.toUpperCase() || 'A'}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;