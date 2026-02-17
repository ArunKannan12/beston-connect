import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import axiosInstance from "../../api/axiosinstance";
import { useAuth } from "../../contexts/authContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  LayoutDashboard,
  Banknote,
  Wallet,
  ShoppingBag,
  User,
  MessageSquare,
  LogOut,
  ChevronRight,
  RefreshCw,
  Zap,
  Star,
  ShieldCheck,
  Bell
} from "lucide-react";

const PromoterNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser } = useAuth();
  const [promoterType, setPromoterType] = useState(null);
  const [switching, setSwitching] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.active_role !== "promoter") return;

    const fetchPromoterType = async () => {
      try {
        const res = await axiosInstance.get("promoters/me/");
        setPromoterType(res.data.promoter_profile?.promoter_type);
        setSubscription(res.data.subscription);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
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

  const navLinks = [
    {
      to: "/promoter/dashboard/paid",
      label: "Dashboard",
      icon: LayoutDashboard,
      roles: ["paid"]
    },
    {
      to: "/promoter/dashboard/unpaid",
      label: "Dashboard",
      icon: LayoutDashboard,
      roles: ["unpaid"]
    },
    {
      to: "/promoter/add-promoted-products",
      label: "Marketplace",
      icon: ShoppingBag,
      roles: ["paid", "unpaid"]
    },
    {
      to: "/promoter/withdrawals",
      label: "Payouts",
      icon: Banknote,
      roles: ["paid"]
    },
    {
      to: "/promoter/wallet",
      label: "Wallet",
      icon: Wallet,
      roles: ["paid"]
    },
    {
      to: "/promoter/profile",
      label: "Profile",
      icon: User,
      roles: ["paid", "unpaid"]
    },
    {
      to: "/promoter/contact-us",
      label: "Support",
      icon: MessageSquare,
      roles: ["paid", "unpaid"]
    },
  ];

  const filteredLinks = navLinks.filter(link =>
    promoterType && link.roles.includes(promoterType)
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white/80 backdrop-blur-xl border-r border-gray-100 shadow-2xl shadow-indigo-500/5">
      {/* Brand Logo */}
      <div className="p-8">
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ rotate: 15 }}
            className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200"
          >
            <Zap size={22} fill="white" />
          </motion.div>
          <div>
            <h1 className="text-xl font-black text-gray-900 leading-none">Promoter<span className="text-indigo-600">Hub</span></h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Enterprise Console</p>
          </div>
        </div>

        {/* Status Chip */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex items-center gap-2 bg-gray-50 p-1.5 pr-3 rounded-full border border-gray-100"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${promoterType === 'paid' ? 'bg-amber-100 text-amber-600' : 'bg-gray-200 text-gray-400'
              }`}>
              {promoterType === 'paid' ? <Star size={14} fill="currentColor" /> : <ShieldCheck size={14} />}
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-900 leading-none uppercase">
                {promoterType === 'paid' ? 'Premium Member' : 'Standard Member'}
              </p>
              {subscription?.plan_type && (
                <p className="text-[9px] text-gray-400 font-medium">{subscription.plan_type} Access</p>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto py-2">
        <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Main Menu</p>
        {filteredLinks.map((link) => {
          const isActive = location.pathname.startsWith(link.to);
          const Icon = link.icon;

          return (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 relative group
                ${isActive
                  ? "bg-indigo-600 text-white font-bold shadow-xl shadow-indigo-200"
                  : "text-gray-500 hover:bg-indigo-50 hover:text-indigo-600"
                }
              `}
            >
              <Icon size={20} className={isActive ? "text-white" : "text-gray-400 group-hover:text-indigo-500"} />
              <span className="text-sm">{link.label}</span>
              {isActive && (
                <motion.div
                  layoutId="activeGlow"
                  className="absolute inset-0 bg-indigo-600 rounded-2xl -z-10"
                />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Section & Logout */}
      <div className="p-6 border-t border-gray-100 bg-gray-50/30">
        <div className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-2xl shadow-sm mb-4">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-black">
              {user?.first_name?.charAt(0) || "U"}
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-[10px] text-gray-400 font-medium truncate uppercase tracking-tighter">
              {user?.email?.split('@')[0]}
            </p>
          </div>
        </div>

        <button
          onClick={handleRoleSwitch}
          disabled={switching}
          className={`w-full group flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-sm transition-all duration-300 ${switching
              ? "bg-gray-100 text-gray-400"
              : "bg-white border border-gray-100 text-gray-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100"
            }`}
        >
          <span className="flex items-center gap-2">
            {switching ? <RefreshCw size={16} className="animate-spin" /> : <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />}
            {switching ? "Redirecting..." : "Customer Mode"}
          </span>
          <ChevronRight size={14} className="opacity-30 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex bg-gray-50 min-h-screen">
      {/* Top Mobile Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 z-40 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">P</div>
          <span className="font-bold text-gray-900">PromoterHub</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-gray-400 p-2"><Bell size={20} /></button>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 bg-gray-100 text-gray-800 rounded-lg"
          >
            <Menu size={22} />
          </button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-72 h-screen fixed top-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Slider */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 left-0 z-[60] w-72 h-screen bg-white md:hidden"
            >
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-rose-500 transition-colors"
              >
                <X size={24} />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Viewport Wrapper */}
      <main className="flex-1 md:ml-72 min-h-screen bg-transparent relative overflow-x-hidden">
        {/* Subtle background glow */}
        <div className="fixed top-0 right-0 w-[800px] h-[800px] bg-indigo-100/30 rounded-full blur-[120px] -z-10 pointer-events-none" />
        <div className="fixed bottom-0 left-72 w-[500px] h-[500px] bg-blue-50/50 rounded-full blur-[100px] -z-10 pointer-events-none" />

        <div className="relative z-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default PromoterNavbar;
