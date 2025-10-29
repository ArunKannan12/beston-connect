import { Check, ChevronDown } from "lucide-react";
import { Fragment } from "react";
import {Listbox,Transition} from '@headlessui/react'

const sortOptions = [
  { name: "Default", value: "" },
  { name: "Price: Low to High", value: "offer_price" },
  { name: "Price: High to Low", value: "-offer_price" },
  { name: "Newest First", value: "-product__created_at" },
  { name: "Oldest First", value: "product__created_at" },
  { name: "Name: A-Z", value: "product__name" },
  { name: "Name: Z-A", value: "-product__name" },
];

const CustomSortDropdown = ({ ordering, updateFilters }) => {
  const selected = sortOptions.find(option => option.value === ordering) || sortOptions[0];

  return (
    <div className="w-full sm:w-auto">
      <label className="block font-semibold mb-1 text-gray-700">Sort By</label>

      <Listbox value={selected} onChange={option => updateFilters({ ordering: option.value || undefined })}>
        <div className="relative">
          <Listbox.Button className="relative w-full sm:w-[180px] border border-gray-300 rounded-md p-2 pr-8 text-gray-700 shadow-sm text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white flex justify-between items-center">
            <span>{selected.name}</span>
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </Listbox.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-75"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Listbox.Options className="absolute mt-1 w-full sm:w-[180px] bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none z-50">
              {sortOptions.map((option, idx) => (
                <Listbox.Option
                  key={idx}
                  value={option}
                  className={({ active }) =>
                    `cursor-pointer select-none relative py-2 px-3 ${
                      active ? "bg-indigo-100 text-indigo-700" : "text-gray-700"
                    }`
                  }
                >
                  {({ selected: isSelected }) => (
                    <>
                      <span className={`block truncate ${isSelected ? "font-semibold" : ""}`}>
                        {option.name}
                      </span>
                      {isSelected && (
                        <Check className="absolute right-3 top-2.5 h-4 w-4 text-indigo-600" />
                      )}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
};

export default CustomSortDropdown;