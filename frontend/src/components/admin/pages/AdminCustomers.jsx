import React, { useState, useEffect } from "react";
import axiosInstance from "../../../api/axiosinstance";
import { toast } from "react-toastify";
import { FaUser, FaSearch } from "react-icons/fa";
import { AnimatePresence } from "framer-motion";
import CustomerDrawer from "../modals/CustomerDrawer";


const HIGH_SPENDER_THRESHOLD = 5000; // highlight high-spending customers

const AdminCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [authProvider, setAuthProvider] = useState("");
  const [sortField, setSortField] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const sortOptions = [
    { label: "Name A → Z", field: "first_name", order: "asc" },
    { label: "Name Z → A", field: "first_name", order: "desc" },
    { label: "Joined New → Old", field: "created_at", order: "desc" },
    { label: "Joined Old → New", field: "created_at", order: "asc" },
    { label: "Total Spent Low → High", field: "total_spent", order: "asc" },
    { label: "Total Spent High → Low", field: "total_spent", order: "desc" },
    { label: "Total Orders Low → High", field: "total_orders", order: "asc" },
    { label: "Total Orders High → Low", field: "total_orders", order: "desc" },
  ];

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = { search, ordering: (sortOrder === "desc" ? "-" : "") + sortField };
      if (filter === "active") params.status = "active";
      else if (filter === "blocked") params.status = "blocked";
      else if (filter === "banned") params.status = "banned";
      else if (filter === "verified") params.verified = "true";
      if (authProvider) params.auth_provider = authProvider;

      const res = await axiosInstance.get("/admin/customers/", { params });
      setCustomers(res.data.results);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to fetch customers");
    }
    setLoading(false);
  };

  useEffect(() => {
    const delay = setTimeout(fetchCustomers, 400);
    return () => clearTimeout(delay);
  }, [search, filter, authProvider, sortField, sortOrder]);

  return (
    <div className="p-7 bg-gray-50 min-h-screen">
      <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <FaUser className="text-blue-500" /> Customers
      </h2>

      {/* Filters and Sorting */}
      <div className="flex flex-wrap gap-4 mb-6 items-center">
        <div className="relative flex-1 min-w-[250px]">
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 outline-none"
          />
          <FaSearch className="absolute left-3 top-2.5 text-gray-400" />
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg shadow-sm bg-white"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
          <option value="banned">Banned</option>
          <option value="verified">Verified</option>
        </select>

        <select
          value={authProvider}
          onChange={(e) => setAuthProvider(e.target.value)}
          className="px-3 py-2 border rounded-lg shadow-sm bg-white"
        >
          <option value="">All Auth</option>
          <option value="email">Email</option>
          <option value="google">Google</option>
          <option value="facebook">Facebook</option>
        </select>

        <select
          value={`${sortField}_${sortOrder}`}
          onChange={(e) => {
            const [field, order] = e.target.value.split("_");
            setSortField(field);
            setSortOrder(order);
          }}
          className="px-3 py-2 border rounded-lg shadow-sm bg-white"
        >
          {sortOptions.map((opt) => (
            <option key={opt.label} value={`${opt.field}_${opt.order}`}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Customers Table */}
      <div className="overflow-x-auto">
        {/* Desktop Table */}
        <div className="hidden sm:block bg-white rounded-xl shadow-md">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Auth</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Spent</th>
                <th className="px-4 py-3">Last Order</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-6 text-gray-500">
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-6 text-gray-500">
                    No customers found.
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const isHighSpender = c.total_spent > HIGH_SPENDER_THRESHOLD;
                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-blue-50 transition duration-200 cursor-pointer ${
                        isHighSpender ? "bg-yellow-50" : ""
                      }`}
                      onClick={() => setSelectedCustomer(c.id)}
                    >
                      <td className="px-4 py-3 flex items-center gap-2">
                        <img
                          src={c.profile_picture_url || "/default-avatar.png"}
                          alt="avatar"
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full object-cover border"
                        />
                        <div>
                          <p className="font-medium">{c.full_name}</p>
                          <p className="text-xs text-gray-500 truncate">{c.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">{c.phone_number || "N/A"}</td>
                      <td className="px-4 py-3">{c.role}</td>
                      <td className="px-4 py-3">{c.auth_provider_display || "-"}</td>
                      <td className="px-4 py-3">
                        {c.is_permanently_banned
                          ? "Banned"
                          : c.blocked_until
                          ? `Blocked until ${new Date(c.blocked_until).toLocaleDateString()}`
                          : "Active"}
                      </td>
                      <td className="px-4 py-3">{new Date(c.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-center">{c.total_orders || 0}</td>
                      <td className="px-4 py-3 text-center">₹{c.total_spent || 0}</td>
                      <td className="px-4 py-3">{c.last_order_date ? new Date(c.last_order_date).toLocaleDateString() : "-"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card Layout */}
        <div className="sm:hidden space-y-4">
          {customers.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelectedCustomer(c.id)}
              className="bg-white rounded-xl shadow-md p-4 transition hover:shadow-lg cursor-pointer flex items-center gap-4"
            >
              <img
                src={c.profile_picture_url || "/default-avatar.png"}
                alt="avatar"
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-full object-cover border"
              />
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <h2 className="text-sm font-semibold text-gray-700">{c.full_name}</h2>
                  <span className="text-xs text-gray-500">{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-gray-600 truncate"><strong>Email:</strong> {c.email}</p>
                <p className="text-xs text-gray-600"><strong>Phone:</strong> {c.phone_number || "N/A"}</p>
                <p className="text-xs text-gray-600"><strong>Orders:</strong> {c.total_orders || 0}</p>
                <p className="text-xs text-gray-600"><strong>Spent:</strong> ₹{c.total_spent || 0}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedCustomer && (
          <CustomerDrawer
            customerID={selectedCustomer}
            onClose={() => setSelectedCustomer(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminCustomers;
