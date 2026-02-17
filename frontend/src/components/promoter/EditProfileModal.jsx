import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, User, Phone, CreditCard, Building2 } from "lucide-react";

const EditProfileModal = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  onChange,
  errors,
  loading,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden relative z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-slate-900">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                Edit Details
              </h3>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 p-2 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">

              <div className="space-y-4">
                <InputGroup
                  label="Phone Number"
                  name="phone_number"
                  icon={<Phone size={16} />}
                  value={formData.phone_number}
                  onChange={onChange}
                  error={errors?.phone_number}
                />
              </div>

              <div className="pt-2 border-t border-slate-700/50">
                <p className="text-sm font-medium text-amber-500 mb-4 flex items-center gap-2">
                  <Building2 size={16} /> Bank Details
                </p>
                <div className="space-y-4">
                  <InputGroup
                    label="Account Holder Name"
                    name="account_holder_name"
                    value={formData.account_holder_name}
                    onChange={onChange}
                    error={errors?.account_holder_name}
                  />
                  <InputGroup
                    label="Bank Name"
                    name="bank_name"
                    value={formData.bank_name}
                    onChange={onChange}
                    error={errors?.bank_name}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <InputGroup
                      label="Account Number"
                      name="bank_account_number"
                      value={formData.bank_account_number}
                      onChange={onChange}
                      error={errors?.bank_account_number}
                    />
                    <InputGroup
                      label="IFSC Code"
                      name="ifsc_code"
                      value={formData.ifsc_code}
                      onChange={onChange}
                      error={errors?.ifsc_code}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-bold hover:shadow-lg hover:shadow-amber-500/20 transition-all text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>Processing...</>
                  ) : (
                    <><Save size={18} /> Save Changes</>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const InputGroup = ({ label, name, value, onChange, error, icon }) => (
  <div>
    <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">
      {label}
    </label>
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
          {icon}
        </div>
      )}
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        className={`w-full bg-slate-950 border ${error ? 'border-red-500/50 focus:border-red-500' : 'border-slate-800 focus:border-amber-500/50'} rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 ${error ? 'focus:ring-red-500/20' : 'focus:ring-amber-500/20'} transition-all ${icon ? 'pl-10' : ''}`}
        placeholder={`Enter ${label.toLowerCase()}`}
      />
    </div>
    {error && (
      <p className="text-red-400 text-xs mt-1.5 ml-1">{Array.isArray(error) ? error[0] : error}</p>
    )}
  </div>
);

export default EditProfileModal;

