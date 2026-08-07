import { CheckCircle2, LoaderCircle, RefreshCw } from "lucide-react";

type ASTToolbarProps = {
  nodeCount: number;
  maximumDepth: number;
  isParsing: boolean;
  onRefresh: () => void;
};

export function ASTToolbar({ nodeCount, maximumDepth, isParsing, onRefresh }: ASTToolbarProps) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-800 px-3 py-2 text-[10px] text-slate-500">
      <span>{nodeCount} nodes</span>
      <span className="text-slate-700">|</span>
      <span>Depth {maximumDepth}</span>
      <span className="ml-auto flex items-center gap-1 text-slate-400">
        {isParsing ? <LoaderCircle className="size-3 animate-spin text-cyan-300" /> : <CheckCircle2 className="size-3 text-emerald-400" />}
        {isParsing ? "Parsing" : "Parsed"}
      </span>
      <button type="button" onClick={onRefresh} disabled={isParsing} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Refresh AST">
        <RefreshCw className="size-3.5" />
      </button>
    </div>
  );
}
