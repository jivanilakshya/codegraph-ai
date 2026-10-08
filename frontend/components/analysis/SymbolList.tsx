"use client";

import {
  Box,
  Braces,
  ChevronRight,
  FileOutput,
  FunctionSquare,
  GitBranch,
  Search,
  Variable,
} from "lucide-react";
import React from "react";

import { cn } from "@/lib/cn";
import type { FileSymbols, SymbolGroup } from "@/types/workspace";

type SymbolListProps = {
  symbols: FileSymbols;
  selectedSymbolName?: string | null;
  selectedSymbolGroup?: SymbolGroup | null;
  typeFilter?: string;
  onSelectSymbol?: (name: string, group: SymbolGroup) => void;
  filePath?: string;
};

export const SYMBOL_TYPE_META: Record<
  SymbolGroup,
  {
    singular: string;
    plural: string;
    icon: React.ElementType;
    tone: string;
    border: string;
    bg: string;
    description: string;
  }
> = {
  functions: {
    singular: "Function",
    plural: "Functions",
    icon: FunctionSquare,
    tone: "text-primary",
    border: "border-primary/25",
    bg: "bg-primary/[0.06]",
    description: "Callable function definition",
  },
  classes: {
    singular: "Class",
    plural: "Classes",
    icon: Box,
    tone: "text-indigo-300",
    border: "border-indigo-400/25",
    bg: "bg-indigo-400/[0.06]",
    description: "Class or struct definition",
  },
  methods: {
    singular: "Method",
    plural: "Methods",
    icon: Braces,
    tone: "text-sky-300",
    border: "border-sky-400/25",
    bg: "bg-sky-400/[0.06]",
    description: "Class or object method",
  },
  variables: {
    singular: "Variable",
    plural: "Variables",
    icon: Variable,
    tone: "text-emerald-300",
    border: "border-emerald-400/25",
    bg: "bg-emerald-400/[0.06]",
    description: "Variable or constant declaration",
  },
  imports: {
    singular: "Import",
    plural: "Imports",
    icon: GitBranch,
    tone: "text-violet-300",
    border: "border-violet-400/25",
    bg: "bg-violet-400/[0.06]",
    description: "Imported module declaration",
  },
  exports: {
    singular: "Export",
    plural: "Exports",
    icon: FileOutput,
    tone: "text-amber-200",
    border: "border-amber-400/25",
    bg: "bg-amber-400/[0.06]",
    description: "Exported symbol declaration",
  },
};

const GROUP_ORDER: SymbolGroup[] = [
  "functions",
  "classes",
  "methods",
  "variables",
  "imports",
  "exports",
];

export function SymbolList({
  symbols,
  selectedSymbolName,
  selectedSymbolGroup,
  typeFilter = "all",
  onSelectSymbol,
}: SymbolListProps) {
  const normalizedFilter = typeFilter.toLowerCase();

  const groups = GROUP_ORDER.filter(
    (key) => normalizedFilter === "all" || normalizedFilter === key
  )
    .map((key) => ({
      key,
      meta: SYMBOL_TYPE_META[key],
      items: symbols[key] ?? [],
    }))
    .filter((g) => g.items.length > 0);

  if (!groups.length) {
    return (
      <div className="h-full min-h-64 flex items-center justify-center text-center p-6 select-none">
        <div>
          <Search className="w-6 h-6 mx-auto text-muted-foreground" />
          <p className="mt-3 text-[14px] font-medium text-white">No symbols match</p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            Adjust your search or type filter.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none">
      {groups.map((group, groupIndex) => {
        const { key, meta, items } = group;
        const Icon = meta.icon;

        return (
          <section
            key={key}
            className="reveal"
            style={{ ["--d" as string]: `${80 + groupIndex * 50}ms` }}
          >
            {/* Section Header */}
            <div className="flex items-center gap-2.5 mb-2.5 px-0.5">
              <span className="font-mono text-[9.5px] font-semibold text-primary/65">
                {String(groupIndex + 1).padStart(2, "0")}
              </span>
              <span className="cg-label !text-foreground/75 font-semibold">
                {meta.plural}
              </span>
              <span className="flex-1 h-px bg-gradient-to-r from-white/[0.08] to-transparent" />
              <span className="font-mono text-[10px] text-muted-foreground">
                ({items.length})
              </span>
            </div>

            {/* Symbols Cards */}
            <div className="space-y-1.5">
              {items.map((name, itemIndex) => {
                const isActive =
                  selectedSymbolName === name &&
                  (!selectedSymbolGroup || selectedSymbolGroup === key);

                return (
                  <button
                    key={`${key}-${name}-${itemIndex}`}
                    type="button"
                    onClick={() => onSelectSymbol?.(name, key)}
                    className={cn(
                      "ast-row group relative w-full grid grid-cols-[36px_minmax(0,1fr)_auto_16px] items-center gap-3 rounded-lg border px-3 py-2.5 text-left overflow-hidden transition-all duration-180",
                      isActive
                        ? "border-primary/45 bg-gradient-to-r from-primary/[0.12] to-primary/[0.03] shadow-[0_0_24px_-10px_rgba(0,229,255,0.75)]"
                        : "border-white/[0.065] bg-white/[0.018] hover:border-primary/25 hover:bg-white/[0.035]"
                    )}
                    style={{ animationDelay: `${groupIndex * 40 + itemIndex * 25}ms` }}
                    title={name}
                  >
                    {/* Active neon left bar */}
                    <span
                      className={cn(
                        "absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-primary transition-opacity duration-200",
                        isActive ? "opacity-100 shadow-[0_0_8px_#00e5ff]" : "opacity-0"
                      )}
                    />

                    {/* Icon container */}
                    <span
                      className={cn(
                        "w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 transition-colors",
                        isActive
                          ? "border-primary/30 bg-primary/[0.08]"
                          : "border-white/[0.07] bg-black/20"
                      )}
                    >
                      <Icon className={cn("w-4 h-4", meta.tone)} />
                    </span>

                    {/* Symbol name and description */}
                    <div className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block font-mono text-[13.5px] md:text-[14px] font-medium truncate",
                          isActive ? "text-white" : "text-foreground/90"
                        )}
                      >
                        {name}
                      </span>
                      <span className="block mt-0.5 text-[11.5px] text-muted-foreground truncate font-sans">
                        {meta.description}
                      </span>
                    </div>

                    {/* Symbol type badge */}
                    <span
                      className={cn(
                        "font-mono text-[9px] md:text-[9.5px] font-bold tracking-[0.12em] uppercase px-2 py-0.5 rounded border shrink-0",
                        isActive
                          ? "border-primary/30 bg-primary/[0.08] text-primary"
                          : "border-white/[0.07] bg-white/[0.02]",
                        meta.tone
                      )}
                    >
                      {meta.singular}
                    </span>

                    {/* Chevron right */}
                    <ChevronRight
                      className={cn(
                        "w-3.5 h-3.5 transition-transform shrink-0",
                        isActive
                          ? "text-primary translate-x-0.5"
                          : "text-white/20 group-hover:text-primary group-hover:translate-x-0.5"
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
