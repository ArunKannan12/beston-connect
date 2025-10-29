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
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Global Errors */}
      {errors.non_field_errors && (
        <div className="text-red-600 text-sm">
          {errors.non_field_errors.join(", ")}
        </div>
      )}

      {/* Full Name */}
      <input
        type="text"
        name="full_name"
        value={formData.full_name}
        onChange={handleChange}
        placeholder="Full Name"
        className="w-full border rounded px-3 py-2"
        required
      />

      {/* Address */}
      <textarea
        name="address"
        value={formData.address}
        onChange={handleChange}
        placeholder="Street Address"
        className="w-full border rounded px-3 py-2"
        required
      />

      {/* Pincode */}
      <input
        type="text"
        name="postal_code"
        value={formData.postal_code}
        onChange={handleChange}
        placeholder="Pincode"
        className="w-full border rounded px-3 py-2"
        required
      />

      {/* Serviceability Info */}
      {checkingService ? (
        <p className="text-blue-500 text-sm">Checking delivery availability...</p>
      ) : formData.serviceable === false ? (
        <p className="text-red-600 text-sm">
          ❌ Sorry, we currently do not deliver to this pincode.
        </p>
      ) : formData.serviceable === true ? (
        <p className="text-green-600 text-sm">✅ Delivery available in this area (Prepaid only)</p>
      ) : null}

      {/* Locality / City / State */}
      {localities.length > 1 ? (
        <select
          name="locality"
          value={formData.locality || ""}
          onChange={handleChange}
          className="w-full border rounded px-3 py-2"
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
          className="w-full border rounded px-3 py-2"
          required
        />
      )}

      <input
        type="text"
        name="city"
        value={formData.city}
        onChange={handleChange}
        placeholder="City"
        className="w-full border rounded px-3 py-2"
        required
      />
      <input
        type="text"
        name="district"
        value={formData.district}
        onChange={handleChange}
        placeholder="District"
        className="w-full border rounded px-3 py-2"
        required
      />
      <input
        type="text"
        name="state"
        value={formData.state}
        onChange={handleChange}
        placeholder="State"
        className="w-full border rounded px-3 py-2"
        required
      />
      <input
        type="text"
        name="country"
        value={formData.country}
        onChange={handleChange}
        placeholder="Country"
        className="w-full border rounded px-3 py-2"
        required
      />
      <input
        type="text"
        name="phone_number"
        value={formData.phone_number}
        onChange={handleChange}
        placeholder="Phone Number"
        className="w-full border rounded px-3 py-2"
        required
      />

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={`px-4 py-2 text-white rounded ${
            formData.serviceable === false
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
          disabled={loading || formData.serviceable === false}
        >
          {loading ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
};

export default AddressForm;
