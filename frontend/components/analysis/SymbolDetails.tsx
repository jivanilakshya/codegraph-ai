"use client";

import {
  Box,
  Braces,
  ChevronDown,
  ChevronRight,
  Code2,
  ExternalLink,
  FileOutput,
  Package,
  Variable,
} from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";

import { buildSourceLocationUrl } from "@/lib/navigation";
import type { AstNodeData, FileAnalysis, SymbolGroup } from "@/types/workspace";

type SymbolDetailsProps = {
  symbolName: string | null;
  symbolGroup: SymbolGroup | null;
  analysis: FileAnalysis | null;
  sourceText: string | null;
  projectId?: number | null;
  fileId?: number | null;
  filePath?: string | null;
  className?: string;
};

function getGroupIcon(group: SymbolGroup) {
  switch (group) {
    case "imports":
      return <Package className="size-4 shrink-0 text-[#A3A3A3]" />;
    case "exports":
      return <FileOutput className="size-4 shrink-0 text-[#A3A3A3]" />;
    case "functions":
      return <Code2 className="size-4 shrink-0 text-[#A3A3A3]" />;
    case "classes":
      return <Box className="size-4 shrink-0 text-[#A3A3A3]" />;
    case "methods":
      return <Braces className="size-4 shrink-0 text-[#A3A3A3]" />;
    case "variables":
      return <Variable className="size-4 shrink-0 text-[#A3A3A3]" />;
    default:
      return <Code2 className="size-4 shrink-0 text-[#A3A3A3]" />;
  }
}

function getGroupLabel(group: SymbolGroup): string {
  switch (group) {
    case "imports":
      return "Import";
    case "exports":
      return "Export";
    case "functions":
      return "Function";
    case "classes":
      return "Class";
    case "methods":
      return "Method";
    case "variables":
      return "Variable";
  }
}

// Find AST node matching symbol
function findAstNodeForSymbol(ast: AstNodeData | null): AstNodeData | null {
  if (!ast) return null;

  function search(node: AstNodeData): AstNodeData | null {
    if (
      node.type === "identifier" ||
      node.type === "type_identifier" ||
      node.type === "function_definition" ||
      node.type === "class_definition"
    ) {
      const idChild = node.children.find(
        (c) => c.type === "identifier" || c.type === "type_identifier" || c.type === "name"
      );
      if (idChild) {
        return node;
      }
    }
    for (const child of node.children) {
      const found = search(child);
      if (found) return found;
    }
    return null;
  }

  return search(ast);
}

// Extract source snippet around symbol
function getSymbolSourceSnippet(
  sourceText: string | null,
  line: number,
  contextLines = 4
): string | null {
  if (!sourceText) return null;
  const lines = sourceText.split("\n");
  const targetIdx = line - 1;
  if (targetIdx < 0 || targetIdx >= lines.length) return null;

  const startIdx = Math.max(0, targetIdx - 1);
  const endIdx = Math.min(lines.length - 1, targetIdx + contextLines);
  return lines.slice(startIdx, endIdx + 1).join("\n");
}

