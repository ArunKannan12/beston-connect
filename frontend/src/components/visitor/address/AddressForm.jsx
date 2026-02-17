import React, { useState, useEffect } from "react";
import axiosInstance from "../../../api/axiosinstance"; // ✅ backend axios instance

const AddressForm = ({ initialData = {}, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    full_name: "",
    address: "",
    postal_code: "",
    locality: "",
    city: "",
    district: "",
    state: "",
    country: "",
    phone_number: "",
    serviceable: undefined,
    ...initialData,
  });

  const [localities, setLocalities] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [checkingService, setCheckingService] = useState(false);

  // 🔹 Auto-fetch location + serviceability when postal_code changes
  useEffect(() => {
    const fetchLocationAndServiceability = async () => {
      const pin = formData.postal_code?.trim();
      if (pin && pin.length === 6) {
        setCheckingService(true);
        try {
          // 1️⃣ Fetch location info
          const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
          const data = await res.json();

          if (data[0]?.Status === "Success") {
            const offices = data[0]?.PostOffice || [];
            setLocalities(offices);

            const firstOffice = offices[0];
            setFormData((prev) => ({
              ...prev,
              locality: offices.length === 1 ? firstOffice?.Name : "",
              city: firstOffice?.Block || "",
              district: firstOffice?.District || "",
              state: firstOffice?.State || "",
              country: "India",
            }));
          } else {
            setLocalities([]);
          }

          // 2️⃣ Check delivery serviceability (your backend)
          const delhiveryRes = await axiosInstance.get(`check-pincode/${pin}/`);
          const deliveryData = delhiveryRes.data;
          const deliveryInfo = deliveryData.delivery_codes?.[0]?.postal_code;

          const serviceable = deliveryInfo?.is_oda === "N"; // "N" = serviceable

          setFormData((prev) => ({
            ...prev,
            serviceable,
          }));
        } catch (err) {
          console.error("Error fetching pincode data:", err);
          setLocalities([]);
          setFormData((prev) => ({
            ...prev,
            serviceable: false,
          }));
        } finally {
          setCheckingService(false);
        }
      } else {
        setLocalities([]);
        setFormData((prev) => ({
          ...prev,
          serviceable: undefined,
        }));
      }
    };

    fetchLocationAndServiceability();
  }, [formData.postal_code]);

  // 🔹 Handle input changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 🔹 Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    const result = await onSave(formData);

    if (result.success) {
      setErrors({});
    } else {
      setErrors(result.errors || {});
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 font-sans">
      {/* Global Errors */}
      {errors.non_field_errors && (
        <div className="bg-red-50 text-red-600 text-xs font-bold p-4 rounded-2xl border border-red-100 animate-shake">
          {errors.non_field_errors.join(", ")}
        </div>
      )}

      {/* Main Details */}
      <div className="space-y-4">
        <div>
          <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest ml-4 mb-1 block">Full Name</label>
          <input
            type="text"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            placeholder="John Doe"
            className="w-full bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] px-6 py-4 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-bold text-gray-900"
            required
          />
        </div>

        <div>
          <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest ml-4 mb-1 block">Street Address</label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="House No, Building, Street, Area"
            className="w-full bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] px-6 py-4 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-bold text-gray-900 min-h-[100px]"
            required
          />
        </div>
      </div>

      {/* Region Grid 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest ml-4 mb-1 block">Pincode</label>
          <div className="relative">
            <input
              type="text"
              name="postal_code"
              value={formData.postal_code}
              onChange={handleChange}
              placeholder="600001"
              className={`w-full bg-gray-50 border-2 rounded-[1.5rem] px-6 py-4 focus:bg-white transition-all outline-none font-bold text-gray-900 ${formData.serviceable === false ? "border-red-200" : "border-gray-100 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10"
                }`}
              required
            />
            {checkingService && (
              <div className="absolute right-6 top-1/2 -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest ml-4 mb-1 block">Locality</label>
          {localities.length > 1 ? (
            <select
              name="locality"
              value={formData.locality || ""}
              onChange={handleChange}
              className="w-full bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] px-6 py-4 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-bold text-gray-900 appearance-none bg-no-repeat bg-[right_1.5rem_center] cursor-pointer"
              required
            >
              <option value="">Select Locality</option>
              {localities.map((loc, idx) => (
                <option key={idx} value={loc.Name}>
                  {loc.Name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              name="locality"
              value={formData.locality || ""}
              onChange={handleChange}
              placeholder="Locality"
              className="w-full bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] px-6 py-4 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-bold text-gray-900"
              required
            />
          )}
        </div>
      </div>

      {/* Serviceability Message */}
      {formData.serviceable === false && (
        <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex gap-3 items-center">
          <span className="text-xl">❌</span>
          <p className="text-xs text-red-600 font-bold uppercase tracking-tight">Delivery unavailable at this Pincode</p>
        </div>
      )}
      {formData.serviceable === true && (
        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex gap-3 items-center">
          <span className="text-xl">✅</span>
          <p className="text-xs text-emerald-600 font-bold uppercase tracking-tight">Delivery available (Prepaid only)</p>
        </div>
      )}

      {/* Region Grid 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest ml-4 mb-1 block">City</label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="City"
            className="w-full bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] px-6 py-4 focus:bg-white focus:border-blue-600 transition-all outline-none font-bold text-gray-900"
            required
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest ml-4 mb-1 block">State</label>
          <input
            type="text"
            name="state"
            value={formData.state}
            onChange={handleChange}
            placeholder="State"
            className="w-full bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] px-6 py-4 focus:bg-white focus:border-blue-600 transition-all outline-none font-bold text-gray-900"
            required
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest ml-4 mb-1 block">Country</label>
          <input
            type="text"
            name="country"
            value={formData.country}
            onChange={handleChange}
            placeholder="Country"
            className="w-full bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] px-6 py-4 focus:bg-white focus:border-blue-600 transition-all outline-none font-bold text-gray-900"
            required
          />
        </div>
      </div>

      {/* Phone Number */}
      <div>
        <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest ml-4 mb-1 block">Phone Number</label>
        <div className="flex bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] px-6 py-4 focus-within:bg-white focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
          <span className="text-gray-400 font-bold mr-3 border-r pr-3 border-gray-200">+91</span>
          <input
            type="text"
            name="phone_number"
            value={formData.phone_number}
            onChange={handleChange}
            placeholder="9876543210"
            className="bg-transparent w-full outline-none font-bold text-gray-900"
            required
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-8 py-4 text-gray-500 font-bold rounded-2xl hover:bg-gray-100 transition active:scale-[0.98]"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={`px-10 py-4 text-white rounded-[1.5rem] font-black shadow-lg transition-all active:scale-[0.98] ${formData.serviceable === false
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gray-900 hover:bg-gray-800 shadow-gray-200"
            }`}
          disabled={loading || formData.serviceable === false}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Saving...</span>
            </div>
          ) : "Save Address"}
        </button>
      </div>
    </form>
  );
};

export default AddressForm;
