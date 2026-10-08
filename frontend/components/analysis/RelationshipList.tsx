"use client";

import { ArrowRight, ChevronRight } from "lucide-react";
import React, { useMemo } from "react";

import { cn } from "@/lib/cn";
import type { FileRelationship } from "@/types/workspace";

export type RelationshipListProps = {
  relationships: FileRelationship[];
  selectedRelationship?: FileRelationship | null;
  onSelectRelationship?: (rel: FileRelationship) => void;
  searchQuery?: string;
};

/** Abbreviate a full path or namespace to the final name for compact display */
function formatEntityName(name: string): string {
  if (!name) return "";
  // If it's a file path like backend/controllers/userController.js
  if (name.includes("/")) {
    return name.split("/").pop() ?? name;
  }
  return name;
}

function isSameRelationship(a: FileRelationship, b: FileRelationship): boolean {
  return (
    a.source === b.source &&
    a.target === b.target &&
    a.relationship === b.relationship
  );
}

const PREFERRED_ORDER = ["IMPORTS", "CALLS", "HAS_METHOD", "EXTENDS", "EXPORTED_BY"];

export function RelationshipList({
  relationships,
  selectedRelationship = null,
  onSelectRelationship,
  searchQuery = "",
}: RelationshipListProps) {
  // Filter by search query if provided
  const filteredRelationships = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return relationships;
    return relationships.filter(
      (rel) =>
        rel.source.toLowerCase().includes(q) ||
        rel.target.toLowerCase().includes(q) ||
        rel.relationship.toLowerCase().includes(q)
    );
  }, [relationships, searchQuery]);

  // Group by relationship type with IMPORTS and CALLS prioritized
  const groups = useMemo(() => {
    const map = new Map<string, FileRelationship[]>();
    for (const rel of filteredRelationships) {
      const type = rel.relationship;
      if (!map.has(type)) {
        map.set(type, []);
      }
      map.get(type)!.push(rel);
    }

    const sortedTypes: string[] = [];
    for (const type of PREFERRED_ORDER) {
      if (map.has(type)) {
        sortedTypes.push(type);
      }
    }
    for (const type of map.keys()) {
      if (!sortedTypes.includes(type)) {
        sortedTypes.push(type);
      }
    }

    return sortedTypes.map((type) => ({
      type,
      items: map.get(type) ?? [],
    }));
  }, [filteredRelationships]);

  if (filteredRelationships.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {groups.map((group, groupIndex) => {
        const isImport = group.type === "IMPORTS";
        const isCall = group.type === "CALLS";

        return (
          <section
            key={group.type}
            className="reveal"
            style={{ ["--d" as string]: `${80 + groupIndex * 60}ms` }}
          >
            {/* Section Category Header matching Figma */}
            <div className="flex items-center gap-2.5 mb-2.5 px-0.5">
              <span className="font-mono text-[9.5px] text-primary/70">
                {String(groupIndex + 1).padStart(2, "0")}
              </span>
              <span className="cg-label !text-foreground/80">{group.type}</span>
              <span className="flex-1 h-px bg-gradient-to-r from-white/[0.08] to-transparent" />
              <span className="font-mono text-[10px] text-muted-foreground">
                ({group.items.length})
              </span>
            </div>

            {/* Relationship Cards */}
            <div className="space-y-1.5">
              {group.items.map((rel, relIndex) => {
                const isSelected =
                  selectedRelationship !== null && isSameRelationship(rel, selectedRelationship);
                const sourceName = formatEntityName(rel.source);
                const targetName = formatEntityName(rel.target);

                return (
                  <button
                    key={`${rel.source}-${rel.relationship}-${rel.target}-${relIndex}`}
                    type="button"
                    onClick={() => onSelectRelationship?.(rel)}
                    className={cn(
                      "ast-row group relative w-full grid grid-cols-[minmax(90px,1fr)_auto_16px_minmax(80px,0.75fr)_16px] items-center gap-2 md:gap-3 rounded-lg border px-3 py-2.5 md:py-3 text-left overflow-hidden transition-all",
                      isSelected
                        ? "border-primary/40 bg-gradient-to-r from-primary/[0.09] to-primary/[0.02] shadow-[0_0_20px_-12px_rgba(0,229,255,0.75)]"
                        : "border-white/[0.065] bg-white/[0.018] hover:border-primary/25 hover:bg-white/[0.035]"
                    )}
                    style={{ animationDelay: `${groupIndex * 60 + relIndex * 24}ms` }}
                  >
                    {/* Active neon cyan left bar */}
                    <span
                      className={cn(
                        "absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-primary transition-opacity",
                        isSelected ? "opacity-100 shadow-[0_0_7px_#00e5ff]" : "opacity-0"
                      )}
                    />

                    {/* Source */}
                    <span
                      className={cn(
                        "font-mono text-[12px] md:text-[13.5px] truncate",
                        isSelected ? "text-white font-medium" : "text-foreground/90"
                      )}
                      title={rel.source}
                    >
                      {sourceName}
                    </span>

                    {/* Relationship Badge */}
                    <span
                      className={cn(
                        "font-mono text-[8.5px] md:text-[9.5px] tracking-[0.1em] px-2 py-0.5 rounded border uppercase shrink-0 font-semibold",
                        isImport
                          ? "text-violet-300 border-violet-400/25 bg-violet-400/[0.06]"
                          : isCall
                          ? "text-primary border-primary/25 bg-primary/[0.06]"
                          : "text-sky-300 border-sky-400/25 bg-sky-400/[0.06]"
                      )}
                    >
                      {rel.relationship}
                    </span>

                    {/* Arrow */}
                    <ArrowRight
                      className={cn(
                        "w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 transition-colors",
                        isImport
                          ? "text-violet-300/60"
                          : isCall
                          ? "text-primary/60"
                          : "text-sky-300/60"
                      )}
                    />

                    {/* Target */}
                    <span
                      className={cn(
                        "font-mono text-[12px] md:text-[13.5px] truncate",
                        isSelected ? "text-sky-200 font-medium" : "text-sky-200/75"
                      )}
                      title={rel.target}
                    >
                      {targetName}
                    </span>

                    {/* Arrow / Chevron */}
                    <ChevronRight
                      className={cn(
                        "w-3.5 h-3.5 shrink-0 transition-transform",
                        isSelected
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
