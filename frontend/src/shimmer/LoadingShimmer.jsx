import React from 'react';
import { ClipLoader } from 'react-spinners';

const LoadingShimmer = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <ClipLoader color="#1D4ED8" size={50} />
    </div>
  );
};

export default LoadingShimmer;
