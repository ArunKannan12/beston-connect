import React from 'react'

const ReturnListShimmer = () => {
  return (
    <div className="max-w-5xl mx-auto mt-8 px-4 sm:px-6 py-6 font-sans animate-pulse">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 mb-6 text-center tracking-tight">
            My Returns
        </h1>

        <div className="space-y-8">
            {[...Array(4)].map((_, idx) => (
            <div key={idx} className="block border-b border-gray-200 pb-4">
                <div className="flex flex-row items-center gap-4">
                <div className="w-20 h-20 sm:w-24 sm:h-24 aspect-square bg-gray-200 rounded flex-shrink-0" />

                <div className="flex-1 space-y-2">
                    <div className="h-5 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                    <div className="h-4 bg-gray-200 rounded w-1/4" />
                </div>

                <div className="text-sm text-center sm:text-right">
                    <div className="inline-block px-3 py-1 rounded-full bg-gray-300 w-20 h-6" />
                </div>
                </div>
            </div>
            ))}
        </div>
    </div>
  )
}

export default ReturnListShimmer