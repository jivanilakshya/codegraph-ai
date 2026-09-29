"use client";

import { ArrowRight, GitFork, Network, Phone } from "lucide-react";

import type { FileRelationship } from "@/types/workspace";

type RelationshipListProps = {
  relationships: FileRelationship[];
  selectedRelationship?: FileRelationship | null;
  onSelectRelationship?: (rel: FileRelationship) => void;
};

const RELATIONSHIP_SECTIONS: { type: string; label: string }[] = [
  { type: "IMPORTS", label: "Imports" },
  { type: "CALLS", label: "Calls" },
  { type: "HAS_METHOD", label: "Has Method" },
  { type: "EXTENDS", label: "Extends" },
  { type: "EXPORTED_BY", label: "Exported By" },
];

function getSectionIcon(type: string) {
  if (type === "IMPORTS") return <GitFork className="size-3.5 text-[#A3A3A3]" />;
  if (type === "CALLS") return <Phone className="size-3.5 text-[#A3A3A3]" />;
  return <Network className="size-3.5 text-[#A3A3A3]" />;
}

/** Abbreviate a full path to the final filename for compact display. */
function fileName(path: string): string {
  return path.split("/").pop() ?? path;
}

function isSameRelationship(a: FileRelationship, b: FileRelationship): boolean {
  return a.source === b.source && a.target === b.target && a.relationship === b.relationship;
}

export function RelationshipList({
  relationships,
  selectedRelationship = null,
  onSelectRelationship,
}: RelationshipListProps) {
  return (
    <div className="space-y-5 p-4 font-mono text-xs">
      {RELATIONSHIP_SECTIONS.map(({ type, label }) => {
        const items = relationships.filter((r) => r.relationship === type);
        if (!items.length) return null;

        return (
          <section key={type}>
            {/* Section Header */}
            <h3 className="mb-2.5 flex items-center justify-between border-b border-[#1A1A1A] pb-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#737373]">
              <span className="flex items-center gap-2">
                {getSectionIcon(type)}
                <span>{label}</span>
              </span>
              <span className="text-[10px] text-[#444444]">({items.length})</span>
            </h3>

            {/* Relationship Cards */}
            <ul className="space-y-1.5">
              {items.map((rel, index) => {
                const isSelected =
                  selectedRelationship !== null && isSameRelationship(rel, selectedRelationship);

                return (
                  <li
                    key={`${rel.source}-${rel.relationship}-${rel.target}-${index}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectRelationship?.(rel)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectRelationship?.(rel);
                      }
                    }}
                    className={[
                      "group flex items-center gap-3 rounded-lg border px-3.5 py-2.5",
                      onSelectRelationship ? "cursor-pointer" : "cursor-default",
                      "transition-all duration-150 ease-out select-none",
                      isSelected
                        ? "border-white bg-[#151515] shadow-[0_0_18px_rgba(255,255,255,0.05),inset_0_0_12px_rgba(255,255,255,0.02)]"
                        : onSelectRelationship
                          ? "border-[#1E1E1E] bg-[#0A0A0A] hover:border-[#404040] hover:bg-[#101010]"
                          : "border-[#1E1E1E] bg-[#0A0A0A]",
                    ].join(" ")}
                  >
                    {/* Source file name */}
                    <span
                      className={[
                        "flex-1 truncate text-[12px] font-semibold min-w-0",
                        isSelected ? "text-white" : "text-[#E5E5E5] group-hover:text-white",
                      ].join(" ")}
                      title={rel.source}
                    >
                      {fileName(rel.source)}
                    </span>

                    {/* Direction arrow + type badge */}
                    <div className="flex shrink-0 items-center gap-1.5">
                      <div className="hidden h-px w-5 bg-[#2A2A2A] sm:block" />
                      <span
                        className={[
                          "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                          isSelected
                            ? "border-[#484848] bg-[#1C1C1C] text-[#E5E5E5]"
                            : "border-[#292929] bg-[#111111] text-[#737373] group-hover:border-[#3A3A3A] group-hover:text-[#A3A3A3]",
                        ].join(" ")}
                      >
                        {getSectionIcon(type)}
                        <span>{type}</span>
                      </span>
                      <ArrowRight
                        className={[
                          "size-3.5 shrink-0 transition-colors duration-150",
                          isSelected ? "text-[#A3A3A3]" : "text-[#444444] group-hover:text-[#737373]",
                        ].join(" ")}
                      />
                      <div className="hidden h-px w-5 bg-[#2A2A2A] sm:block" />
                    </div>

                    {/* Target file name */}
                    <span
                      className={[
                        "flex-1 truncate text-right text-[12px] min-w-0",
                        isSelected ? "text-[#A3A3A3]" : "text-[#737373] group-hover:text-[#A3A3A3]",
                      ].join(" ")}
                      title={rel.target}
                    >
                      {fileName(rel.target)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
