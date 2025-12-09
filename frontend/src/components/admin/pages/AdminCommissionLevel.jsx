import React, { useEffect, useState } from "react";
import axiosInstance from "../../../api/axiosinstance";
import { toast } from "react-toastify";
import { FiEdit } from "react-icons/fi";
import { MdDelete } from "react-icons/md";

const AdminCommissionLevel = () => {
  const [data, setData] = useState([]);
  const [form, setForm] = useState({ level: "", percentage: "" });
  const [selectedId, setSelectedId] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // ---------------------------
  // FETCH ALL COMMISSION LEVELS
  // ---------------------------
  const fetchLevels = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("commission-levels/");
      setData(res.data.results);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load commission levels");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLevels();
  }, []);

  // ---------------------------
  // INPUT CHANGE
  // ---------------------------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  // ---------------------------
  // CREATE / UPDATE
  // ---------------------------
  const handleSubmit = async () => {
    setSaving(true);
    try {
      if (selectedId) {
        await axiosInstance.patch(`commission-levels/${selectedId}/`, form);
        toast.success("Commission level updated!");
      } else {
        await axiosInstance.post("commission-levels/", form);
        toast.success("Commission level created!");
      }
      setEditModal(false);
      setForm({ level: "", percentage: "" });
      setSelectedId(null);
      fetchLevels();
    } catch (error) {
      console.error("Save error:", error);
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
      await axiosInstance.delete(`commission-levels/${selectedId}/`);
      toast.success("Commission level deleted!");
      setDeleteModal(false);
      setSelectedId(null);
      fetchLevels();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Delete failed!");
    }
  };

  // ---------------------------
  // LIST VIEW
  // ---------------------------
  return (
    <div className="max-w-3xl mx-auto p-5">
      <h2 className="text-2xl font-bold mb-5">Commission Levels</h2>

      {/* Add New Button */}
      <button
        onClick={() => {
          setForm({ level: "", percentage: "" });
          setSelectedId(null);
          setEditModal(true);
        }}
        className="mb-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Add New
      </button>

      {/* List Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">Level</th>
              <th className="p-3">Percentage</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="3" className="p-3 text-center">
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan="3" className="p-3 text-center">
                  No commission levels found.
                </td>
              </tr>
            ) : (
              data.map((level) => (
                <tr key={level.id} className="border-t">
                  <td className="p-3">{level.level}</td>
                  <td className="p-3">{level.percentage}%</td>
                  <td className="p-3 text-right flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setForm({ level: level.level, percentage: level.percentage });
                        setSelectedId(level.id);
                        setEditModal(true);
                      }}
                      className="bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                    >
                      <FiEdit />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedId(level.id);
                        setDeleteModal(true);
                      }}
                      className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                    >
                      <MdDelete />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* -------------------- */}
      {/* Edit/Create Modal */}
      {/* -------------------- */}
      {editModal && (
        <div className="fixed inset-0  bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-5 rounded-lg shadow-lg w-96">
            <h3 className="text-xl font-bold mb-4">
              {selectedId ? "Edit Commission Level" : "Add Commission Level"}
            </h3>

            <label className="block mb-2 font-semibold">Level</label>
            <input
              type="number"
              name="level"
              min="1"
              value={form.level}
              onChange={handleChange}
              className="w-full border p-2 mb-4 rounded"
            />

            <label className="block mb-2 font-semibold">Percentage</label>
            <input
              type="number"
              name="percentage"
              min="0"
              max="100"
              step="0.01"
              value={form.percentage}
              onChange={handleChange}
              className="w-full border p-2 mb-4 rounded"
            />

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
                {saving ? "Saving..." : selectedId ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- */}
      {/* Delete Modal */}
      {/* -------------------- */}
      {deleteModal && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 backdrop-blur">
          <div className="bg-white p-6 rounded shadow-lg w-96 text-center">
            <h3 className="text-lg font-bold mb-4">Confirm Delete</h3>
            <p>Are you sure you want to delete this commission level?</p>
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
};

export default AdminCommissionLevel;
