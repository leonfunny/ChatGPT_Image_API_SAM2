import { Loader2 } from "lucide-react";

const LoadingSuspense = () => {
  return (
    <div className="flex flex-col items-center justify-center h-64 w-full space-y-6 bg-gray-50 rounded-lg p-6">
      <div className="relative">
        <Loader2 className="h-12 w-12 text-black-500 animate-spin" />
        <span className="sr-only">Loading</span>
      </div>
    </div>
  );
};

export default LoadingSuspense;
