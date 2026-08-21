import { Box, Braces, Code2, FileOutput, Package, Variable } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { FileSymbols, SymbolGroup } from "@/types/workspace";

type SymbolListProps = { symbols: FileSymbols };

const groups: { key: SymbolGroup; label: string; icon: LucideIcon }[] = [
  { key: "imports", label: "Imports", icon: Package },
  { key: "exports", label: "Exports", icon: FileOutput },
  { key: "functions", label: "Functions", icon: Code2 },
  { key: "classes", label: "Classes", icon: Box },
  { key: "methods", label: "Methods", icon: Braces },
  { key: "variables", label: "Variables", icon: Variable },
];

export function SymbolList({ symbols }: SymbolListProps) {
  return (
    <div className="space-y-6 p-4">
      {groups.map(({ key, label, icon: Icon }) => {
        const values = symbols[key];
        if (!values.length) return null;

        return (
          <section key={key}>
            <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
              <Icon className="size-3.5" />
              {label}
            </h3>
            <ul className="space-y-1.5">
              {values.map((value, index) => (
                <li
                  key={`${value}-${index}`}
                  className="flex items-center justify-between gap-4 truncate rounded-lg border border-slate-800 bg-slate-950/30 px-3 py-1.5 font-mono text-xs text-slate-300 hover:border-slate-700 hover:bg-slate-900/40 hover:text-slate-200 transition-colors"
                  title={value}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Icon className="size-3.5 shrink-0 text-slate-500" />
                    <span className="truncate">{value}</span>
                  </div>
                  <span className="shrink-0 font-sans text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800/40">
                    {key.replace(/s$/, "")}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
