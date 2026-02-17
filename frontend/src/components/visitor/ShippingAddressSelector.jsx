import React, { useEffect, useState } from "react";
import axiosInstance from "../../api/axiosinstance";
import { toast } from "react-toastify";
import AddressModal from "./address/AddressModal";

const ShippingAddressSelector = ({ selectedAddress, setSelectedAddress, onChange }) => {
  const [shippingAddresses, setShippingAddresses] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const res = await axiosInstance.get("shipping-addresses/");
      const addresses = res.data.results || [];
      setShippingAddresses(addresses);
      if (addresses.length && !selectedAddress) setSelectedAddress(addresses[0]);
    } catch {
      toast.error("Failed to load shipping addresses");
    }
  };

  const handleSave = async (data) => {
    try {
      let res;
      if (editingAddress) {
        // Update existing address
        res = await axiosInstance.patch(`shipping-addresses/${editingAddress.id}/`, data);
        toast.success("Address updated successfully");
      } else {
        // Create new address
        res = await axiosInstance.post("shipping-addresses/", data);
        toast.success("Address added successfully");

      }
      const savedAddress = res.data;
      setSelectedAddress(savedAddress);
      if (onChange) onChange({ ...savedAddress });
      await fetchAddresses(); // Refresh list
      setEditingAddress(null);
      setIsModalOpen(false);

      return savedAddress; // return data on success
    } catch (err) {
      // propagate backend errors
      const errors = err.response?.data || { non_field_errors: ["Failed to save address"] };
      return Promise.reject({ response: { data: errors } });
    }
  };


  const confirmDelete = (addr) => {
    setAddressToDelete(addr);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!addressToDelete) return;
    setDeleting(true);
    try {
      await axiosInstance.delete(`shipping-addresses/${addressToDelete.id}/`);
      toast.success("Address deleted");
      setDeleteConfirmOpen(false);
      setAddressToDelete(null);
      fetchAddresses();
    } catch {
      toast.error("Failed to delete address");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {shippingAddresses.length === 0 && (
        <div className="text-center py-10 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
          <p className="text-gray-400 font-medium">No saved addresses found.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {shippingAddresses.map((addr) => (
          <div
            key={addr.id}
            onClick={() => {
              setSelectedAddress(addr);
              if (onChange) onChange({ ...addr });
            }}
            className={`group relative flex flex-col sm:flex-row items-start gap-6 p-6 rounded-[2.5rem] border-2 cursor-pointer transition-all duration-500 ${selectedAddress?.id === addr.id
                ? "border-blue-600 bg-blue-50/50 shadow-md ring-4 ring-blue-500/10 scale-[1.01]"
                : "border-gray-100 bg-white/50 hover:border-gray-200 hover:bg-white"
              }`}
          >
            {/* Selection indicator */}
            <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${selectedAddress?.id === addr.id ? "bg-blue-600 text-white rotate-[360deg]" : "bg-gray-100 text-gray-400"
              }`}>
              {selectedAddress?.id === addr.id ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </div>

            {/* Address Details */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-2">
                <p className={`text-lg font-black tracking-tight capitalize ${selectedAddress?.id === addr.id ? "text-blue-900" : "text-gray-900"}`}>
                  {addr.full_name}
                </p>
                <div className="flex items-center gap-2 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingAddress(addr); setIsModalOpen(true); }}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition"
                    title="Edit Address"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); confirmDelete(addr); }}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                    title="Delete Address"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <p className="text-gray-500 font-medium leading-relaxed mb-3">
                {addr.address}, {addr.locality && `${addr.locality}, `}
                {addr.city}, {addr.district && `${addr.district}, `}
                {addr.state} - <span className="font-bold text-gray-900">{addr.postal_code}</span>, {addr.country}
              </p>
              <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {addr.phone_number}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => { setEditingAddress(null); setIsModalOpen(true); }}
        className="w-full flex items-center justify-center gap-2 py-5 bg-gray-100 text-gray-900 rounded-[2rem] font-black text-lg hover:bg-gray-200 transition-all active:scale-[0.98] border-2 border-dashed border-gray-300 group"
      >
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        Add New Shipping Address
      </button>

      <AddressModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialData={editingAddress} onSave={handleSave} />

      {deleteConfirmOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-[100] p-4">
          <div className="bg-white rounded-[3rem] p-10 shadow-2xl w-full max-w-sm text-center">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Delete Address?</h3>
            <p className="text-gray-500 font-medium mb-8">
              Are you sure you want to remove <span className="font-bold text-gray-900">"{addressToDelete?.full_name}"</span>?
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-6 py-4 rounded-2xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-6 py-4 rounded-2xl font-bold text-white bg-red-600 hover:bg-red-700 transition shadow-lg shadow-red-200 disabled:opacity-50"
              >
                {deleting ? "Removing..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingAddressSelector;
