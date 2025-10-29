import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner, Image } from 'react-bootstrap';
import { toast } from 'react-toastify';
import axiosInstance from '../../api/axiosinstance';


const ProfileEditModal = ({ show, onHide, user, setUser }) => {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    address: '',
    pincode: '',
    city: '',
    district: '',
    state: '',
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (show && user) {
      setForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone_number: user.phone_number || '',
        address: user.address || '',
        pincode: user.pincode || '',
        city: user.city || '',
        district: user.district || '',
        state: user.state || '',
      });
      setImageFile(null);
      setImagePreview(user.custom_user_profile || user.social_auth_pro_pic || null);
      setConfirmDelete(false);
    }
  }, [show, user]);

  useEffect(() => {
    const fetchAddress = async () => {
      if (form.pincode.length === 6) {
        try {
          const res = await fetch(`https://api.postalpincode.in/pincode/${form.pincode}`);
          const data = await res.json();
          const post = data?.[0]?.PostOffice?.[0];
          if (post) {
            setForm((prev) => ({
              ...prev,
              city: post.Name || '',
              district: post.District || '',
              state: post.State || '',
            }));
          } else {
            toast.warn('Invalid PIN code');
            setForm((prev) => ({ ...prev, city: '', district: '', state: '' }));
          }
        } catch {
          toast.error('Failed to fetch address');
        }
      } else {
        setForm((prev) => ({ ...prev, city: '', district: '', state: '' }));
      }
    };
    fetchAddress();
  }, [form.pincode]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const isSocialAuth = user.auth_provider !== "email";


  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImageFile(file || null);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(user.custom_user_profile || null);
    }
  };

  const handleClose = () => {
    setImageFile(null);
    setImagePreview(null);
    setConfirmDelete(false);
    onHide();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const userFormData = new FormData();

      // Append only actual fields
      Object.entries(form).forEach(([key, value]) => {
        if (value != null) userFormData.append(key, value);
      });

      // Append file only if user selected one
      if (imageFile) {
        console.log("Appending image file:", imageFile);
        userFormData.append('custom_user_profile', imageFile);
      }

      console.log("FormData entries before sending:");
      for (let pair of userFormData.entries()) {
        console.log(pair[0], pair[1]);
      }

      const res = await axiosInstance.patch('auth/profile/', userFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log("Response from profile update:", res.data);

      setUser(res.data);
      toast.success('Profile updated successfully');
      handleClose();
    } catch (err) {
      console.error("Profile update error:", err);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };


  const handleDelete = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('delete_profile_pic', 'true'); // only this

      console.log("Deleting profile pic, FormData:", Array.from(formData.entries()));

      const res = await axiosInstance.patch('auth/profile/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log("Response from delete profile pic:", res.data);

      setUser(res.data);
      toast.success('Profile picture deleted');
      setConfirmDelete(false);
      handleClose();
    } catch (err) {
      console.error("Delete profile pic error:", err);
      toast.error('Failed to delete picture');
      setConfirmDelete(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
  {show && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm p-4 sm:p-6">
      <div className="bg-white text-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-transform duration-300 scale-90 opacity-0 animate-modal-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Profile</h2>
          <button onClick={handleClose} className="text-2xl font-bold hover:text-gray-700">
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-5">
          {[
            { label: 'First Name', name: 'first_name' },
            { label: 'Last Name', name: 'last_name' },
            { label: 'Phone Number', name: 'phone_number', type: 'tel' },
            { label: 'Address', name: 'address' },
            { label: 'PIN Code', name: 'pincode' },
          ].map(({ label, name, type = 'text' }) => {
            const isNameField = name === 'first_name' || name === 'last_name';
            const isDisabled = isNameField && user.auth_provider !== 'email';

            return (
              <div key={name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                  type={type}
                  name={name}
                  value={form[name]}
                  onChange={handleInputChange}
                  placeholder={`Enter ${label.toLowerCase()}`}
                  disabled={isDisabled}
                  className={`w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDisabled
                      ? 'bg-gray-100 text-gray-500 border-gray-200'
                      : 'bg-white text-gray-900 border-gray-300'
                  }`}
                />
                {isDisabled && (
                  <p className="text-xs text-gray-500 italic mt-1">
                    Name is managed by your Google account and cannot be changed here.
                  </p>
                )}
              </div>
            );
          })}

          {['city', 'district', 'state'].map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.charAt(0).toUpperCase() + field.slice(1)}
              </label>
              <input
                type="text"
                value={form[field]}
                disabled
                className="w-full rounded-lg border border-gray-200 px-4 py-2 bg-gray-100 text-gray-500"
              />
            </div>
          ))}

          {!user.social_auth_pro_pic && (
            <>
              <hr className="my-4 border-gray-300" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profile Picture</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full text-sm text-gray-500"
                />
              </div>

              {imagePreview && (
                <div className="text-center mt-4">
                  <img
                    src={imagePreview}
                    alt="Profile Preview"
                    className="rounded-full mx-auto shadow-md"
                    style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                  />
                </div>
              )}

              {user.custom_user_profile && !imageFile && (
                <div className="text-center mt-4">
                  <button
                    onClick={() => setConfirmDelete(true)}
                    disabled={saving}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    Delete Picture
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row justify-end gap-4 px-6 py-4 border-t border-gray-200">
          <button
            onClick={handleClose}
            disabled={saving}
            className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  )}

  {/* Confirm Delete Modal */}
  {confirmDelete && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm p-4 sm:p-6">
      <div className="bg-white text-gray-900 rounded-xl shadow-2xl w-full max-w-md transform transition-transform duration-300 scale-90 opacity-0 animate-modal-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Confirm Delete</h2>
          <button
            onClick={() => setConfirmDelete(false)}
            className="text-2xl font-bold hover:text-gray-700"
          >
            &times;
          </button>
        </div>
        <div className="px-6 py-4 text-gray-700">
          Are you sure you want to delete your profile picture?
        </div>
        <div className="flex flex-col sm:flex-row justify-end gap-4 px-6 py-4 border-t border-gray-200">
          <button
            onClick={() => setConfirmDelete(false)}
            disabled={saving}
            className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={saving}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )}

  <style>
    {`
      @keyframes modal-in {
        0% { transform: scale(0.9); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
      }
      .animate-modal-in {
        animation: modal-in 0.25s ease-out forwards;
      }
    `}
  </style>
</>

  );
};

export default ProfileEditModal;