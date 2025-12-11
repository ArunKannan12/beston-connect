import React, { useEffect, useState } from "react";
import axiosInstance from "../../../api/axiosinstance";
import { toast } from "react-toastify";
import { FiEdit } from "react-icons/fi";
import { MdDelete } from "react-icons/md";

const AdminPremiumSettings = () => {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({
    amount: "",
    offer_amount: "",
    offer_active: false,
    offer_start: "",
    offer_end: "",
  });

  const [id, setId] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // ---------------------------
  // FETCH SETTINGS
  // ---------------------------
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("promoter/premium-amount/");
      setData(res.data || null);
      if (res.data?.id) setId(res.data.id);
      setForm({
        amount: res.data?.amount || "",
        offer_amount: res.data?.offer_amount || "",
        offer_active: res.data?.offer_active || false,
        offer_start: res.data?.offer_start || "",
        offer_end: res.data?.offer_end || "",
      });
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // ---------------------------
  // INPUT CHANGE
  // ---------------------------
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const combineDateTime = (date, time, defaultTime) => {
    const t = time || defaultTime;
    return `${date}T${t}:00Z`;
  };

  // ---------------------------
  // CREATE / UPDATE
  // ---------------------------
  const handleSubmit = async () => {
  setSaving(true);
  try {
    // If offer is active, ensure start and end datetime exist
    const now = new Date();
    const defaultStart = now.toISOString().slice(0, 10) + "T00:00:00Z";
    const defaultEnd = now.toISOString().slice(0, 10) + "T23:59:00Z";

    const payload = {
      ...form,
      offer_start: form.offer_active
        ? form.offer_start || defaultStart
        : null,
      offer_end: form.offer_active
        ? form.offer_end || defaultEnd
        : null,
    };
    console.log('payloas',payload);
    
    if (id) {
      await axiosInstance.patch(
        `admin/promoter/edit-premium-amt/${id}/`,
        payload
      );
      toast.success("Premium settings updated successfully!");
    } else {
      await axiosInstance.post(
        "admin/promoter/create-premium-amt/",
        payload
      );
      toast.success("Premium settings created successfully!");
    }

    setEditModal(false);
    fetchSettings();
  } catch (error) {
    console.error(error);
    let msg = "Something went wrong";
    if (error.response?.data) {
      const data = error.response.data;
      if (typeof data === "string") msg = data;
      else if (data.detail) msg = data.detail;
      else msg = Object.values(data).flat().join(" ");
    }
    toast.error(msg);
  } finally {
    setSaving(false);
  }
};


  // ---------------------------
  // DELETE
  // ---------------------------
  const handleDelete = async () => {
    try {
      await axiosInstance.delete(`admin/promoter/edit-premium-amt/${id}/`);
      toast.success("Premium settings deleted");
      setData(null);
      setId(null);
      setDeleteModal(false);
      setEditModal(true);
      setForm({
        amount: "",
        offer_amount: "",
        offer_active: false,
        offer_start: "",
        offer_end: "",
      });
    } catch {
      toast.error("Delete failed");
    }
  };

  // ---------------------------
  // VIEW MODE
  // ---------------------------
  if (!editModal && data) {
    return (
      <div className="max-w-xl mx-auto bg-white p-6 rounded-xl shadow relative">
        <h2 className="text-2xl font-bold mb-4">Premium Settings</h2>

        <p>
          <strong>Amount:</strong> ₹{data.amount}
        </p>
        <p>
          <strong>Offer Amount:</strong> {data.offer_amount || "—"}
        </p>
        <p>
          <strong>Offer Active:</strong> {data.offer_active ? "Yes" : "No"}
        </p>
        <p>
          <strong>Start:</strong>{" "}
          {data.offer_start ? new Date(data.offer_start).toLocaleString() : "—"}
        </p>
        <p>
          <strong>End:</strong>{" "}
          {data.offer_end ? new Date(data.offer_end).toLocaleString() : "—"}
        </p>

        {/* Edit & Delete Buttons */}
        <div className="absolute bottom-5 right-5 flex flex-col gap-2">
          <button
            onClick={() => setEditModal(true)}
            className="bg-blue-600 text-white p-3 rounded-full shadow-lg"
          >
            <FiEdit size={20} />
          </button>
          <button
            onClick={() => setDeleteModal(true)}
            className="bg-red-600 text-white p-3 rounded-full shadow-lg"
          >
            <MdDelete size={20} />
          </button>
        </div>

        {deleteModal && (
          <div className="fixed inset-0 bg-opacity-50 backdrop-blur flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-lg w-96 text-center">
              <h3 className="text-lg font-bold mb-4">Confirm Delete</h3>
              <p>Are you sure you want to delete this premium setting?</p>
              <div className="mt-5 flex justify-center gap-4">
                <button
                  onClick={handleDelete}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Delete
                </button>
                <button
                  onClick={() => setDeleteModal(false)}
                  className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------
  // NO DATA: SHOW PEN ICON
  // ---------------------------
  if (!editModal && !data) {
    return (
      <div className="flex flex-col justify-center items-center h-64 bg-gray-50 rounded-lg shadow-md p-6 text-center space-y-4">
        <div className="text-blue-600 text-6xl">
          <FiEdit />
        </div>
        <h2 className="text-xl font-semibold text-gray-800">
          No Premium Amount Set
        </h2>
        <p className="text-gray-600">
          You haven’t added any premium settings yet. Click the button below to create one.
        </p>
        <button
          onClick={() => setEditModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md shadow-md transition"
        >
          Add Premium Settings
        </button>
      </div>
    );
  }


  // ---------------------------
  // EDIT / CREATE MODAL
  // ---------------------------
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg w-96 relative">
        <h2 className="text-xl font-bold mb-4">
          {id ? "Edit Premium Settings" : "Create Premium Settings"}
        </h2>

        <label className="block mb-1 font-semibold">Premium Amount</label>
        <input
          type="number"
          name="amount"
          value={form.amount}
          onChange={handleChange}
          className="w-full border p-2 mb-4 rounded"
        />

        <label className="block mb-1 font-semibold">Offer Amount</label>
        <input
          type="number"
          name="offer_amount"
          value={form.offer_amount || ""}
          onChange={handleChange}
          className="w-full border p-2 mb-4 rounded"
        />

        <label className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            name="offer_active"
            checked={form.offer_active}
            onChange={handleChange}
          />
          Activate Offer
        </label>

        {/* Offer Start */}
        <label className="block mb-1 font-semibold">Offer Start</label>
        <input
          type="datetime-local"
          name="offer_start"
          value={
            form.offer_start
              ? form.offer_start.slice(0, 16)
              : `${today}T00:00`
          }
          onChange={(e) =>
            setForm({ ...form, offer_start: e.target.value })
          }
          className="w-full border p-2 mb-4 rounded"
        />

        {/* Offer End */}
        <label className="block mb-1 font-semibold">Offer End</label>
        <input
          type="datetime-local"
          name="offer_end"
          value={
            form.offer_end ? form.offer_end.slice(0, 16) : `${today}T23:59`
          }
          onChange={(e) => setForm({ ...form, offer_end: e.target.value })}
          className="w-full border p-2 mb-4 rounded"
        />

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={() => setEditModal(false)}
            className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {saving ? "Saving..." : id ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPremiumSettings;
