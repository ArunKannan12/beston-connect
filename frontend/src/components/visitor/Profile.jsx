import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Package, Phone } from "lucide-react";
import ProfileEditModal from "./ProfileEditModal";
import { useAuth } from "../../contexts/authContext";
import ProfileShimmer from "../../shimmer/ProfileShimmer";
import axiosInstance from "../../api/axiosinstance";

const Profile = () => {
  const { user, setUser, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [location, setLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  console.log(user, 'user');

  if (loading || !user) {
    return (
      <ProfileShimmer />
    );
  }


  const profilePic =
    user.custom_user_profile ||
    user.social_auth_pro_pic ||
    "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  const ip = user.last_login_ip;

  useEffect(() => {
    if (ip) {
      const fetchGeoLocation = async () => {
        try {
          const res = await fetch(`https://ipapi.co/${ip}/json/`);
          const data = await res.json();
          setLocation({
            city: data.city,
            region: data.region,
            country: data.country_name,
          });
        } catch (err) {
          console.error("Geo lookup failed", err);
        } finally {
          setLoadingLocation(false);
        }
      };
      fetchGeoLocation();
    }
  }, [ip]);

  const handleRoleSwitch = async (targetRole, redirectTo) => {
    try {
      if (user.active_role !== targetRole) {
        await axiosInstance.post("auth/switch-role/", {
          role: targetRole,
        });

        // Update auth context user safely
        setUser((prev) => ({
          ...prev,
          active_role: targetRole,
        }));
      }

      navigate(redirectTo);
    } catch (error) {
      console.error("Role switch failed", error);
      alert("Unable to switch role. Please try again.");
    }
  };

  const isPromoter = user.roles?.includes("promoter");

  return (
    <div className="min-h-screen bg-gray-50/50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Profile Hero Card */}
        <section className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-[3rem] shadow-sm overflow-hidden p-8 sm:p-12">
          <div className="flex flex-col md:flex-row items-center gap-10">
            {/* Avatar Section */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full opacity-75 group-hover:opacity-100 transition duration-500 blur-sm"></div>
              <div className="relative">
                <img
                  src={profilePic}
                  alt="Profile"
                  className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-white shadow-xl object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/default-avatar.png";
                  }}
                />
                <button
                  onClick={() => setShowModal(true)}
                  className="absolute bottom-2 right-2 bg-gray-900 text-white p-2.5 rounded-2xl shadow-lg border-2 border-white hover:scale-110 active:scale-95 transition-all group/btn"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Identity Details */}
            <div className="flex-1 text-center md:text-left space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-center md:justify-start">
                <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                  {user.first_name} {user.last_name}
                </h1>
                <div className="flex items-center gap-2 justify-center">
                  {user.is_verified && (
                    <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-200">
                      Verified
                    </span>
                  )}
                  {user.is_active ? (
                    <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-200">
                      Active
                    </span>
                  ) : (
                    <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-200">
                      Inactive
                    </span>
                  )}
                </div>
              </div>
              <p className="text-gray-500 font-bold tracking-tight text-lg">{user.email}</p>

              <div className="flex flex-wrap items-center gap-4 justify-center md:justify-start pt-2">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-2xl text-xs font-bold text-gray-600">
                  <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  Member since {new Date(user.created_at).getFullYear()}
                </div>
                {location && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-2xl text-xs font-bold text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    {location.city}, {location.country}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Action Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/orders" className="group p-6 bg-white/70 backdrop-blur-xl border border-white/40 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-900 group-hover:bg-blue-600 group-hover:text-white transition duration-500 mb-4">
              <Package size={24} />
            </div>
            <p className="text-sm font-black text-gray-900 uppercase tracking-widest">My Orders</p>
            <p className="text-[10px] text-gray-400 font-bold mt-1">Recent Purchases</p>
          </Link>

          <Link to="/returns" className="group p-6 bg-white/70 backdrop-blur-xl border border-white/40 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-900 group-hover:bg-orange-500 group-hover:text-white transition duration-500 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
              </svg>
            </div>
            <p className="text-sm font-black text-gray-900 uppercase tracking-widest">Returns</p>
            <p className="text-[10px] text-gray-400 font-bold mt-1">Item Support</p>
          </Link>

          <Link to="/replacements" className="group p-6 bg-white/70 backdrop-blur-xl border border-white/40 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-900 group-hover:bg-emerald-500 group-hover:text-white transition duration-500 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <p className="text-sm font-black text-gray-900 uppercase tracking-widest">Exchange</p>
            <p className="text-[10px] text-gray-400 font-bold mt-1">Replacements</p>
          </Link>

          <Link to="/contact-us" className="group p-6 bg-white/70 backdrop-blur-xl border border-white/40 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-900 group-hover:bg-purple-600 group-hover:text-white transition duration-500 mb-4">
              <Phone size={24} />
            </div>
            <p className="text-sm font-black text-gray-900 uppercase tracking-widest">Help</p>
            <p className="text-[10px] text-gray-400 font-bold mt-1">Customer Care</p>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Info Sections */}
          <div className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact Info Card */}
              <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-[2.5rem] p-8 shadow-sm">
                <h3 className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                  Technical Details
                </h3>
                <div className="space-y-4 font-bold text-gray-900">
                  <div>
                    <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-1">Phone Number</p>
                    <p className="text-lg tracking-tight">
                      {user.phone_number ? `+91 ${user.phone_number}` : "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-1">Active Role</p>
                    <p className="text-lg tracking-tight capitalize">{user.active_role}</p>
                  </div>
                </div>
              </div>

              {/* Address Card */}
              <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-[2.5rem] p-8 shadow-sm">
                <h3 className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></span>
                  Primary Address
                </h3>
                {user.address ? (
                  <div className="space-y-4 font-bold text-gray-900">
                    <p className="leading-snug text-gray-800">
                      {user.address}, {user.city}<br />
                      {user.district}, {user.state}<br />
                      <span className="text-blue-600">{user.pincode}</span>
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-400 font-bold italic">No address saved yet</p>
                )}
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-4 text-xs font-black text-blue-600 uppercase tracking-widest hover:underline"
                >
                  Manage Address
                </button>
              </div>
            </div>

            {/* Logout Panel */}
            <div className="bg-red-50/50 border border-red-100 rounded-[2.5rem] p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="text-center sm:text-left">
                <p className="text-lg font-black text-red-900 leading-tight">Ready to leave?</p>
                <p className="text-xs text-red-600 font-bold uppercase tracking-widest mt-1">Safe Sign Out</p>
              </div>
              <button
                onClick={logout}
                className="w-full sm:w-auto px-10 py-4 bg-red-600 text-white rounded-[1.5rem] font-black shadow-lg shadow-red-200 hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <LogOut size={20} />
                Logout Account
              </button>
            </div>
          </div>

          {/* Right Column: Promoter CTA */}
          <div className="lg:col-span-4 space-y-6">
            <div className="relative group overflow-hidden bg-gradient-to-br from-indigo-600 to-blue-800 rounded-[3rem] p-10 text-white shadow-2xl">
              {/* Background Decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-400/20 rounded-full -ml-12 -mb-12 blur-xl"></div>

              <div className="relative z-10 space-y-8">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl">
                  🚀
                </div>

                <div>
                  <h3 className="text-2xl font-black tracking-tight mb-2">Promoter Program</h3>
                  <p className="text-indigo-100/80 font-bold text-xs uppercase tracking-widest leading-relaxed">
                    Turn your style into earnings. Share what you love.
                  </p>
                </div>

                <div className="pt-4 border-t border-white/10">
                  {!user.promoter_profile && (
                    <Link
                      to="/become-a-promoter"
                      className="block w-full text-center py-4 bg-white text-indigo-800 rounded-2xl font-black text-sm hover:bg-indigo-50 transition active:scale-[0.98] shadow-lg"
                    >
                      Join Now
                    </Link>
                  )}

                  {user.promoter_profile && !user.promoter_profile.is_approved && (
                    <div className="p-4 bg-white/10 rounded-2xl border border-white/20 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-yellow-400/20 flex items-center justify-center">⏳</div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white">Status</p>
                        <p className="text-sm font-bold text-yellow-100">Application Pending</p>
                      </div>
                    </div>
                  )}

                  {user.promoter_profile?.is_approved && user.active_role !== "promoter" && (
                    <button
                      onClick={() => handleRoleSwitch("promoter", "/promoter/dashboard")}
                      className="block w-full text-center py-4 bg-white text-emerald-800 rounded-2xl font-black text-sm hover:bg-emerald-50 transition active:scale-[0.98] shadow-lg flex items-center justify-center gap-2"
                    >
                      <span className="text-xl">🔄</span>
                      Switch Workspace
                    </button>
                  )}

                  {user.active_role === "promoter" && (
                    <div className="flex items-center gap-4 bg-emerald-400/20 p-4 rounded-2xl border border-emerald-400/30">
                      <div className="w-10 h-10 bg-emerald-400 rounded-full flex items-center justify-center shadow-lg shadow-emerald-400/20">✅</div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white">Active As</p>
                        <p className="text-sm font-bold text-white tracking-tight">Verified Promoter</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Support Hint */}
            <div className="p-8 bg-gray-900 rounded-[2.5rem] shadow-xl text-white">
              <h4 className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-4">Dedicated Support</h4>
              <p className="text-xs font-bold text-gray-400 leading-relaxed mb-6">
                Need help with your account or orders? Our team is available 24/7.
              </p>
              <Link to="/contact-us" className="inline-flex items-center gap-2 text-sm font-black text-blue-400 hover:text-blue-300 group">
                Open Support Ticket
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:translate-x-1 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <ProfileEditModal
        show={showModal}
        onHide={() => setShowModal(false)}
        user={user}
        setUser={setUser}
      />
    </div>
  );
};

export default Profile;
