"use client";

import {
  ArrowUpRight,
  Braces,
  Code2,
  GitGraph,
  Network,
} from "lucide-react";
import Link from "next/link";
import React, { useMemo, useState } from "react";

import { SYMBOL_TYPE_META } from "@/components/analysis/SymbolList";
import { cn } from "@/lib/cn";
import { buildSourceLocationUrl } from "@/lib/navigation";
import type { FileAnalysis, SymbolGroup } from "@/types/workspace";

type SymbolDetailsProps = {
  symbolName: string | null;
  symbolGroup: SymbolGroup | null;
  analysis: FileAnalysis | null;
  sourceText: string | null;
  projectId?: number | null;
  fileId?: number | null;
  filePath?: string | null;
  className?: string;
  onNavigate?: (path: string) => void;
};

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findSymbolLocation(
  symbolName: string,
  group: SymbolGroup,
  sourceText: string | null
): { startLine: number; startCol: number } {
  if (!sourceText) return { startLine: 1, startCol: 1 };

  const lines = sourceText.split("\n");

  const patterns: RegExp[] = [];
  if (group === "functions") {
    patterns.push(new RegExp(`\\bdef\\s+${escapeRegex(symbolName)}\\b`));
    patterns.push(new RegExp(`\\bfunction\\s+${escapeRegex(symbolName)}\\b`));
    patterns.push(
      new RegExp(
        `\\b${escapeRegex(symbolName)}\\s*=\\s*(?:async\\s+)?(?:function|\\([^)]*\\)\\s*=>)`
      )
    );
  } else if (group === "classes") {
    patterns.push(new RegExp(`\\bclass\\s+${escapeRegex(symbolName)}\\b`));
    patterns.push(new RegExp(`\\binterface\\s+${escapeRegex(symbolName)}\\b`));
    patterns.push(new RegExp(`\\btype\\s+${escapeRegex(symbolName)}\\b`));
  } else if (group === "methods") {
    patterns.push(new RegExp(`\\bdef\\s+${escapeRegex(symbolName)}\\b`));
    patterns.push(new RegExp(`\\b${escapeRegex(symbolName)}\\s*\\([^)]*\\)\\s*\\{`));
  } else if (group === "imports") {
    patterns.push(new RegExp(`\\b(?:import|from)\\b.*\\b${escapeRegex(symbolName)}\\b`));
  } else if (group === "variables") {
    patterns.push(new RegExp(`\\b(?:let|const|var)\\s+${escapeRegex(symbolName)}\\b`));
    patterns.push(new RegExp(`\\b${escapeRegex(symbolName)}\\s*=`));
  }

  for (const pat of patterns) {
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(pat);
      if (match && match.index !== undefined) {
        return { startLine: i + 1, startCol: match.index + 1 };
      }
    }
  }

  const wordRegex = new RegExp(`\\b${escapeRegex(symbolName)}\\b`);
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(wordRegex);
    if (match && match.index !== undefined) {
      return { startLine: i + 1, startCol: match.index + 1 };
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const idx = lines[i].indexOf(symbolName);
    if (idx !== -1) {
      return { startLine: i + 1, startCol: idx + 1 };
    }
  }

  return { startLine: 1, startCol: 1 };
}

function getSymbolSourceSnippet(
  sourceText: string | null,
  startLine: number,
  maxLines = 8
): { snippetLines: string[]; startLineNumber: number; activeRelativeIndex: number } | null {
  if (!sourceText) return null;
  const lines = sourceText.split("\n");
  const targetIdx = startLine - 1;
  if (targetIdx < 0 || targetIdx >= lines.length) return null;

  const startIdx = Math.max(0, targetIdx - 1);
  const endIdx = Math.min(lines.length - 1, startIdx + maxLines - 1);

  return {
    snippetLines: lines.slice(startIdx, endIdx + 1),
    startLineNumber: startIdx + 1,
    activeRelativeIndex: targetIdx - startIdx,
  };
}

