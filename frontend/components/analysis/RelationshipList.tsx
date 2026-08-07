import { ArrowRight, GitFork } from "lucide-react";

import type { FileRelationship } from "@/types/workspace";

type RelationshipListProps = { relationships: FileRelationship[] };

const relationshipTypes = ["IMPORTS", "CALLS", "HAS_METHOD", "EXTENDS", "EXPORTED_BY"];

export function RelationshipList({ relationships }: RelationshipListProps) {
  return (
    <div className="space-y-4 p-3">
      {relationshipTypes.map((relationshipType) => {
        const values = relationships.filter(({ relationship }) => relationship === relationshipType);
        if (!values.length) return null;

        return (
          <section key={relationshipType}>
            <h3 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              <GitFork className="size-3.5" />
              {relationshipType}
            </h3>
            <ul className="space-y-1">
              {values.map(({ source, target }, index) => (
                <li key={`${source}-${target}-${index}`} className="rounded bg-slate-800/60 px-2 py-1.5 text-xs text-slate-300">
                  <span className="block truncate font-mono" title={source}>{source}</span>
                  <span className="flex items-center gap-1 py-0.5 text-[10px] text-cyan-400"><ArrowRight className="size-3" /> {relationshipType}</span>
                  <span className="block truncate font-mono" title={target}>{target}</span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
