// import React, { useState, useEffect, useCallback } from "react";
// import axiosInstance from "../../../api/axiosinstance";
// import debounce from "lodash/debounce";
// import { toast } from "react-toastify";

// const AdminWarehouse = () => {
//   const [warehouses, setWarehouses] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [page, setPage] = useState(1);
//   const [previousPage, setPreviousPage] = useState(null);
//   const [nextPage, setNextPage] = useState(null);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [ordering, setOrdering] = useState("");
//   const [isEditing, setIsEditing] = useState(false);
//   const [editData, setEditData] = useState({});
//   const [updating, setUpdating] = useState(false);
//   const [deactivating, setDeactivating] = useState(false);

//   const [modalOpen, setModalOpen] = useState(false);
//   const [selectedWarehouse, setSelectedWarehouse] = useState(null);

//   const [createModalOpen, setCreateModalOpen] = useState(false);
//   const [creating, setCreating] = useState(false);
//   const [formData, setFormData] = useState({
//     name: "",
//     phone: "",
//     email: "",
//     address: "",
//     city: "",
//     pin: "",
//     country: "India",
//     return_address: "",
//     return_city: "",
//     return_state: "",
//     return_pin: "",
//     return_country: "India",
//   });

//   // Fetch warehouses
//   const fetchWarehouses = async () => {
//     setLoading(true);
//     try {
//       const params = { page };
//       if (searchTerm) params.search = searchTerm;
//       if (ordering) params.ordering = ordering;

//       const res = await axiosInstance.get("warehouses/list/", { params });
//       setWarehouses(res.data.results || []);
//       console.log(res.data.results);
      
//       setPreviousPage(res.data.previous);
//       setNextPage(res.data.next);
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to fetch warehouses");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchWarehouses();
//   }, [page, searchTerm, ordering]);

//   // Debounced search
//   const debouncedSearch = useCallback(
//     debounce((value) => {
//       setPage(1);
//       setSearchTerm(value);
//     }, 400),
//     []
//   );
//   const handleSearchChange = (e) => debouncedSearch(e.target.value);
//   const handleOrderingChange = (e) => setOrdering(e.target.value);

//   const openModal = (wh) => {
//     setSelectedWarehouse(wh);
//     setEditData({
//       name: wh.name,
//       phone: wh.phone,
//       email: wh.email,
//       address: wh.address,
//       city: wh.city,
//       pin: wh.pin,
//       country: wh.country,
//       return_address: wh.return_address,
//       return_city: wh.return_city,
//       return_state: wh.return_state,
//       return_pin: wh.return_pin,
//       return_country: wh.return_country,
//     });
//     setIsEditing(false);
//     setModalOpen(true);
//   };

//   const closeModal = () => {
//     setSelectedWarehouse(null);
//     setModalOpen(false);
//   };

//   const handlePageChange = (newPage) => {
//     if (newPage < 1) return;
//     setPage(newPage);
//   };

//   const handleFormChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   };

//   const handleCreateWarehouse = async (e) => {
//     e.preventDefault();
//     setCreating(true);
//     try {
//       const res = await axiosInstance.post("warehouses/", formData);
//       setCreateModalOpen(false);
//       setFormData({
//         name: "",
//         phone: "",
//         email: "",
//         address: "",
//         city: "",
//         pin: "",
//         country: "India",
//         return_address: "",
//         return_city: "",
//         return_state: "",
//         return_pin: "",
//         return_country: "India",
//       });
//       fetchWarehouses();
//       toast.success("Warehouse created & synced: " + res.data.delhivery_sync);
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to create warehouse");
//     } finally {
//       setCreating(false);
//     }
//   };

//   // Update warehouse
// const handleUpdateWarehouse = async () => {
//   if (!selectedWarehouse) return;
//   setUpdating(true);

//   try {
//     await axiosInstance.patch(
//       `warehouses/${selectedWarehouse.id}/`,
//       editData
//     );

//     toast.success("Warehouse updated successfully");
//     fetchWarehouses();
//     closeModal();
//   } catch (err) {
//     console.error(err);
//     toast.error("Failed to update warehouse");
//   } finally {
//     setUpdating(false);
//   }
// };

// // Deactivate warehouse
// const handleDeactivateWarehouse = async () => {
//   if (!selectedWarehouse) return;

//   if (!window.confirm("Are you sure you want to deactivate this warehouse?")) {
//     return;
//   }

//   setDeactivating(true);
//   try {
//     await axiosInstance.post(
//       `warehouses/${selectedWarehouse.id}/deactivate/`
//     );

//     toast.success("Warehouse deactivated successfully");
//     fetchWarehouses();
//     closeModal();
//   } catch (err) {
//     console.error(err);
//     toast.error("Failed to deactivate warehouse");
//   } finally {
//     setDeactivating(false);
//   }
// };

//   return (
//     <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
//   {/* Header */}
//   <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
//     <h1 className="text-3xl font-bold text-gray-800">Warehouses</h1>
//     <button
//       onClick={() => setCreateModalOpen(true)}
//       className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
//     >
//       + Add Warehouse
//     </button>
//   </div>

