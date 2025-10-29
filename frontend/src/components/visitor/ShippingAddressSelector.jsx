import React, { useEffect, useState } from "react";
import axiosInstance from "../../api/axiosinstance";
import { toast } from "react-toastify";
import AddressModal from "./address/AddressModal";

const ShippingAddressSelector = ({ selectedAddress, setSelectedAddress,onChange }) => {
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
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Shipping Address</h2>

      {shippingAddresses.length === 0 && <p className="text-gray-500 mb-4">No saved addresses. Add one below 👇</p>}

      {shippingAddresses.map((addr) => (
        <div key={addr.id} className={`border rounded-lg p-4 mb-4 shadow-sm transition ${selectedAddress?.id === addr.id ? "border-blue-500 bg-blue-50" : "border-gray-300"}`}>
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="radio"
              name="selectedAddress"
              checked={selectedAddress?.id === addr.id}
              onChange={() => {
                setSelectedAddress(addr);
                if (onChange) onChange({ ...addr }); // trigger parent update
              }}
              className="mt-1 accent-blue-600"
            />
            <div className="rounded-2xl shadow-sm p-4 mb-4 flex items-start gap-4 hover:shadow-md transition">
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold">{addr.full_name.charAt(0).toUpperCase()}</div>
              <div className="flex-1 text-sm text-gray-800">
                <p className="font-semibold text-base capitalize">{addr.full_name}</p>
                <p className="text-gray-600 leading-snug">
                  {addr.address}, {addr.locality && `${addr.locality}, `}
                  {addr.city}, {addr.district && `${addr.district}, `}
                  {addr.state} - {addr.postal_code}, {addr.country}
                </p>
                <p className="text-xs text-gray-500 mt-1">📞 {addr.phone_number}</p>
                <div className="flex gap-4 mt-3">
                  <button onClick={() => { setEditingAddress(addr); setIsModalOpen(true); }} className="text-blue-600 text-sm font-medium hover:underline">✏️ Edit</button>
                  <button onClick={() => confirmDelete(addr)} className="text-red-500 text-sm font-medium hover:underline">🗑️ Delete</button>
                </div>
              </div>
            </div>
          </label>
        </div>
      ))}

      <button onClick={() => { setEditingAddress(null); setIsModalOpen(true); }} className="mt-2 px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700">
        + Add New Address
      </button>

      <AddressModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialData={editingAddress} onSave={handleSave} />

      {deleteConfirmOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 bg-opacity-40 backdrop-blur z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg w-96">
            <h3 className="text-lg font-semibold text-gray-800">Confirm Delete</h3>
            <p className="text-gray-600 mt-2">
              Are you sure you want to delete <span className="font-medium">{addressToDelete?.full_name}</span>'s address?
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setDeleteConfirmOpen(false)} className="px-4 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-100">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className={`px-4 py-2 text-sm rounded-lg text-white ${deleting ? "bg-red-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"}`}>
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingAddressSelector;