function highlightSyntax(line: string) {
  const parts = line.split(
    /(\b(?:def|class|from|import|return|if|else|elif|is|None|self|raise|const|function|let|var|type|interface|export|default|async|await|for|while|try|except|catch|finally|true|false|True|False|null)\b|#[^\n]*|\/\/[^\n]*|"[^"]*"|'[^']*'|`[^`]*`|\b\d+(?:\.\d+)?\b)/g
  );
  return parts.map((part, index) => {
    const isKeyword =
      /^(def|class|from|import|return|if|else|elif|is|None|self|raise|const|function|let|var|type|interface|export|default|async|await|for|while|try|except|catch|finally|true|false|True|False|null)$/.test(
        part
      );
    const isComment = /^(#|\/\/)/.test(part);
    const isString = /^["'`]/.test(part);
    const isNumber = /^\d/.test(part);

    const cls = isKeyword
      ? "text-[#b69cff]"
      : isComment
      ? "text-[#5b677a] italic"
      : isString
      ? "text-[#7ee0c3]"
      : isNumber
      ? "text-[#f5b97a]"
      : "text-[#c9d4e3]";

    return (
      <span key={index} className={cls}>
        {part}
      </span>
    );
  });
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const location = useMemo(() => {
    if (!symbolName || !symbolGroup) return { startLine: 1, startCol: 1 };
    return findSymbolLocation(symbolName, symbolGroup, sourceText);
  }, [symbolName, symbolGroup, sourceText]);

  const snippetData = useMemo(() => {
    return getSymbolSourceSnippet(sourceText, location.startLine);
  }, [sourceText, location.startLine]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 1800);
  };

  if (!symbolName || !symbolGroup || !analysis) {
    return (
      <aside
        className={cn(
          "h-full min-h-0 flex flex-col bg-gradient-to-b from-[#0a0d16]/95 to-[#070910]/95 select-none overflow-hidden",
          className
        )}
      >
        <div className="h-11 flex items-center gap-2 px-4 border-b border-white/[0.06] shrink-0 bg-[#0a0d16]/95">
          <Code2 className="w-3.5 h-3.5 text-primary/80" />
          <span className="cg-label !text-foreground/80">Symbol Details</span>
        </div>
        <div className="flex-1 min-h-0 flex items-center justify-center text-center px-6">
          <div>
            <span className="mx-auto w-12 h-12 rounded-xl border border-white/[0.08] bg-white/[0.025] flex items-center justify-center">
              <Braces className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            </span>
            <p className="mt-4 text-[14px] font-medium text-white">No symbol selected</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
              Click a symbol from the list to view its specifications and source code.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  const meta = SYMBOL_TYPE_META[symbolGroup];
  const Icon = meta.icon;
  const isExported = analysis.symbols.exports?.includes(symbolName) ?? false;
  const fileName = filePath ? filePath.split("/").pop() : analysis.file || "Source File";

  const editorUrl = buildSourceLocationUrl({
    projectId,
    fileId,
    filePath,
    startLine: location.startLine,
  });

  return (
    <aside
      className={cn(
        "h-full min-h-0 flex flex-col bg-gradient-to-b from-[#0a0d16]/95 to-[#070910]/95 select-none overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="h-11 flex items-center gap-2 px-4 border-b border-white/[0.06] shrink-0 bg-[#0a0d16]/95 z-10">
        <Code2 className="w-3.5 h-3.5 text-primary/80" />
        <span className="cg-label !text-foreground/80">Symbol Details</span>
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_#00e5ff]" />
      </div>

      <div
        key={`${symbolGroup}-${symbolName}`}
        className="flex-1 min-h-0 overflow-y-auto p-4 cg-pop flex flex-col space-y-3"
      >
        {/* Selected Symbol Banner Card */}
        <div className="rounded-xl border border-primary/20 bg-primary/[0.035] p-3.5 shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-lg border border-primary/25 bg-primary/[0.06] flex items-center justify-center shrink-0">
              <Icon className={cn("w-4 h-4", meta.tone)} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[10px] tracking-[0.15em] text-primary uppercase font-semibold">
                {meta.singular}
              </div>
              <div
                className="mt-0.5 font-mono text-[14px] md:text-[15px] font-bold text-white truncate"
                title={symbolName}
              >
                {symbolName}
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/[0.06] font-mono text-[10.5px] text-muted-foreground flex items-center justify-between">
            <span className="truncate">{fileName}</span>
            <span className="shrink-0 text-white/70">Line {location.startLine}</span>
          </div>
        </div>

        {/* Specifications List */}
        <dl className="mt-3 divide-y divide-white/[0.055] border-y border-white/[0.055] shrink-0">
          <div className="py-2.5">
            <dt className="cg-label !text-[8.5px]">FILE PATH</dt>
            <dd
              className="mt-1 font-mono text-[11.5px] text-foreground break-all"
              title={filePath || analysis.file}
            >
              {filePath || analysis.file}
            </dd>
          </div>
          <div className="py-2.5 grid grid-cols-2 gap-3">
            <div>
              <dt className="cg-label !text-[8.5px]">LOCATION</dt>
              <dd className="mt-1 font-mono text-[11.5px] text-foreground">
                Line {location.startLine}, Col {location.startCol}
              </dd>
            </div>
            <div>
              <dt className="cg-label !text-[8.5px]">LANGUAGE</dt>
              <dd className="mt-1 font-mono text-[11.5px] text-foreground uppercase">
                {analysis.language || "Code"}
              </dd>
            </div>
          </div>
          <div className="py-2.5 grid grid-cols-2 gap-3">
            <div>
              <dt className="cg-label !text-[8.5px]">TYPE</dt>
              <dd className={cn("mt-1 font-mono text-[11.5px] font-semibold", meta.tone)}>
                {meta.singular}
              </dd>
            </div>
            <div>
              <dt className="cg-label !text-[8.5px]">EXPORTED</dt>
              <dd className="mt-1 font-mono text-[11.5px] text-foreground">
                {isExported ? "Yes" : "No"}
              </dd>
            </div>
          </div>
        </dl>

        {/* View in Editor Button */}
        <div className="mt-3.5 shrink-0">
          <Link
            href={editorUrl}
            onClick={() => showToast(`Opening ${symbolName} in Editor…`)}
            className="w-full h-9 rounded-lg border border-primary/25 bg-primary/[0.06] text-primary text-[12px] font-medium flex items-center justify-center gap-2 hover:bg-primary/[0.1] hover:border-primary/40 transition-all font-mono"
          >
            <span>View in Editor</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Quick Action Navigation Grid */}
        <div className="mt-3 grid grid-cols-2 gap-1.5 shrink-0">
          <Link
            href={`/repository?projectId=${projectId}&file=${encodeURIComponent(filePath || "")}`}
            className="graph-action justify-center text-[10.5px]"
          >
            <Code2 className="w-3.5 h-3.5 text-blue-400" />
            <span>View Source</span>
          </Link>
          <Link
            href={`/ast?projectId=${projectId}&file=${encodeURIComponent(filePath || "")}`}
            className="graph-action justify-center text-[10.5px]"
          >
            <Braces className="w-3.5 h-3.5 text-cyan-400" />
            <span>Open AST</span>
          </Link>
          <Link
            href={`/graph?projectId=${projectId}&search=${encodeURIComponent(symbolName)}`}
            className="graph-action justify-center text-[10.5px]"
          >
            <GitGraph className="w-3.5 h-3.5 text-sky-400" />
            <span>Explore Graph</span>
          </Link>
          <Link
            href={`/relationships?projectId=${projectId}`}
            className="graph-action justify-center text-[10.5px]"
          >
            <Network className="w-3.5 h-3.5 text-violet-400" />
            <span>Relationships</span>
          </Link>
        </div>

        {/* Source Code Preview */}
        {snippetData && (
          <div className="mt-4 flex-1 flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="cg-label !text-[9px] !text-foreground/75">
                Source Code Preview
              </span>
              <span className="flex-1 h-px bg-white/[0.06]" />
            </div>
            <div className="rounded-lg border border-white/[0.07] bg-[#05070b] overflow-x-auto flex-1 min-h-24">
              <div className="min-w-max py-2 font-mono text-[10.5px] leading-5">
                {snippetData.snippetLines.map((line, idx) => {
                  const lineNumber = snippetData.startLineNumber + idx;
                  const isActiveLine = idx === snippetData.activeRelativeIndex;

                  return (
                    <div
                      key={lineNumber}
                      className={cn(
                        "flex pr-3 transition-colors",
                        isActiveLine && "bg-primary/[0.05] border-l-2 border-primary"
                      )}
                    >
                      <span className="w-10 px-2 text-right text-white/20 select-none border-r border-white/[0.05]">
                        {lineNumber}
                      </span>
                      <code className="pl-3 whitespace-pre">
                        {line ? highlightSyntax(line) : " "}
                      </code>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating feedback toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2 rounded-full border border-primary/20 bg-[#0a0d16]/95 backdrop-blur-xl shadow-[0_0_30px_-10px_rgba(0,229,255,0.4)] font-mono text-[11.5px] text-foreground cg-pop">
          <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_#00e5ff]" />
          {toastMessage}
        </div>
      )}
    </aside>
  );
}
