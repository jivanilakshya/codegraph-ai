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
    <div className="space-y-6 p-4 font-mono text-xs">
      {groups.map(({ key, label, icon: Icon }) => {
        const values = symbols[key];
        if (!values.length) return null;

        return (
          <section key={key}>
            <h3 className="mb-2 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-[#A3A3A3]">
              <Icon className="size-3.5 text-white" />
              {label}
            </h3>
            <ul className="space-y-1.5">
              {values.map((value, index) => (
                <li
                  key={`${value}-${index}`}
                  className="flex items-center justify-between gap-4 truncate rounded-lg border border-[#202020] bg-[#0A0A0A] px-3 py-2 text-xs text-white transition-all hover:border-[#383838] hover:bg-[#101010]"
                  title={value}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Icon className="size-3.5 shrink-0 text-[#737373]" />
                    <span className="truncate">{value}</span>
                  </div>
                  <span className="shrink-0 font-mono text-[9px] font-bold uppercase tracking-wider text-[#A3A3A3] bg-[#151515] px-2 py-0.5 rounded border border-[#252525]">
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

