"use client";

import {
  Braces,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";

import { KIND_VISUAL, type HierarchyNode } from "@/components/analysis/ASTHierarchy";
import { buildSourceLocationUrl } from "@/lib/navigation";
import type { RepositoryFile } from "@/types/workspace";

type ASTDetailsProps = {
  selectedNode: HierarchyNode | null;
  selectedFile: RepositoryFile | null;
  projectId?: number | null;
  className?: string;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[84px_1fr] gap-2 py-2 border-b border-white/[0.045] last:border-0 items-start">
      <dt className="font-mono text-[10.5px] tracking-[0.12em] uppercase text-white/40 pt-0.5 font-medium">{label}</dt>
      <dd className="font-mono text-[12px] text-white/85 break-all leading-relaxed">{value}</dd>
    </div>
  );
}

export function ASTDetails({ selectedNode, selectedFile, projectId, className }: ASTDetailsProps) {
  const [sourceOpen, setSourceOpen] = useState(false);

  const fileName = selectedFile
    ? selectedFile.path.split("/").pop() ?? selectedFile.path
    : null;

  const lang =
    selectedFile?.language ??
    (fileName?.endsWith(".py")
      ? "Python"
      : fileName?.endsWith(".ts") || fileName?.endsWith(".tsx")
      ? "TypeScript"
      : fileName?.endsWith(".js") || fileName?.endsWith(".jsx")
      ? "JavaScript"
      : fileName?.endsWith(".rs")
      ? "Rust"
      : fileName?.endsWith(".go")
      ? "Go"
      : fileName?.endsWith(".md")
      ? "Markdown"
      : "Code");

  if (!selectedNode) {
    return (
      <aside className={`flex flex-col border-l border-white/[0.06] bg-gradient-to-b from-[#0a0d16]/95 to-[#070910]/95 ${className ?? ""}`}>
        <div className="h-11 flex items-center gap-2 px-3.5 border-b border-white/[0.06] shrink-0">
          <Braces className="w-4 h-4 text-[#00e5ff]/70" />
          <span className="font-mono text-[11.5px] tracking-[0.12em] uppercase text-white/50 font-semibold">AST Details</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-5 py-10">
          <span className="mx-auto w-11 h-11 rounded-2xl border border-white/[0.08] bg-white/[0.02] flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            <Braces className="w-5 h-5 text-white/30" strokeWidth={1.5} />
          </span>
          <p className="text-[14px] font-medium text-white/70">No element selected</p>
          <p className="mt-1 font-mono text-[11.5px] leading-relaxed text-white/30">
            Click any AST element<br />to inspect its details.
          </p>
        </div>
      </aside>
    );
  }

  const visual = KIND_VISUAL[selectedNode.kind] ?? KIND_VISUAL.other;
  const Icon = visual.icon;
  const rawNode = selectedNode.rawNode;
  const startLine = rawNode.start_point.row + 1;
  const endLine = rawNode.end_point.row + 1;
  const startCol = rawNode.start_point.column;
  const endCol = rawNode.end_point.column;
  const canNavigate = projectId != null && selectedFile != null;

  // Children summary
  const childKinds = selectedNode.children.map((c) => c.label);
  const childSummary =
    childKinds.length > 4
      ? [...childKinds.slice(0, 3), `+${childKinds.length - 3} more`].join(", ")
      : childKinds.join(", ");

  return (
    <aside className={`flex flex-col border-l border-white/[0.06] bg-gradient-to-b from-[#0a0d16]/95 to-[#070910]/95 overflow-y-auto ${className ?? ""}`}>
      {/* Header */}
      <div className="h-11 flex items-center gap-2 px-3.5 border-b border-white/[0.06] shrink-0 sticky top-0 bg-[#0b0e18]/95 backdrop-blur z-10">
        <Braces className="w-4 h-4 text-[#00e5ff]/80" />
        <span className="font-mono text-[11.5px] tracking-[0.12em] uppercase text-white/50 font-semibold">AST Details</span>
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00e5ff] shadow-[0_0_6px_#00e5ff]" />
      </div>

      <div key={selectedNode.id} className="p-4 space-y-4 cg-pop">
        {/* Summary card */}
        <div className="rounded-xl border border-[#00e5ff]/20 bg-[#00e5ff]/[0.035] p-3.5">
          <div className="flex items-start gap-3">
            <span className="w-9.5 h-9.5 rounded-lg border border-[#00e5ff]/25 bg-[#00e5ff]/[0.06] flex items-center justify-center shrink-0 mt-0.5">
              <Icon className={`w-4.5 h-4.5 ${visual.tone}`} />
            </span>
            <div className="min-w-0 flex-1">
              <div className={`font-mono text-[10.5px] tracking-[0.14em] uppercase font-bold ${visual.tone}`}>
                {visual.label}
              </div>
              <div className="mt-0.5 font-mono text-[14px] font-semibold text-white leading-tight break-all">
                {selectedNode.label}
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/[0.06] font-mono text-[11px] text-white/40">
            {fileName ?? "—"} · {selectedNode.meta}
          </div>
        </div>

        {/* Property table */}
        <dl className="space-y-0">
          <Row label="Type" value={<span className="font-semibold text-white">{visual.label}</span>} />
          <Row label="Raw Type" value={<span className="text-white/60">{rawNode.type}</span>} />
          <Row label="File" value={fileName ?? "—"} />
          <Row label="Language" value={lang} />
          <Row
            label="Lines"
            value={startLine === endLine ? `${startLine}` : `${startLine} – ${endLine}`}
          />
          <Row label="Start" value={`L${startLine}:${startCol + 1}`} />
          <Row label="End" value={`L${endLine}:${endCol + 1}`} />
          <Row label="Children" value={String(selectedNode.children.length)} />
          {childSummary && (
            <Row
              label="Contains"
              value={<span className="text-white/60 text-[11px]">{childSummary}</span>}
            />
          )}
        </dl>

        {/* Jump to editor */}
        {canNavigate && (
          <Link
            href={buildSourceLocationUrl({
              projectId,
              fileId: selectedFile.id,
              filePath: selectedFile.path,
              startLine,
              endLine,
              startColumn: startCol,
              endColumn: endCol,
            })}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.10] bg-white/[0.025] px-3 py-2 text-xs font-mono text-white/60 transition-all hover:border-[#00e5ff]/40 hover:bg-[#00e5ff]/[0.05] hover:text-[#00e5ff]"
          >
            <ExternalLink className="w-3 h-3" />
            <span>View in Editor</span>
          </Link>
        )}

        {/* Source code preview */}
        {selectedNode.source && (
          <div className="rounded-lg border border-white/[0.07] overflow-hidden">
            <button
              type="button"
              onClick={() => setSourceOpen((v) => !v)}
              className="w-full h-8 px-3 flex items-center gap-2 bg-white/[0.015] hover:bg-white/[0.03] transition-colors"
            >
              <ChevronRight
                className={`w-3 h-3 text-[#00e5ff]/60 transition-transform duration-200 ${sourceOpen ? "rotate-90" : ""}`}
              />
              <span className="font-mono text-[8.5px] tracking-[0.12em] uppercase text-white/35">
                Source Preview
              </span>
            </button>
            {sourceOpen && (
              <div className="border-t border-white/[0.06] bg-[#040608] cg-pop overflow-x-auto">
                <pre className="p-3 font-mono text-[10px] leading-[1.7] text-[#b8c9e0] whitespace-pre">
                  {selectedNode.source}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
