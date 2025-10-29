import { Loader } from "lucide-react";

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <Loader className="w-20 h-20 text-blue-600 animate-spin" />
    </div>
  );
};

export default LoadingScreen;