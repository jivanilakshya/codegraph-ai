"use client";

import {
  ArrowRight,
  ArrowUpRight,
  Braces,
  Code2,
  GitGraph,
  Network,
  Variable,
} from "lucide-react";
import Link from "next/link";
import React, { useMemo, useState } from "react";

import { cn } from "@/lib/cn";
import { buildSourceLocationUrl } from "@/lib/navigation";
import type { FileAnalysis, FileRelationship } from "@/types/workspace";

type RelationshipDetailsProps = {
  relationship: FileRelationship | null;
  analysis: FileAnalysis | null;
  sourceText?: string | null;
  projectId?: number | null;
  fileId?: number | null;
  filePath?: string | null;
  className?: string;
};

function formatEntityName(name: string): string {
  if (!name) return "";
  if (name.includes("/")) {
    return name.split("/").pop() ?? name;
  }
  return name;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findRelationshipLocation(
  rel: FileRelationship,
  sourceText: string | null
): { startLine: number; startCol: number } | null {
  if (!sourceText) return null;
  const lines = sourceText.split("\n");
  const target = rel.target;
  const targetBase = target.includes("/")
    ? target.split("/").pop()!.replace(/\.[^.]+$/, "")
    : target;

  if (rel.relationship === "IMPORTS") {
    const escaped = escapeRegex(targetBase);
    const escapedFull = escapeRegex(target);
    const importRegex = new RegExp(
      `(?:import|require|from)\\b.*(?:['"\`]${escapedFull}['"\`]|['"\`].*${escaped}['"\`]|\\b${escaped}\\b)`
    );
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(importRegex);
      if (match && match.index !== undefined) {
        return { startLine: i + 1, startCol: match.index + 1 };
      }
    }
  } else if (rel.relationship === "CALLS") {
    const escaped = escapeRegex(target);
    const callRegex = new RegExp(`(?:\\b|\\.)${escaped}\\s*\\(`);
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(callRegex);
      if (match && match.index !== undefined) {
        return { startLine: i + 1, startCol: match.index + 1 };
      }
    }
  }

  // General fallback: word match of targetBase
  const wordRegex = new RegExp(`\\b${escapeRegex(targetBase)}\\b`);
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(wordRegex);
    if (match && match.index !== undefined) {
      return { startLine: i + 1, startCol: match.index + 1 };
    }
  }

  return null;
}

