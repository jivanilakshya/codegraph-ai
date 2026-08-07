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
    <div className="space-y-4 p-3">
      {groups.map(({ key, label, icon: Icon }) => {
        const values = symbols[key];
        if (!values.length) return null;

        return (
          <section key={key}>
            <h3 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              <Icon className="size-3.5" />
              {label}
            </h3>
            <ul className="space-y-1">
              {values.map((value, index) => (
                <li key={`${value}-${index}`} className="truncate rounded bg-slate-800/60 px-2 py-1.5 font-mono text-xs text-slate-300" title={value}>
                  {value}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
