import { useState } from "react";


const CancelReasonModal = ({ isOpen, onClose, onConfirm }) => {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white/10 backdrop-blur z-50">
      <div className="bg-[#fffff0] p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl font-semibold mb-4">Cancel Order</h2>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Please enter a reason for cancellation..."
          className="w-full p-3 border rounded-md focus:outline-none focus:ring focus:ring-red-300"
          rows={3}
        />
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!reason.trim()) {
                toast.info("Please enter a reason");
                return;
              }
              onConfirm(reason);
              setReason("");
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelReasonModal