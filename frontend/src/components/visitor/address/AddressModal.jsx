import { Dialog } from "@headlessui/react";
import AddressForm from "./AddressForm.jsx";

const AddressModal = ({ isOpen, onClose, initialData, onSave }) => {
  const handleSave = async (data) => {
    try {
      const savedData = await onSave(data); // will succeed or throw
      return { success: true, data: savedData }; // success response
    } catch (err) {
      return {
        success: false,
        errors: err.response?.data || { non_field_errors: ["Something went wrong"] },
      };
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50">
      <div className="flex items-center justify-center min-h-screen bg-black/40">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
          <Dialog.Title className="text-lg font-bold mb-4">
            {initialData ? "Edit Address" : "Add Address"}
          </Dialog.Title>
          <AddressForm initialData={initialData} onSave={handleSave} onCancel={onClose} />
        </div>
      </div>
    </Dialog>
  );
};

export default AddressModal;
