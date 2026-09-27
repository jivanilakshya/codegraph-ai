import { CheckCircle2, LoaderCircle, RefreshCw } from "lucide-react";

type ASTToolbarProps = {
  nodeCount: number;
  maximumDepth: number;
  isParsing: boolean;
  onRefresh: () => void;
};

export function ASTToolbar({ nodeCount, maximumDepth, isParsing, onRefresh }: ASTToolbarProps) {
  return (
    <div className="flex items-center gap-2 border-b border-[#202020] bg-[#0A0A0A] px-4 py-2 font-mono text-[10px] text-[#A3A3A3] select-none">
      <span>{nodeCount} nodes</span>
      <span className="text-[#333333]">|</span>
      <span>Depth {maximumDepth}</span>
      <span className="ml-auto flex items-center gap-1.5 text-white font-medium">
        {isParsing ? <LoaderCircle className="size-3 animate-spin text-white" /> : <CheckCircle2 className="size-3 text-white" />}
        {isParsing ? "Parsing" : "Parsed"}
      </span>
      <button
        type="button"
        onClick={onRefresh}
        disabled={isParsing}
        className="rounded p-1 text-[#737373] hover:bg-[#151515] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        aria-label="Refresh AST"
      >
        <RefreshCw className="size-3.5" />
      </button>
    </div>
  );
}

