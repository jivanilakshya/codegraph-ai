"use client";

import { Braces, CheckCircle2, LoaderCircle, RefreshCw } from "lucide-react";

type ASTToolbarProps = {
  nodeCount: number;
  maximumDepth: number;
  isParsing: boolean;
  onRefresh: () => void;
  fileName?: string;
};

export function ASTToolbar({
  nodeCount,
  maximumDepth,
  isParsing,
  onRefresh,
  fileName,
}: ASTToolbarProps) {
  return (
    <div className="relative z-10 min-h-12 flex flex-wrap items-center justify-between gap-3 px-3 border-b border-white/[0.06] bg-[#080a12]/85 shrink-0 select-none">
      {/* File & AST Path Indicator */}
      <div className="flex items-center gap-2 min-w-0 font-mono text-[11px]">
        <Braces className="w-3.5 h-3.5 text-[#00e5ff] shrink-0" />
        <span className="text-muted-foreground hidden sm:inline">AST /</span>
        <span className="text-white truncate font-medium">{fileName ?? "Parsed Syntax Tree"}</span>
      </div>

      {/* Metrics & Parse Status */}
      <div className="flex items-center gap-3 font-mono text-[10.5px]">
        <div className="flex items-center gap-2 text-muted-foreground bg-white/[0.03] px-2.5 py-1 rounded border border-white/[0.06]">
          <span>
            <strong className="text-white font-semibold">{nodeCount}</strong> nodes
          </span>
          <span className="text-white/20">•</span>
          <span>
            depth <strong className="text-white font-semibold">{maximumDepth}</strong>
          </span>
        </div>

        {isParsing ? (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <LoaderCircle className="w-3 h-3 animate-spin text-[#00e5ff]" />
            <span className="hidden sm:inline">Parsing…</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span className="hidden sm:inline text-emerald-300/90">parsed</span>
          </div>
        )}

        <button
          type="button"
          onClick={onRefresh}
          disabled={isParsing}
          className="ast-control"
          title="Re-parse source file AST"
        >
          <RefreshCw className={`w-3 h-3 ${isParsing ? "animate-spin text-[#00e5ff]" : ""}`} />
          <span className="hidden sm:inline">Re-parse</span>
        </button>
      </div>
    </div>
  );
}