function getSnippet(
  sourceText: string | null,
  startLine: number,
  maxLines = 8
): { snippetLines: string[]; startLineNumber: number; activeRelativeIndex: number } | null {
  if (!sourceText || !startLine) return null;
  const lines = sourceText.split("\n");
  const targetIdx = startLine - 1;
  if (targetIdx < 0 || targetIdx >= lines.length) return null;

  const startIdx = Math.max(0, targetIdx - 2);
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

export function RelationshipDetails({
  relationship,
  analysis,
  sourceText = null,
  projectId,
  fileId,
  filePath,
  className,
}: RelationshipDetailsProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 1800);
  };

  const location = useMemo(() => {
    if (!relationship) return null;
    return findRelationshipLocation(relationship, sourceText);
  }, [relationship, sourceText]);

  const snippetData = useMemo(() => {
    if (!location) return null;
    return getSnippet(sourceText, location.startLine);
  }, [sourceText, location]);

  if (!relationship) {
    return (
      <aside
        className={cn(
          "h-full min-h-0 flex flex-col bg-gradient-to-b from-[#0a0d16]/95 to-[#070910]/95 select-none overflow-hidden",
          className
        )}
      >
        <div className="h-11 flex items-center gap-2 px-4 border-b border-white/[0.06] shrink-0 bg-[#0a0d16]/95">
          <Network className="w-3.5 h-3.5 text-primary/80" />
          <span className="cg-label !text-foreground/80">Relationship Details</span>
        </div>
        <div className="flex-1 min-h-0 flex items-center justify-center text-center px-6">
          <div>
            <span className="mx-auto w-12 h-12 rounded-xl border border-white/[0.08] bg-white/[0.025] flex items-center justify-center">
              <Network className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            </span>
            <p className="mt-4 text-[14px] font-medium text-white">No relationship selected</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
              Click a relationship card to inspect its details.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  const isImport = relationship.relationship === "IMPORTS";
  const isCall = relationship.relationship === "CALLS";
  const sourceName = formatEntityName(relationship.source);
  const targetName = formatEntityName(relationship.target);

  const editorUrl = buildSourceLocationUrl({
    projectId,
    fileId,
    filePath: filePath || relationship.source,
    startLine: location?.startLine,
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
        <Network className="w-3.5 h-3.5 text-primary/80" />
        <span className="cg-label !text-foreground/80">Relationship Details</span>
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_#00e5ff]" />
      </div>

      <div
        key={`${relationship.source}-${relationship.relationship}-${relationship.target}`}
        className="flex-1 min-h-0 overflow-y-auto p-4 cg-pop flex flex-col space-y-3"
      >
        {/* Selected Relationship Banner Card matching Figma */}
        <div className="rounded-xl border border-primary/20 bg-primary/[0.035] p-3.5 shrink-0">
          <div className="cg-label !text-[8.5px]">Relationship</div>
          <div className="mt-2 flex items-center gap-2 min-w-0">
            <span
              className="font-mono text-[13px] text-white font-medium truncate"
              title={relationship.source}
            >
              {sourceName}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />
            <span
              className="font-mono text-[13px] text-sky-200 font-medium truncate"
              title={relationship.target}
            >
              {targetName}
            </span>
          </div>
          <span
            className={cn(
              "inline-flex mt-3 font-mono text-[9px] tracking-[0.14em] px-2 py-0.5 rounded border uppercase font-semibold",
              isImport
                ? "text-violet-300 border-violet-400/25 bg-violet-400/[0.06]"
                : isCall
                ? "text-primary border-primary/25 bg-primary/[0.06]"
                : "text-sky-300 border-sky-400/25 bg-sky-400/[0.06]"
            )}
          >
            {relationship.relationship}
          </span>
        </div>

        {/* Specifications List matching Figma dl/dt/dd */}
        <dl className="mt-3 divide-y divide-white/[0.055] border-y border-white/[0.055] shrink-0 text-xs font-mono">
          <div className="py-2.5">
            <dt className="cg-label !text-[8.5px]">SOURCE</dt>
            <dd className="mt-1 font-mono text-[11.5px] text-white break-all">{sourceName}</dd>
          </div>
          <div className="py-2.5">
            <dt className="cg-label !text-[8.5px]">TARGET</dt>
            <dd className="mt-1 font-mono text-[11.5px] text-sky-200 break-all">{targetName}</dd>
          </div>
          <div className="py-2.5">
            <dt className="cg-label !text-[8.5px]">SOURCE FILE</dt>
            <dd
              className="mt-1 font-mono text-[11.5px] text-foreground break-all"
              title={relationship.source}
            >
              {relationship.source}
            </dd>
          </div>
          {relationship.target !== targetName && (
            <div className="py-2.5">
              <dt className="cg-label !text-[8.5px]">TARGET PATH</dt>
              <dd
                className="mt-1 font-mono text-[11.5px] text-muted-foreground break-all"
                title={relationship.target}
              >
                {relationship.target}
              </dd>
            </div>
          )}
          <div className="py-2.5 grid grid-cols-2 gap-3">
            <div>
              <dt className="cg-label !text-[8.5px]">RELATIONSHIP TYPE</dt>
              <dd
                className={cn(
                  "mt-1 font-mono text-[11.5px] font-semibold",
                  isImport ? "text-violet-300" : isCall ? "text-primary" : "text-sky-300"
                )}
              >
                {relationship.relationship}
              </dd>
            </div>
            <div>
              <dt className="cg-label !text-[8.5px]">LANGUAGE</dt>
              <dd className="mt-1 font-mono text-[11.5px] text-foreground uppercase">
                {analysis?.language || "Code"}
              </dd>
            </div>
          </div>
          <div className="py-2.5">
            <dt className="cg-label !text-[8.5px]">LOCATION</dt>
            <dd className="mt-1 font-mono text-[11.5px] text-foreground">
              {location ? `Line ${location.startLine}` : "File Scope"}
            </dd>
          </div>
        </dl>

        {/* View Source in Editor button */}
        <div className="mt-3.5 shrink-0">
          <Link
            href={editorUrl}
            onClick={() =>
              showToast(
                `Opening ${filePath || relationship.source}${
                  location ? ` at line ${location.startLine}` : ""
                }…`
              )
            }
            className="w-full h-9 rounded-lg border border-primary/25 bg-primary/[0.06] text-primary text-[12px] font-medium flex items-center justify-center gap-2 hover:bg-primary/[0.1] hover:border-primary/40 transition-all font-mono"
          >
            <span>View Source</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Developer Navigation Quick Actions */}
        <div className="mt-3 grid grid-cols-2 gap-1.5 shrink-0">
          <Link
            href={`/repository?projectId=${projectId}&file=${encodeURIComponent(
              filePath || relationship.source
            )}${location ? `&line=${location.startLine}` : ""}`}
            className="graph-action justify-center text-[10.5px]"
          >
            <Code2 className="w-3.5 h-3.5 text-blue-400" />
            <span>View Source</span>
          </Link>
          <Link
            href={`/ast?projectId=${projectId}&file=${encodeURIComponent(
              filePath || relationship.source
            )}`}
            className="graph-action justify-center text-[10.5px]"
          >
            <Braces className="w-3.5 h-3.5 text-cyan-400" />
            <span>Open AST</span>
          </Link>
          <Link
            href={`/graph?projectId=${projectId}&search=${encodeURIComponent(targetName)}`}
            className="graph-action justify-center text-[10.5px]"
          >
            <GitGraph className="w-3.5 h-3.5 text-sky-400" />
            <span>View Graph</span>
          </Link>
          <Link
            href={`/symbols?projectId=${projectId}&file=${encodeURIComponent(
              filePath || relationship.source
            )}&search=${encodeURIComponent(targetName)}`}
            className="graph-action justify-center text-[10.5px]"
          >
            <Variable className="w-3.5 h-3.5 text-violet-400" />
            <span>View Symbol</span>
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
