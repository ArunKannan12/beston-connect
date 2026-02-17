import { Dialog } from "@headlessui/react";
import AddressForm from "./AddressForm.jsx";

const AddressModal = ({ isOpen, onClose, initialData, onSave }) => {
  const handleSave = async (data) => {
    try {
      const savedData = await onSave(data);
      return { success: true, data: savedData };
    } catch (err) {
      return {
        success: false,
        errors: err.response?.data || { non_field_errors: ["Something went wrong"] },
      };
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-[100] font-sans">
      <div className="flex items-center justify-center min-h-screen bg-black/60 backdrop-blur-sm px-4">
        <Dialog.Panel className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl mx-auto max-h-[90vh] flex flex-col overflow-hidden relative border border-white/20">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-8 right-8 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition z-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="p-10 pb-4">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">
              {Object.keys(initialData || {}).length > 0 ? "Edit Address" : "Add Address"}
            </h2>
            <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest mt-1">Shipping Details</p>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto px-10 pb-10 flex-1 custom-scrollbar">
            <AddressForm initialData={initialData} onSave={handleSave} onCancel={onClose} />
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default AddressModal;
