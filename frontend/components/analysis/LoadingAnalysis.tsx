import { LoaderCircle } from "lucide-react";

export function LoadingAnalysis() {
  return (
    <div className="grid flex-1 place-items-center p-6 text-center font-mono text-xs">
      <div className="flex items-center gap-2 text-[#A3A3A3]">
        <LoaderCircle className="size-4 animate-spin text-white" />
        Loading analysis...
      </div>
    </div>
  );
}

