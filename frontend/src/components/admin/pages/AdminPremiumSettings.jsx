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
      setData(res.data);
      if (res.data.id) setId(res.data.id);
      setForm({
        amount: res.data.amount || "",
        offer_amount: res.data.offer_amount || "",
        offer_active: res.data.offer_active || false,
        offer_start: res.data.offer_start || "",
        offer_end: res.data.offer_end || "",
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
      // Prepare backend-compatible ISO datetime
      const payload = {
        ...form,
        offer_start: form.offer_start
          ? combineDateTime(
              form.offer_start.slice(0, 10),
              form.offer_start.slice(11, 16),
              "00:00"
            )
          : null,
        offer_end: form.offer_end
          ? combineDateTime(
              form.offer_end.slice(0, 10),
              form.offer_end.slice(11, 16),
              "23:59"
            )
          : null,
      };

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
      setEditModal(true); // allow new creation
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
      <div className="max-w-xl mx-auto bg-white p-5 rounded-lg shadow relative">
        <h2 className="text-xl font-bold mb-4">Premium Settings</h2>

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
          {data.offer_start
            ? new Date(data.offer_start).toLocaleString()
            : "—"}
        </p>
        <p>
          <strong>End:</strong>{" "}
          {data.offer_end ? new Date(data.offer_end).toLocaleString() : "—"}
        </p>

        {/* Edit & Delete Buttons Stacked */}
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

        {/* Delete Modal */}
        {deleteModal && (
          <div className="fixed inset-0  bg-opacity-50 backdrop-blur flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-lg w-96 text-center">
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
  // EDIT / CREATE MODAL MODE
  // ---------------------------
  return (
    <>
      {editModal && (
        <div className="fixed inset-0  bg-opacity-50 flex items-center justify-center z-50 backdrop-blur">
          <div className="bg-white p-5 rounded-lg shadow-lg w-96 relative">
            <h2 className="text-xl font-bold mb-4">
              {id ? "Edit Premium Settings" : "Create Premium Settings"}
            </h2>

            <label className="block mb-2 font-semibold">Premium Amount</label>
            <input
              type="number"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              className="w-full border p-2 mb-4 rounded"
            />

            <label className="block mb-2 font-semibold">Offer Amount</label>
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
            <label className="block mb-2 font-semibold">Offer Start</label>
            <div className="flex gap-2 mb-4">
              <input
                type="date"
                value={form.offer_start ? form.offer_start.slice(0, 10) : today}
                onChange={(e) =>
                  setForm({
                    ...form,
                    offer_start:
                      e.target.value +
                      "T" +
                      (form.offer_start?.slice(11, 16) || "00:00"),
                  })
                }
                className="w-1/2 border p-2 rounded"
              />
              <input
                type="time"
                value={form.offer_start ? form.offer_start.slice(11, 16) : "00:00"}
                onChange={(e) =>
                  setForm({
                    ...form,
                    offer_start:
                      (form.offer_start?.slice(0, 10) || today) + "T" + e.target.value,
                  })
                }
                className="w-1/2 border p-2 rounded"
              />
            </div>

            {/* Offer End */}
            <label className="block mb-2 font-semibold">Offer End</label>
            <div className="flex gap-2 mb-4">
              <input
                type="date"
                value={form.offer_end ? form.offer_end.slice(0, 10) : today}
                onChange={(e) =>
                  setForm({
                    ...form,
                    offer_end:
                      e.target.value +
                      "T" +
                      (form.offer_end?.slice(11, 16) || "23:59"),
                  })
                }
                className="w-1/2 border p-2 rounded"
              />
              <input
                type="time"
                value={form.offer_end ? form.offer_end.slice(11, 16) : "23:59"}
                onChange={(e) =>
                  setForm({
                    ...form,
                    offer_end:
                      (form.offer_end?.slice(0, 10) || today) + "T" + e.target.value,
                  })
                }
                className="w-1/2 border p-2 rounded"
              />
            </div>

            <div className="flex justify-end gap-4">
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
      )}
    </>
  );
};

export default AdminPremiumSettings;
