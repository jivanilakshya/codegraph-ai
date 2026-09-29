"use client";

import { ArrowRight, ExternalLink, GitFork, Network, Phone } from "lucide-react";
import Link from "next/link";

import { buildSourceLocationUrl } from "@/lib/navigation";
import type { FileAnalysis, FileRelationship } from "@/types/workspace";

type RelationshipDetailsProps = {
  relationship: FileRelationship | null;
  analysis: FileAnalysis | null;
  projectId?: number | null;
  fileId?: number | null;
  filePath?: string | null;
  className?: string;
};

function getRelationshipIcon(type: string) {
  if (type === "CALLS") return <Phone className="size-4 shrink-0 text-[#A3A3A3]" />;
  if (type === "IMPORTS") return <GitFork className="size-4 shrink-0 text-[#A3A3A3]" />;
  return <Network className="size-4 shrink-0 text-[#A3A3A3]" />;
}

function shortPath(full: string): string {
  // Show last two path segments for readability
  const parts = full.split("/").filter(Boolean);
  if (parts.length <= 2) return full;
  return `…/${parts.slice(-2).join("/")}`;
}

/** Try to derive a symbol name from the source path for display. */
function deriveSymbol(path: string, symbols: FileAnalysis["symbols"] | undefined): string | null {
  if (!symbols) return null;
  const basename = path.split("/").pop() ?? path;
  // Strip extensions
  const name = basename.replace(/\.[^.]+$/, "");
  // Check if this name appears in any symbol group
  for (const group of Object.values(symbols)) {
    if (Array.isArray(group) && group.some((s) => s === name || s.includes(name))) {
      return group.find((s) => s === name || s.includes(name)) ?? null;
    }
  }
  return null;
}

export function RelationshipDetails({
  relationship,
  analysis,
  projectId,
  fileId,
  filePath,
  className,
}: RelationshipDetailsProps) {
  if (!relationship) {
    return (
      <aside
        className={`flex flex-col border-l border-[#242424] bg-[#080808] p-5 font-mono select-none ${
          className ?? "w-[300px] lg:w-[320px] shrink-0 h-full"
        }`}
      >
        <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#737373] mb-4">
          RELATIONSHIP DETAILS
        </h2>
        <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
          <Network className="size-7 text-[#333333] mb-3" />
          <p className="text-xs text-[#737373]">No relationship selected</p>
          <p className="mt-1 text-[11px] text-[#444444]">
            Click a relationship card to inspect its details.
          </p>
        </div>
      </aside>
    );
  }

  const { source, target, relationship: relType } = relationship;
  const icon = getRelationshipIcon(relType);

  const sourceSymbol = deriveSymbol(source, analysis?.symbols);
  const targetSymbol = deriveSymbol(target, analysis?.symbols);

  const canNavigate = projectId != null && (fileId != null || filePath != null);

  return (
    <aside
      className={`flex flex-col border-l border-[#242424] bg-[#080808] font-mono select-none overflow-y-auto ${
        className ?? "w-[300px] lg:w-[320px] shrink-0 h-full"
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-[#1A1A1A]">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#737373] mb-3">
          RELATIONSHIP DETAILS
        </h2>

        {/* Type Banner */}
        <div className="rounded-lg border border-[#292929] bg-[#050505] p-3.5">
          <div className="flex items-center gap-2 mb-2">
            {icon}
            <span className="inline-block rounded border border-[#242424] bg-[#0F0F0F] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#A3A3A3]">
              {relType}
            </span>
          </div>
          {/* Source → Target mini-flow */}
          <div className="flex items-center gap-1.5 mt-2.5">
            <span
              className="flex-1 truncate rounded border border-[#1E1E1E] bg-[#0A0A0A] px-2 py-1 text-[11px] text-white font-semibold"
              title={source}
            >
              {shortPath(source)}
            </span>
            <ArrowRight className="size-3 shrink-0 text-[#555555]" />
            <span
              className="flex-1 truncate rounded border border-[#1E1E1E] bg-[#0A0A0A] px-2 py-1 text-[11px] text-[#A3A3A3]"
              title={target}
            >
              {shortPath(target)}
            </span>
          </div>
        </div>
      </div>

      {/* Detail Grid */}
      <div className="p-4 space-y-3.5 border-b border-[#1A1A1A] text-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#555555] block mb-0.5">
            RELATIONSHIP TYPE
          </span>
          <span className="text-[12px] font-mono text-[#E5E5E5]">{relType}</span>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#555555] block mb-0.5">
            SOURCE FILE
          </span>
          <span className="text-[12px] font-mono text-[#E5E5E5] break-all leading-relaxed">
            {source}
          </span>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#555555] block mb-0.5">
            TARGET FILE
          </span>
          <span className="text-[12px] font-mono text-[#A3A3A3] break-all leading-relaxed">
            {target}
          </span>
        </div>

        {sourceSymbol && (
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#555555] block mb-0.5">
              SOURCE SYMBOL
            </span>
            <span className="text-[12px] font-mono text-[#E5E5E5]">{sourceSymbol}</span>
          </div>
        )}

        {targetSymbol && (
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#555555] block mb-0.5">
              TARGET SYMBOL
            </span>
            <span className="text-[12px] font-mono text-[#A3A3A3]">{targetSymbol}</span>
          </div>
        )}

        {/* View in Editor */}
        {canNavigate && (
          <div className="pt-2">
            <Link
              href={buildSourceLocationUrl({
                projectId,
                fileId,
                filePath,
              })}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#333333] bg-[#080808] px-3 py-2 text-xs font-medium text-[#E5E5E5] transition-all duration-150 hover:border-[#555555] hover:bg-[#151515] hover:text-white"
            >
              <ExternalLink className="size-3.5 text-[#A3A3A3]" />
              <span>View in Editor</span>
            </Link>
          </div>
        )}
      </div>

      {/* Source / Target File Paths Full */}
      <div className="p-4 flex-1 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#555555]">
          FULL PATHS
        </p>
        <div className="rounded-lg border border-[#1A1A1A] bg-[#050505] p-3 space-y-2">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#444444] block mb-0.5">
              SOURCE
            </span>
            <p className="font-mono text-[11px] text-[#737373] break-all leading-relaxed">
              {source}
            </p>
          </div>
          <div className="border-t border-[#1A1A1A] pt-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#444444] block mb-0.5">
              TARGET
            </span>
            <p className="font-mono text-[11px] text-[#555555] break-all leading-relaxed">
              {target}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
