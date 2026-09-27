"use client";

import { ArrowRight, GitFork, Network } from "lucide-react";

import type { FileRelationship } from "@/types/workspace";

type RelationshipListProps = { relationships: FileRelationship[] };

const relationshipTypes = ["IMPORTS", "CALLS", "HAS_METHOD", "EXTENDS", "EXPORTED_BY"];

function getBadgeStyles() {
  return "text-white bg-[#121212] border-[#303030]";
}

export function RelationshipList({ relationships }: RelationshipListProps) {
  return (
    <div className="space-y-6 p-4 font-mono text-xs bg-[#050505]">
      {relationshipTypes.map((relationshipType) => {
        const values = relationships.filter(({ relationship }) => relationship === relationshipType);
        if (!values.length) return null;

        return (
          <section key={relationshipType}>
            <h3 className="mb-2 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-[#A3A3A3]">
              <GitFork className="size-3.5 text-white" />
              {relationshipType}
            </h3>
            <ul className="space-y-2">
              {values.map(({ source, target }, index) => (
                <li
                  key={`${source}-${target}-${index}`}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-[#202020] bg-[#0A0A0A] px-3.5 py-2.5 text-xs text-white hover:border-[#383838] hover:bg-[#101010] transition-all"
                >
                  <span className="truncate text-white font-semibold max-w-[40%]" title={source}>
                    {source}
                  </span>

                  <div className="flex items-center gap-2 shrink-0 my-1 sm:my-0">
                    <span className="h-px w-6 bg-[#252525] hidden sm:inline-block" />
                    <span className={`inline-flex items-center gap-1 text-[9px] font-bold tracking-wider uppercase border px-2 py-0.5 rounded ${getBadgeStyles()}`}>
                      <Network className="size-3 text-white" />
                      {relationshipType}
                    </span>
                    <span className="h-px w-6 bg-[#252525] hidden sm:inline-block" />
                    <ArrowRight className="size-3 text-[#737373] sm:hidden" />
                  </div>

                  <span className="truncate text-[#A3A3A3] max-w-[40%] text-right" title={target}>
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

