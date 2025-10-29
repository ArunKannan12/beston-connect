import React from "react";

const ShippingInfo = ({ address }) => {
  if (!address) return null;

  return (
    <div className="max-w-screen-md mx-auto px-4 sm:px-6 lg:px-8 mb-10">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 text-center">📦 Shipping Address</h2>

        <div className="space-y-2 text-sm sm:text-base text-gray-700 text-center">
            <p className="font-semibold text-gray-900">{address.full_name}</p>
            <p>
            {address.address}, {address.locality}, {address.region}
            </p>
            <p>
            {address.district}, {address.state}, {address.city}
            </p>
            <p>
            {address.postal_code}, {address.country}
            </p>
            <p>
            📞 <span className="font-medium">{address.phone_number}</span>
            </p>
        </div>
    </div>
  );
};

export default ShippingInfo;