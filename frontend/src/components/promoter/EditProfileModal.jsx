import React from "react";

const EditProfileModal = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  onChange,
  errors,
  loading,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 p-4">
  <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
    {/* Header */}
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-2xl font-bold text-gray-800">Edit Promoter Profile</h3>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-gray-600 transition"
      >
        ✕
      </button>
    </div>

    {/* Form */}
    <form onSubmit={onSubmit} className="space-y-4">
      {/** Input Field Template */}
      {[
        { label: "Phone Number", name: "phone_number" },
        { label: "Account Holder Name", name: "account_holder_name" },
        { label: "Bank Name", name: "bank_name" },
        { label: "Bank Account Number", name: "bank_account_number" },
        { label: "IFSC Code", name: "ifsc_code" },
      ].map((field) => (
        <div key={field.name}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
          </label>
          <input
            type="text"
            name={field.name}
            value={formData[field.name]}
            onChange={onChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
          {errors[field.name] && (
            <p className="text-red-500 text-sm mt-1">{errors[field.name][0]}</p>
          )}
        </div>
      ))}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? "Updating..." : "Save Changes"}
        </button>
      </div>
    </form>
  </div>
</div>

  );
};

export default EditProfileModal;
