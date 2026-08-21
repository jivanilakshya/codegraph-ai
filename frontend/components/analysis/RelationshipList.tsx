"use client";

import { ArrowRight, GitFork, Network } from "lucide-react";

import type { FileRelationship } from "@/types/workspace";

type RelationshipListProps = { relationships: FileRelationship[] };

const relationshipTypes = ["IMPORTS", "CALLS", "HAS_METHOD", "EXTENDS", "EXPORTED_BY"];

function getBadgeStyles(type: string) {
  switch (type) {
    case "IMPORTS":
      return "text-blue-400 bg-blue-950/30 border-blue-800/30";
    case "CALLS":
      return "text-violet-400 bg-violet-950/30 border-violet-800/30";
    case "EXPORTED_BY":
      return "text-emerald-400 bg-emerald-950/30 border-emerald-800/30";
    default:
      return "text-slate-400 bg-slate-900/60 border-slate-800/40";
  }
}

export function RelationshipList({ relationships }: RelationshipListProps) {
  return (
    <div className="space-y-6 p-4 bg-[#080d14]">
      {relationshipTypes.map((relationshipType) => {
        const values = relationships.filter(({ relationship }) => relationship === relationshipType);
        if (!values.length) return null;

        return (
          <section key={relationshipType}>
            <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
              <GitFork className="size-3.5" />
              {relationshipType}
            </h3>
            <ul className="space-y-2">
              {values.map(({ source, target }, index) => (
                <li
                  key={`${source}-${target}-${index}`}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/20 px-3.5 py-2.5 font-mono text-xs text-slate-300 hover:border-slate-700 hover:bg-slate-950/60 transition-colors"
                >
                  <span className="truncate text-slate-200 font-semibold group-hover:text-slate-100 max-w-[40%]" title={source}>
                    {source}
                  </span>

                  <div className="flex items-center gap-2 shrink-0 my-1 sm:my-0">
                    <span className="h-px w-6 bg-slate-800 hidden sm:inline-block" />
                    <span className={`inline-flex items-center gap-1 text-[9px] font-bold tracking-wider uppercase border px-2 py-0.5 rounded ${getBadgeStyles(relationshipType)}`}>
                      <Network className="size-3" />
                      {relationshipType}
                    </span>
                    <span className="h-px w-6 bg-slate-800 hidden sm:inline-block" />
                    <ArrowRight className="size-3 text-slate-500 sm:hidden" />
                  </div>

                  <span className="truncate text-slate-300 max-w-[40%] text-right" title={target}>
                    {target}
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
