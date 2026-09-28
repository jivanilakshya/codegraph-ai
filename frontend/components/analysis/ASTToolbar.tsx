"use client";

import { CheckCircle2, LoaderCircle, RefreshCw } from "lucide-react";

type ASTToolbarProps = {
  nodeCount: number;
  maximumDepth: number;
  isParsing: boolean;
  onRefresh: () => void;
};

export function ASTToolbar({ nodeCount, maximumDepth, isParsing, onRefresh }: ASTToolbarProps) {
  return (
    <div className="flex items-center gap-3 border-b border-[#242424] bg-[#080808] px-4 py-2 select-none">
      {/* Node Metrics */}
      <div className="flex items-center gap-2 font-mono text-[11px] text-[#A3A3A3]">
        <span>
          <strong className="text-white font-semibold">{nodeCount}</strong> nodes
        </span>
        <span className="text-[#333333]">•</span>
        <span>
          Depth <strong className="text-white font-semibold">{maximumDepth}</strong>
        </span>
      </div>

      {/* Parse Status */}
      <div className="ml-auto flex items-center gap-2 font-mono text-[11px]">
        {isParsing ? (
          <div className="flex items-center gap-1.5 text-[#A3A3A3]">
            <LoaderCircle className="size-3 animate-spin text-[#A3A3A3]" />
            <span>Parsing…</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[#A3A3A3]">
            <CheckCircle2 className="size-3 text-[#A3A3A3]" />
            <span>Parsed</span>
          </div>
        )}

        {/* Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isParsing}
          className="rounded border border-[#292929] bg-[#050505] p-1 text-[#A3A3A3] transition-all duration-150 hover:border-[#555555] hover:bg-[#151515] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 ml-1"
          aria-label="Refresh AST"
          title="Re-parse source file"
        >
          <RefreshCw className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
