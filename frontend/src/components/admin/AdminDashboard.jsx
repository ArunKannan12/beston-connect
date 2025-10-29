import React, { useState, useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/authContext";
import Sidebars from "./helpers/Sidebars";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Warehouse,
  Truck,
  Image as BannerIcon,
  Menu,
  X,
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
    label: "Orders",
    icon: ShoppingCart,
    subLinks: [
      { name: "All Orders", to: "/admin/orders" },
      { name: "Returns", to: "/admin/returns" },
      {name:"Replacements",to:"/admin/replacements"}
    ],
  },
  {
    label: "Warehouse",
    icon: Warehouse,
    subLinks: [
      {name:'Warehouse logs',to:"/admin/warehouse-logs/"},
    ],
  },
  {
    label: "Delivery",
    icon: Truck,
    subLinks: [
      { name: "All Deliveryman Requests", to: "/admin/delivery/delivery-man" },
      { name: "All Deliverymen", to: "/admin/deliverymen" },
      { name: "Delivery tracking", to: "/admin/delivery-tracking" },
    ],
  },
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
    <div className="flex h-screen bg-gray-100 relative">
      {/* Mobile hamburger */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 bg-white rounded shadow hover:bg-gray-100 transition"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-md flex flex-col
                    transform transition-all duration-300 ease-in-out
                    ${sidebarOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"}
                    md:translate-x-0 md:opacity-100 md:static md:shadow-none`}
      >
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-blue-600">Admin Panel</h1>
            <p className="text-sm text-gray-500 truncate">{user?.email}</p>
          </div>
          <button
            className="md:hidden p-1 rounded hover:bg-gray-200"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto scroll-smooth">
          {adminSections.map((section) =>
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
                  `flex items-center gap-2 p-2 rounded transition-colors duration-200 ${
                    isActive ? "bg-blue-500 text-white" : "text-gray-700 hover:bg-gray-100"
                  }`
                }
              >
                {section.icon && <section.icon className="w-5 h-5" />}
                <span>{section.label}</span>
              </NavLink>
            )
          )}
        </nav>

        <div className="p-4 border-t">
          <button
            onClick={logout}
            className="w-full py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminDashboard;