"use client";

import { Box, Braces, ChevronRight, Code2, FileOutput, Package, Variable } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import React from "react";

import type { FileSymbols, SymbolGroup } from "@/types/workspace";

type SymbolListProps = {
  symbols: FileSymbols;
  selectedSymbolName?: string | null;
  typeFilter?: string;
  onSelectSymbol?: (name: string, group: SymbolGroup) => void;
};

const groups: { key: SymbolGroup; label: string; icon: LucideIcon; description: string }[] = [
  { key: "imports", label: "Imports", icon: Package, description: "Imported module or declaration" },
  { key: "functions", label: "Functions", icon: Code2, description: "Callable function definition" },
  { key: "classes", label: "Classes", icon: Box, description: "Class or struct definition" },
  { key: "methods", label: "Methods", icon: Braces, description: "Class or object method" },
  { key: "variables", label: "Variables", icon: Variable, description: "Variable or constant declaration" },
  { key: "exports", label: "Exports", icon: FileOutput, description: "Exported symbol declaration" },
];

export function SymbolList({
  symbols,
  selectedSymbolName,
  typeFilter = "all",
  onSelectSymbol,
}: SymbolListProps) {
  const filteredGroups = groups.filter(
    (g) => typeFilter === "all" || typeFilter.toLowerCase() === g.key.toLowerCase()
  );

  return (
    <div className="space-y-6 p-4 font-mono text-xs select-none">
      {filteredGroups.map(({ key, label, icon: Icon, description }) => {
        const values = symbols[key];
        if (!values || !values.length) return null;

        return (
          <section key={key} className="space-y-2">
            {/* Section Header */}
            <h3 className="flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#737373] px-1 py-1 border-b border-[#1A1A1A]">
              <span className="flex items-center gap-2">
                <Icon className="size-3.5 text-[#A3A3A3]" />
                <span>{label}</span>
              </span>
              <span className="text-[10px] text-[#555555]">({values.length})</span>
            </h3>

            {/* Horizontal Symbol Cards */}
            <div className="space-y-2">
              {values.map((value, index) => {
                const isSelected = selectedSymbolName === value;

                return (
                  <div
                    key={`${value}-${index}`}
                    onClick={() => onSelectSymbol?.(value, key)}
                    className={`
                      group relative flex items-center justify-between gap-4 rounded-lg border p-3 cursor-pointer
                      transition-all duration-180 ease-out
                      ${
                        isSelected
                          ? "bg-[#151515] border-white text-white shadow-[0_0_20px_rgba(255,255,255,0.06),inset_0_0_15px_rgba(255,255,255,0.025)] -translate-y-0.5"
                          : "bg-[#080808] border-[#242424] text-[#E5E5E5] hover:bg-[#121212] hover:border-[#555555] hover:text-white hover:-translate-y-0.5 shadow-sm"
                      }
                    `}
                    title={value}
                  >
                    {/* Left: Icon & Symbol Name + Description */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="grid size-8 shrink-0 place-items-center rounded-md border border-[#242424] bg-[#050505]">
                        <Icon className="size-4 text-[#A3A3A3]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-semibold text-white truncate tracking-tight">
                          {value}
                        </div>
                        <div className="text-[11px] text-[#737373] truncate font-sans">
                          {description}
                        </div>
                      </div>
                    </div>

                    {/* Right: Badge & Chevron */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="shrink-0 font-mono text-[9px] font-bold uppercase tracking-wider text-[#A3A3A3] bg-[#0D0D0D] px-2 py-1 rounded border border-[#242424]">
                        {key.replace(/s$/, "")}
                      </span>
                      <ChevronRight className={`size-4 text-[#555555] group-hover:text-white transition-colors ${isSelected ? "text-white" : ""}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
