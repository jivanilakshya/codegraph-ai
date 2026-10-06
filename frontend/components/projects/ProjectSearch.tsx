"use client";

import { Search, X } from "lucide-react";

type ProjectSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

export function ProjectSearch({ value, onChange }: ProjectSearchProps) {
  return (
    <label className="group flex-1 flex items-center gap-3 h-11 px-4 rounded-xl border border-white/[0.08] bg-white/[0.02] backdrop-blur focus-within:border-primary/40 focus-within:bg-white/[0.035] focus-within:shadow-[0_0_0_3px_rgba(0,229,255,0.06),0_0_24px_-8px_rgba(0,229,255,0.4)] transition-all duration-300">
      <Search className="w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type="text"
        placeholder="Search projects by name or repository URL..."
        className="flex-1 min-w-0 bg-transparent outline-none text-[14px] text-white placeholder:text-muted-foreground/70 font-sans"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="p-1 rounded text-muted-foreground hover:text-white transition-colors"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </label>
  );
}


