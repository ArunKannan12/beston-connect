import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import axiosInstance from "../../../api/axiosinstance";

const AdminContactMessages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null); // 🔹 for modal
  const [modalOpen, setModalOpen] = useState(false);

  // 🔹 Fetch all messages
  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get("admin/contact/");
      setMessages(data.results);
    } catch (err) {
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  // 🔹 Fetch single message detail
  const fetchMessageDetail = async (id) => {
    try {
      const { data } = await axiosInstance.get(`admin/contact/${id}/`);
      setSelectedMessage(data);
      setModalOpen(true);
    } catch (err) {
      toast.error("Failed to load message detail");
    }
  };

  // 🔹 Mark message as resolved
  const handleResolve = async (id) => {
    try {
      await axiosInstance.patch(`admin/contact/${id}/resolve/`);
      toast.success("Message marked as resolved");
      setModalOpen(false);
      fetchMessages();
    } catch (err) {
      toast.error("Failed to resolve message");
    }
  };

  // 🔹 Delete message
  const handleDelete = async (id) => {
    try {
      await axiosInstance.delete(`admin/contact/${id}/delete/`);
      toast.success("Message deleted");
      setModalOpen(false);
      setMessages((prev) => prev.filter((msg) => msg.id !== id));
    } catch (err) {
      toast.error("Failed to delete message");
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white rounded-2xl shadow-lg">
  <h2 className="text-3xl font-bold mb-6 text-gray-900">Admin: Contact Messages</h2>

  {loading ? (
    <p className="text-gray-500">Loading messages...</p>
  ) : (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-600 uppercase text-xs tracking-wider">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Subject</th>
            <th className="px-4 py-3">Message</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {messages.map((msg) => (
            <tr
              key={msg.id}
              className="hover:bg-gray-50 transition cursor-pointer"
              onClick={() => fetchMessageDetail(msg.id)}
            >
              <td className="px-4 py-3 font-medium text-gray-900">{msg.name}</td>
              <td className="px-4 py-3 text-gray-700">{msg.email}</td>
              <td className="px-4 py-3 text-gray-800">{msg.subject}</td>
              <td className="px-4 py-3 text-gray-600 truncate max-w-xs">
                {msg.message}
              </td>
              <td className="px-4 py-3">
                {msg.is_resolved ? (
                  <span className="text-green-600 font-semibold">Resolved</span>
                ) : (
                  <span className="text-red-600 font-semibold">Pending</span>
                )}
              </td>
              <td className="px-4 py-3 flex gap-2">
                {!msg.is_resolved && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResolve(msg.id);
                    }}
                    className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-xs"
                  >
                    Resolve
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(msg.id);
                  }}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {messages.length === 0 && (
            <tr>
              <td colSpan="6" className="text-center py-6 text-gray-500">
                No messages found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )}

  {/* 🔹 Modal */}
  {modalOpen && selectedMessage && (
    <div className="fixed inset-0 backdrop-blur flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center border-b px-6 py-4">
          <h3 className="text-xl font-bold text-gray-900">
            {selectedMessage.subject}
          </h3>
          <button
            onClick={() => setModalOpen(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p className="text-gray-700 mb-4">{selectedMessage.message}</p>
          <p className="text-sm text-gray-500 mb-2">
            From: <span className="font-medium">{selectedMessage.name}</span> (
            {selectedMessage.email})
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Status:{" "}
            {selectedMessage.is_resolved ? (
              <span className="text-green-600 font-semibold">Resolved</span>
            ) : (
              <span className="text-red-600 font-semibold">Pending</span>
            )}
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-4 border-t px-6 py-4 bg-gray-50">
          {!selectedMessage.is_resolved && (
            <button
              onClick={() => handleResolve(selectedMessage.id)}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              Resolve
            </button>
          )}
          <button
            onClick={() => handleDelete(selectedMessage.id)}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )}
</div>
  );
};

export default AdminContactMessages;