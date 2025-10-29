import React from "react";

const ReturnsReplacements = ({ order, navigate }) => {
  if (!order || !order.items) return null;

  const hasEligibleItems = order.items.some(
    (item) =>
      (item.product_variant.allow_return && item.return_remaining_days > 0) ||
      (item.product_variant.allow_replacement && item.replacement_remaining_days > 0)
  );

  if (!hasEligibleItems) return null;

  return (
    <div className="mt-10 max-w-screen-md mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold mb-5 text-gray-900 text-center">🔁 Returns & Replacements</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {order.items.map((item) => {
            const { product_variant } = item;
            const returnEligible = product_variant.allow_return && item.return_remaining_days > 0;
            const replacementEligible =
                product_variant.allow_replacement && item.replacement_remaining_days > 0;

            if (!returnEligible && !replacementEligible) return null;

            const itemReturnRequest = order.return_request?.find((r) => r.item === item.id);
            const itemReplacementRequest = order.replacement_request?.find((r) => r.item === item.id);

            return (
                <div key={item.id} className="flex flex-col gap-2">
                {itemReturnRequest ? (
                    <button
                        onClick={() => {
                        console.log("Navigating to existing return request:", itemReturnRequest.id);
                        navigate(`/returns/${itemReturnRequest.id}`);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
                    >
                        View Return Request
                    </button>
                    ) : itemReplacementRequest ? (
                    <button
                        onClick={() => {
                        console.log("Navigating to existing replacement request:", itemReplacementRequest.id);
                        navigate(`/replacements/${itemReplacementRequest.id}`);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                    >
                        View Replacement Request
                    </button>
                    ) : (
                    <>
                        {returnEligible && (
                        <button
                            onClick={() => {
                            console.log("Requesting return for order:", order?.id, "item:", item?.id);
                            navigate(`/returns/create/${order?.id}?item=${item?.id}`);
                            }}
                            className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition"
                        >
                            Request Return
                        </button>
                        )}
                        {replacementEligible && (
                        <button
                            onClick={() => {
                            console.log("Requesting replacement for order:", order?.id, "item:", item?.id);
                            navigate(`/replacements/create/${order?.id}?item=${item?.id}`);
                            }}
                            className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition"
                        >
                            Request Replacement
                        </button>
                        )}
                    </>
                    )}

                </div>
            );
            })}
        </div>
        </div>
  );
};

export default ReturnsReplacements;