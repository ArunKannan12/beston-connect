import { Fragment } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { Check, ChevronDown } from "lucide-react";

const VariantDropdown = ({ product, selectedVariant, setSelectedVariant, setQuantity, setCurrentImg }) => {
  return (
    <Listbox
      value={selectedVariant}
      onChange={(variant) => {
        setSelectedVariant(variant);
        setQuantity(1);
        setCurrentImg(0);
      }}
    >
      <div className="relative w-full">
        <Listbox.Button className="relative w-full border border-gray-300 rounded-md bg-white pl-3 pr-8 py-2 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 flex justify-between items-center">
          <span>{selectedVariant?.variant_name || "Select Variant"}</span>
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
          <Listbox.Options className="absolute mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto z-50">
            {product.variants.map((variant) => (
              <Listbox.Option
                key={variant.id}
                value={variant}
                className={({ active }) =>
                  `cursor-pointer select-none relative py-2 px-3 ${
                    active ? "bg-indigo-100 text-[#155dfc]" : "text-gray-700"
                  }`
                }
              >
                {({ selected }) => (
                  <>
                    <span className={`block truncate ${selected ? "font-semibold" : ""}`}>
                      {variant.variant_name}
                    </span>
                    {selected && <Check className="absolute right-3 top-2.5 h-4 w-4 text-indigo-600" />}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
};

export default VariantDropdown;
