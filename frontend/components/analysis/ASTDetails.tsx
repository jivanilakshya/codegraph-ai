"use client";

import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { getAstNodeDisplayInfo } from "@/components/analysis/ASTTree";
import { buildSourceLocationUrl } from "@/lib/navigation";
import type { AstNodeData } from "@/types/workspace";

type ASTDetailsProps = {
  node: AstNodeData | null;
  nodeId?: string;
  sourceText: string | null;
  projectId?: number | null;
  fileId?: number | null;
  filePath?: string | null;
  className?: string;
};

function sourceSnippet(node: AstNodeData, sourceText: string | null): string | null {
  if (!sourceText) return null;
  const lines = sourceText.split("\n");
  const startLine = lines[node.start_point.row];
  const endLine = lines[node.end_point.row];
  if (startLine === undefined || endLine === undefined) return null;
  if (node.start_point.row === node.end_point.row)
    return startLine.slice(node.start_point.column, node.end_point.column);
  return [
    startLine.slice(node.start_point.column),
    ...lines.slice(node.start_point.row + 1, node.end_point.row),
    endLine.slice(0, node.end_point.column),
  ].join("\n");
}

export function ASTDetails({
  node,
  sourceText,
  projectId,
  fileId,
  filePath,
  className,
}: ASTDetailsProps) {
  const [sourceOpen, setSourceOpen] = useState(true);

  if (!node) {
    return (
      <aside
        className={`flex flex-col border-l border-[#242424] bg-[#080808] p-5 font-mono select-none ${
          className ?? "w-[280px] lg:w-[300px] shrink-0 h-full"
        }`}
      >
        <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#737373] mb-4">
          NODE DETAILS
        </h2>
        <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
          <p className="text-xs text-[#737373]">No node selected</p>
          <p className="mt-1 text-[11px] text-[#444444]">
            Click an AST node card to inspect its details.
          </p>
        </div>
      </aside>
    );
  }

  const displayInfo = getAstNodeDisplayInfo(
    node,
    sourceText,
    filePath ? filePath.split("/").pop() : undefined
  );
  const snippet = sourceSnippet(node, sourceText);
  const startLine = node.start_point.row + 1;
  const endLine = node.end_point.row + 1;
  const startCol = node.start_point.column;
  const endCol = node.end_point.column;
  const canNavigate = projectId != null && (fileId != null || filePath != null);

  return (
    <aside
      className={`flex flex-col border-l border-[#242424] bg-[#080808] font-mono select-none overflow-y-auto ${
        className ?? "w-[280px] lg:w-[300px] shrink-0 h-full"
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-[#1A1A1A]">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#737373] mb-3">
          NODE DETAILS
        </h2>

        {/* Selected Node Card Summary */}
        <div className="rounded-lg border border-[#292929] bg-[#050505] p-3">
          <div className="inline-block rounded border border-[#242424] bg-[#0F0F0F] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">
            {displayInfo.typeLabel}
          </div>
          <div className="text-[15px] font-bold text-white truncate tracking-tight" title={displayInfo.name}>
            {displayInfo.name}
          </div>
          <div className="text-[11px] text-[#737373] mt-0.5">{displayInfo.metadata}</div>
        </div>
      </div>

      {/* Property Details List */}
      <div className="p-4 space-y-3.5 border-b border-[#1A1A1A] text-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#555555] block mb-0.5">
            TYPE
          </span>
          <span className="text-[13px] font-mono font-medium text-[#E5E5E5] break-all">
            {node.type}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#555555] block mb-0.5">
              START
            </span>
            <span className="text-[12px] text-[#A3A3A3]">
              Line {startLine}, Col {startCol + 1}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#555555] block mb-0.5">
              END
            </span>
            <span className="text-[12px] text-[#A3A3A3]">
              Line {endLine}, Col {endCol + 1}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#555555] block mb-0.5">
              NAMED
            </span>
            <span className="text-[12px] text-[#A3A3A3]">{node.is_named ? "Yes" : "No"}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#555555] block mb-0.5">
              CHILDREN
            </span>
            <span className="text-[12px] text-[#A3A3A3]">{node.children.length}</span>
          </div>
        </div>

        {/* View in Editor Button */}
        {canNavigate && (
          <div className="pt-2">
            <Link
              href={buildSourceLocationUrl({
                projectId,
                fileId,
                filePath,
                startLine,
                endLine,
                startColumn: startCol,
                endColumn: endCol,
              })}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#333333] bg-[#080808] px-3 py-2 text-xs font-medium text-[#E5E5E5] transition-all hover:border-[#555555] hover:bg-[#151515] hover:text-white"
            >
              <ExternalLink className="size-3.5 text-[#A3A3A3]" />
              <span>View in Editor</span>
            </Link>
          </div>
        )}
      </div>

      {/* Collapsible Source Code Section */}
      {snippet && (
        <div className="p-4 flex-1">
          <button
            type="button"
            onClick={() => setSourceOpen((v) => !v)}
            className="flex w-full items-center justify-between font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#737373] hover:text-white transition-colors py-1"
          >
            <span>SOURCE CODE</span>
            {sourceOpen ? (
              <ChevronDown className="size-3 text-[#A3A3A3]" />
            ) : (
              <ChevronRight className="size-3 text-[#737373]" />
            )}
          </button>

          {sourceOpen && (
            <div className="mt-2.5">
              <pre className="max-h-60 overflow-auto rounded-lg border border-[#1A1A1A] bg-[#050505] p-3 font-mono text-[11px] leading-[1.65] text-[#E5E5E5] whitespace-pre-wrap break-words">
                {snippet}
              </pre>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
