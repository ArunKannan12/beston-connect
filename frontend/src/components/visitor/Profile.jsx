import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { LogOut, Package } from "lucide-react";
import ProfileEditModal from "./ProfileEditModal";
import { useAuth } from "../../contexts/authContext";
import ProfileShimmer from "../../shimmer/ProfileShimmer";

const Profile = () => {
  const { user, setUser, loading, logout } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [location, setLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  console.log(user,'user');
  
  if (loading || !user) {
    return (
      <ProfileShimmer/>
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

  return (
    <div className="max-w-4xl mx-auto py-12 px-6 bg-white rounded-xl shadow-lg border border-gray-200">
      {/* Profile Header */}
      <div className="text-center mb-8">
        <div className="relative inline-block">
          <img
            src={profilePic}
            alt="Profile"
            className="rounded-full border-4 border-white shadow-lg object-cover"
            style={{ width: 120, height: 120 }}
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "/default-avatar.png";
            }}
          />
          <button
            className="absolute bottom-0 right-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs px-3 py-1 rounded-full shadow hover:scale-105 transition-transform"
            onClick={() => setShowModal(true)}
          >
            ✏️ Edit
          </button>
        </div>
        <h2 className="mt-4 text-2xl font-bold text-gray-800">
          {user.first_name} {user.last_name}
        </h2>
        <p className="text-gray-500 text-sm">{user.email}</p>
        <span className="inline-block mt-2 px-4 py-1 bg-gray-700 text-white text-xs rounded-full uppercase tracking-wide">
          {user.active_role}
        </span>
            {/* New status badges */}
        <div className="flex justify-center gap-2 mt-2 flex-wrap">
          {user.is_verified ? (
            <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full uppercase tracking-wide">
              Verified ✅
            </span>
          ) : (
            <span className="px-2 py-1 bg-yellow-500 text-white text-xs rounded-full uppercase tracking-wide">
              Not Verified ⚠️
            </span>
          )}

          {user.is_active ? (
            <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full uppercase tracking-wide">
              Active
            </span>
          ) : (
            <span className="px-2 py-1 bg-red-600 text-white text-xs rounded-full uppercase tracking-wide">
              Inactive ❌
            </span>
          )}
        </div>
      </div>

      {/* ✅ Quick Actions Row (Desktop + Mobile) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
        {/* Orders */}
        <Link
          to="/orders"
          className="flex flex-col items-center justify-center p-3 bg-gray-100 rounded-lg shadow hover:bg-gray-200 transition"
        >
          <Package size={24} className="mb-1" />
          <span className="text-xs font-medium text-center">Orders</span>
        </Link>

        {/* Returns */}
        <Link
          to="/returns"
          className="flex flex-col items-center justify-center p-3 bg-gray-100 rounded-lg shadow hover:bg-gray-200 transition"
        >
          <Package size={24} className="mb-1" />
          <span className="text-xs font-medium text-center">Returns</span>
        </Link>

        {/* Replacements */}
        <Link
          to="/replacements"
          className="flex flex-col items-center justify-center p-3 bg-gray-100 rounded-lg shadow hover:bg-gray-200 transition"
        >
          <Package size={24} className="mb-1" />
          <span className="text-xs font-medium text-center">Replacements</span>
        </Link>

        {/* Logout */}
        <button
          onClick={logout}
          className="col-span-2 sm:col-span-3 flex items-center justify-center gap-2 p-3 bg-red-500 text-white rounded-lg shadow hover:bg-red-600 transition"
        >
          <LogOut size={18} />
          <span className="text-xs font-medium">Logout</span>
        </button>
      </div>


      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700">
        <div>
          <h5 className="text-lg font-semibold text-gray-900 mb-2">
            📞 Contact Info
          </h5>
          <p className="bg-gray-50 p-3 rounded border">
            {user.phone_number || "Not provided"}
          </p>
        </div>
        <div>
          <h5 className="text-lg font-semibold text-gray-900 mb-2">
            🏠 Address
          </h5>
          <p className="bg-gray-50 p-3 rounded border">
            {user.address
              ? `${user.address}, ${user.city}, ${user.district}, ${user.state} - ${user.pincode}`
              : "No address saved"}
          </p>
        </div>
       <div className="mb-2">
          <h5 className="text-lg font-semibold text-gray-900 mb-3">
            📅 Member Since
          </h5>
          <p className="bg-gray-50 p-3 rounded border">
            {new Date(user.created_at).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

      </div>
          
      {/* Modal */}
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
