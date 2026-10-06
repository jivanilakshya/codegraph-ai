"use client";

import { Search, X } from "lucide-react";

type ASTSearchProps = {
  value: string;
  matchCount: number;
  onChange: (value: string) => void;
};

export function ASTSearch({ value, matchCount, onChange }: ASTSearchProps) {
  return (
    <div className="relative border-b border-white/[0.05] bg-[#060810] px-3 py-2 select-none shrink-0 z-10">
      <div className="flex items-center gap-2 h-8 px-2.5 rounded-md border border-white/[0.07] bg-white/[0.02] focus-within:border-[#00e5ff]/40 focus-within:bg-white/[0.04] transition-colors">
        <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search AST node types, functions, or identifiers…"
          className="w-full min-w-0 bg-transparent outline-none font-mono text-[11.5px] text-white placeholder:text-muted-foreground/60"
        />
        {value && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-[10px] text-[#00e5ff] px-1.5 py-0.5 rounded border border-[#00e5ff]/20 bg-[#00e5ff]/[0.06]">
              {matchCount} {matchCount === 1 ? "match" : "matches"}
            </span>
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-muted-foreground hover:text-white p-0.5"
              aria-label="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