//   {/* Search & Sort */}
//   <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 mb-6">
//     <input
//       type="text"
//       placeholder="Search warehouses..."
//       onChange={handleSearchChange}
//       className="px-4 py-3 rounded-lg shadow-md focus:ring-2 focus:ring-blue-300 w-full sm:w-64"
//     />
//     <select
//       value={ordering}
//       onChange={handleOrderingChange}
//       className="px-4 py-3 rounded-lg shadow-md focus:ring-2 focus:ring-blue-300 w-full sm:w-48"
//     >
//       <option value="">Sort By</option>
//       <option value="name">Name (A → Z)</option>
//       <option value="-name">Name (Z → A)</option>
//       <option value="-created_at">Newest</option>
//       <option value="created_at">Oldest</option>
//     </select>
//   </div>

//   {/* Table */}
//   <div className="overflow-x-auto rounded-lg shadow bg-white">
//     <table className="min-w-full divide-y">
//       <thead className="bg-gray-50">
//         <tr>
//           <th className="px-6 py-3">Name</th>
//           <th className="px-6 py-3">City</th>
//           <th className="px-6 py-3">Pincode</th>
//           <th className="px-6 py-3">Status</th>
//           <th className="px-6 py-3">Delhivery</th>
//         </tr>
//       </thead>
//       <tbody>
//         {loading ? (
//           <tr><td colSpan={5} className="text-center py-6">Loading…</td></tr>
//         ) : warehouses.length === 0 ? (
//           <tr><td colSpan={5} className="text-center py-6">No warehouses</td></tr>
//         ) : (
//           warehouses.map(wh => (
//             <tr
//               key={wh.id}
//               onClick={() => openModal(wh)}
//               className="cursor-pointer hover:bg-gray-50"
//             >
//               <td className="px-6 py-4 font-medium">{wh.name}</td>
//               <td className="px-6 py-4">{wh.city}</td>
//               <td className="px-6 py-4">{wh.pin}</td>
//               <td className="px-6 py-4">
//                 <span className={`px-2 py-1 text-xs rounded-full ${wh.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
//                   {wh.is_active ? "Active" : "Inactive"}
//                 </span>
//               </td>
//               <td className="px-6 py-4">
//                 <span className={`px-2 py-1 text-xs rounded-full ${wh.delhivery_synced ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
//                   {wh.delhivery_synced ? "Synced" : "Not Synced"}
//                 </span>
//               </td>
//             </tr>
//           ))
//         )}
//       </tbody>
//     </table>
//   </div>

//   {/* Pagination */}
//   <div className="flex justify-between items-center mt-6">
//     <button disabled={!previousPage} onClick={() => setPage(page - 1)} className="btn">Previous</button>
//     <span>Page {page}</span>
//     <button disabled={!nextPage} onClick={() => setPage(page + 1)} className="btn">Next</button>
//   </div>

//   {/* VIEW / EDIT MODAL */}
//   {modalOpen && selectedWarehouse && (
//     <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur bg-opacity-40 p-4">
//       <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
//         <button onClick={closeModal} className="absolute top-3 right-3">✕</button>

//         <h2 className="text-xl font-bold mb-4">
//           {isEditing ? "Edit Warehouse" : selectedWarehouse.name}
//         </h2>

//         {!isEditing ? (
//           <>
//             <div className="text-sm space-y-2">
//               <div><b>Phone:</b> {selectedWarehouse.phone}</div>
//               <div><b>City:</b> {selectedWarehouse.city}</div>
//               <div><b>Pincode:</b> {selectedWarehouse.pin}</div>
//               <div><b>Status:</b> {selectedWarehouse.is_active ? "Active" : "Inactive"}</div>
//             </div>

//             <div className="flex gap-3 mt-6">
//               <button onClick={() => setIsEditing(true)} className="flex-1 bg-blue-600 text-white py-2 rounded">
//                 Edit
//               </button>

//               {selectedWarehouse.is_active && (
//                 <button
//                   onClick={handleDeactivateWarehouse}
//                   disabled={deactivating}
//                   className="flex-1 bg-red-600 text-white py-2 rounded"
//                 >
//                   {deactivating ? "Deactivating…" : "Deactivate"}
//                 </button>
//               )}
//             </div>
//           </>
//         ) : (
//           <>
//             <div className="space-y-3">
//               {Object.keys(editData).map(key => (
//                 <input
//                   key={key}
//                   value={editData[key] || ""}
//                   onChange={e => setEditData(p => ({ ...p, [key]: e.target.value }))}
//                   placeholder={key.replace("_", " ")}
//                   className="w-full px-4 py-2 border rounded"
//                 />
//               ))}
//             </div>

//             <div className="flex gap-3 mt-6">
//               <button
//                 onClick={handleUpdateWarehouse}
//                 disabled={updating}
//                 className="flex-1 bg-green-600 text-white py-2 rounded"
//               >
//                 {updating ? "Saving…" : "Save"}
//               </button>
//               <button
//                 onClick={() => setIsEditing(false)}
//                 className="flex-1 bg-gray-200 py-2 rounded"
//               >
//                 Cancel
//               </button>
//             </div>
//           </>
//         )}
//       </div>
//     </div>
//   )}
// </div>

//   );
// };

// export default AdminWarehouse;
