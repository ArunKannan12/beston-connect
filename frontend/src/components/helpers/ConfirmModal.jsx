import { Dialog } from "@headlessui/react";

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Yes",
  cancelText = "Cancel",
  loading = false,
}) => {
  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50">
      {/* Background overlay with blur */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal content */}
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-md relative flex flex-col">
          <Dialog.Title className="text-lg font-semibold text-gray-800 p-6 pb-4">
            {title}
          </Dialog.Title>

          <p className="text-gray-600 px-6 pb-6">{message}</p>

          {/* Buttons */}
          <div className="flex justify-end gap-3 p-6 pt-0 mt-auto flex-wrap sm:flex-nowrap">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-100 flex-1"
              disabled={loading}
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`px-4 py-2 text-sm rounded-lg text-white flex-1 ${
                loading ? "bg-red-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {loading ? "Processing..." : confirmText}
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default ConfirmModal;