export function SymbolDetails({
  symbolName,
  symbolGroup,
  analysis,
  sourceText,
  projectId,
  fileId,
  filePath,
  className,
}: SymbolDetailsProps) {
  const [sourceOpen, setSourceOpen] = useState(true);

  if (!symbolName || !symbolGroup || !analysis) {
    return (
      <aside
        className={`flex flex-col border-l border-[#242424] bg-[#080808] p-5 font-mono select-none ${
          className ?? "w-[300px] lg:w-[320px] shrink-0 h-full"
        }`}
      >
        <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#737373] mb-4">
          SYMBOL DETAILS
        </h2>
        <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
          <p className="text-xs text-[#737373]">No symbol selected</p>
          <p className="mt-1 text-[11px] text-[#444444]">
            Click a symbol from the list to view its specifications and source code.
          </p>
        </div>
      </aside>
    );
  }

  const icon = getGroupIcon(symbolGroup);
  const groupLabel = getGroupLabel(symbolGroup);

  // Derive location
  let startLine = 1;
  let startCol = 1;
  if (sourceText) {
    const lines = sourceText.split("\n");
    const foundLineIdx = lines.findIndex((l) => l.includes(symbolName));
    if (foundLineIdx !== -1) {
      startLine = foundLineIdx + 1;
      startCol = lines[foundLineIdx].indexOf(symbolName) + 1;
    }
  }

  const astNode = findAstNodeForSymbol(analysis.ast);
  if (astNode) {
    startLine = astNode.start_point.row + 1;
    startCol = astNode.start_point.column + 1;
  }

  const snippet = getSymbolSourceSnippet(sourceText, startLine);
  const isExported = analysis.symbols.exports?.includes(symbolName) ?? false;
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
          SYMBOL DETAILS
        </h2>

        {/* Selected Symbol Banner */}
        <div className="rounded-lg border border-[#292929] bg-[#050505] p-3.5">
          <div className="flex items-center gap-2 mb-2">
            {icon}
            <span className="inline-block rounded border border-[#242424] bg-[#0F0F0F] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#A3A3A3]">
              {groupLabel}
            </span>
            {isExported && (
              <span className="inline-block rounded border border-[#333333] bg-[#1A1A1A] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white ml-auto">
                EXPORTED
              </span>
            )}
          </div>
          <div className="text-[16px] font-bold text-white truncate tracking-tight" title={symbolName}>
            {symbolName}
          </div>
          <div className="text-[11px] text-[#737373] mt-1 truncate">
            {filePath ? filePath.split("/").pop() : "Source file"} : Line {startLine}
          </div>
        </div>
      </div>

      {/* Symbol Specification Grid */}
      <div className="p-4 space-y-3.5 border-b border-[#1A1A1A] text-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#555555] block mb-0.5">
            FILE PATH
          </span>
          <span className="text-[12px] font-mono text-[#E5E5E5] break-all">
            {filePath || analysis.file}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#555555] block mb-0.5">
              LOCATION
            </span>
            <span className="text-[12px] text-[#A3A3A3]">
              Line {startLine}, Col {startCol}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#555555] block mb-0.5">
              LANGUAGE
            </span>
            <span className="text-[12px] text-[#A3A3A3] uppercase">
              {analysis.language || "code"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#555555] block mb-0.5">
              TYPE
            </span>
            <span className="text-[12px] text-[#A3A3A3]">{groupLabel}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#555555] block mb-0.5">
              EXPORTED
            </span>
            <span className="text-[12px] text-[#A3A3A3]">{isExported ? "Yes" : "No"}</span>
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
              })}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#333333] bg-[#080808] px-3 py-2 text-xs font-medium text-[#E5E5E5] transition-all hover:border-[#555555] hover:bg-[#151515] hover:text-white"
            >
              <ExternalLink className="size-3.5 text-[#A3A3A3]" />
              <span>View in Editor</span>
            </Link>
          </div>
        )}
      </div>

      {/* Collapsible Source Code Preview */}
      {snippet && (
        <div className="p-4 flex-1">
          <button
            type="button"
            onClick={() => setSourceOpen((v) => !v)}
            className="flex w-full items-center justify-between font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#737373] hover:text-white transition-colors py-1"
          >
            <span>SOURCE CODE PREVIEW</span>
            {sourceOpen ? (
              <ChevronDown className="size-3 text-[#A3A3A3]" />
            ) : (
              <ChevronRight className="size-3 text-[#737373]" />
            )}
          </button>

          {sourceOpen && (
            <div className="mt-2.5">
              <pre className="max-h-64 overflow-auto rounded-lg border border-[#1A1A1A] bg-[#050505] p-3 font-mono text-[11px] leading-[1.65] text-[#E5E5E5] whitespace-pre-wrap break-words">
                {snippet}
              </pre>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
