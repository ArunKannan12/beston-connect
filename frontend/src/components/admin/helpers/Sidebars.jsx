import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { FaChevronDown } from "react-icons/fa";

const Sidebars = ({ label, icon: Icon, subLinks,onClose }) => {
  const [open, setOpen] = useState(false);


  return (
    <div className="w-full">
      {/* Main link */}
      <div
        onClick={() => subLinks && setOpen(!open)}
        className="flex items-center justify-between p-3 rounded 
                   hover:bg-gray-200 cursor-pointer transition-colors duration-200"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="text-black transition-transform duration-200" />}
          {/* Title visible on all screens */}
          <span className="text-black font-medium">{label}</span>
        </div>

        {subLinks && (
          <FaChevronDown
            className={`text-gray-500 transition-transform duration-300 ease-in-out ${
              open ? "rotate-180" : ""
            }`}
          />
        )}
      </div>

      {/* Sub-links with slide + fade animation */}
      <div
        className={`ml-4 flex flex-col gap-1 transition-all duration-300 ease-in-out overflow-hidden ${
          open ? "max-h-96 opacity-100 mt-2" : "max-h-0 opacity-0"
        }`}
      >
        {subLinks &&
          subLinks.map((link, index) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={({ isActive }) =>
                `block p-2 rounded text-sm transition-all duration-300 ease-in-out transform ${
                  open ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0"
                } ${isActive ? "bg-blue-500 text-white shadow-sm" : "!text-black dark:!text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700"}`
              }
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              {link.name}
            </NavLink>
          ))}
      </div>
    </div>
  );
};

export default Sidebars;
