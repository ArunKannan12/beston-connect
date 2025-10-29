import React, { useEffect } from 'react';

const shimmerVars = {
  '--shimmer-color-light': '#f6f7f8',
  '--shimmer-color-dark': '#edeef1',
  '--shimmer-speed': '1.6s',
};

const shimmerStyle = {
  background: 'linear-gradient(90deg, var(--shimmer-color-light) 25%, var(--shimmer-color-dark) 37%, var(--shimmer-color-light) 63%)',
  backgroundSize: '400% 100%',
  animation: 'shimmer var(--shimmer-speed) ease-in-out infinite, pulse 2s ease-in-out infinite',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
};

const ShimmerCard = () => (
  <div className=" rounded-lg p-6 bg-white" style={shimmerVars}>
    <div style={shimmerStyle} className="h-32 rounded mb-4"></div>
    <div style={shimmerStyle} className="h-6 rounded w-3/4 mx-auto"></div>
  </div>
);

const injectGlobalStyles = () => {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes shimmer {
      0% { background-position: -400% 0; }
      100% { background-position: 400% 0; }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.85; }
    }
  `;
  document.head.appendChild(style);
};

const FeaturedShimmer = ({ count = 4 }) => {
  useEffect(() => {
    injectGlobalStyles();
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {Array(count).fill(0).map((_, idx) => (
        <ShimmerCard key={idx} />
      ))}
    </div>
  );
};

export default FeaturedShimmer;