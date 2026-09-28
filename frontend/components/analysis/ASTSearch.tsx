"use client";

import { Search, X } from "lucide-react";

type ASTSearchProps = {
  value: string;
  matchCount: number;
  onChange: (value: string) => void;
};

export function ASTSearch({ value, matchCount, onChange }: ASTSearchProps) {
  return (
    <div className="relative border-b border-[#242424] bg-[#050505] px-3 py-2 select-none">
      <Search className="pointer-events-none absolute left-5 top-1/2 size-3.5 -translate-y-1/2 text-[#555555]" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search node types or identifiers..."
        className="h-7 w-full rounded-md border border-[#242424] bg-[#080808] py-1 pl-8 pr-16 font-mono text-[12px] text-white outline-none placeholder:text-[#555555] focus:border-[#555555] focus:shadow-[0_0_10px_rgba(255,255,255,0.03)] transition-all"
      />
      {value && (
        <>
          <span className="absolute right-9 top-1/2 -translate-y-1/2 font-mono text-[10px] text-[#A3A3A3]">
            {matchCount} {matchCount === 1 ? "match" : "matches"}
          </span>
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#555555] hover:text-white transition-colors"
            aria-label="Clear search"
          >
            <X className="size-3" />
          </button>
        </>
      )}
    </div>
  );
}
