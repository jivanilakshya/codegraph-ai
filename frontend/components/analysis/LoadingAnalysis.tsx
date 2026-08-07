import { LoaderCircle } from "lucide-react";

export function LoadingAnalysis() {
  return (
    <div className="grid flex-1 place-items-center p-6 text-center">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <LoaderCircle className="size-4 animate-spin text-cyan-300" />
        Loading analysis...
      </div>
    </div>
  );
}
