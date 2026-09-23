"use client";

import { Code2, FileWarning, LoaderCircle, X, MapPin } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import { clampHighlightRange, type HighlightRange } from "@/lib/navigation";
import type { FileContent } from "@/types/workspace";

type CodeViewerProps = {
  file: FileContent | null;
  isLoading: boolean;
  error: string | null;
  highlightRange?: HighlightRange | null;
  onClearHighlight?: () => void;
};

const keywords = new Set([
  "async", "await", "class", "const", "def", "export", "for", "from",
  "function", "if", "import", "in", "interface", "let", "new", "return",
  "type", "var"
]);

function highlightLine(line: string) {
  const fragments = line.split(/(\/\/.*$|#.*$|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b[A-Za-z_][A-Za-z0-9_]*\b)/g);
  return fragments.map((fragment, index) => {
    if (fragment.startsWith("//") || fragment.startsWith("#")) return <span key={index} className="text-slate-500">{fragment}</span>;
    if (fragment.startsWith("\"") || fragment.startsWith("'")) return <span key={index} className="text-emerald-350">{fragment}</span>;
    if (keywords.has(fragment)) return <span key={index} className="text-violet-300">{fragment}</span>;
    return <span key={index}>{fragment}</span>;
  });
}

function renderLineWithColumnHighlight(
  line: string,
  lineNum: number,
  highlightRange: HighlightRange | null
) {
  if (
    !highlightRange ||
    highlightRange.startColumn == null ||
    highlightRange.endColumn == null ||
    lineNum < highlightRange.startLine ||
    lineNum > highlightRange.endLine
  ) {
    return highlightLine(line);
  }

  // Handle single-line column highlighting
  if (highlightRange.startLine === highlightRange.endLine && lineNum === highlightRange.startLine) {
    const startCol = Math.max(0, Math.min(highlightRange.startColumn, line.length));
    const endCol = Math.max(startCol, Math.min(highlightRange.endColumn, line.length));

    if (startCol < endCol) {
      const before = line.slice(0, startCol);
      const target = line.slice(startCol, endCol);
      const after = line.slice(endCol);

      return (
        <>
          {highlightLine(before)}
          <mark className="bg-cyan-400/30 text-cyan-100 rounded px-0.5 font-bold shadow-[0_0_8px_rgba(6,182,212,0.3)]">
            {target}
          </mark>
          {highlightLine(after)}
        </>
      );
    }
  }

  return highlightLine(line);
}

export function CodeViewer({
  file,
  isLoading,
  error,
  highlightRange,
  onClearHighlight,
}: CodeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const lines = useMemo(() => {
    if (!file) return [];
    return file.content.split("\n");
  }, [file]);

  const clampedRange = useMemo(() => {
    return clampHighlightRange(highlightRange, lines.length);
  }, [highlightRange, lines.length]);

  // Scroll to the startLine when file or highlight range changes
  useEffect(() => {
    if (!clampedRange || !containerRef.current || lines.length === 0) return;

    const timer = setTimeout(() => {
      const targetElement = containerRef.current?.querySelector(
        `[data-line="${clampedRange.startLine}"]`
      );

      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [file?.id, clampedRange, lines.length]);

  if (isLoading) {
    return (
      <section className="flex h-full flex-col items-center justify-center bg-[#080d14]">
        <LoaderCircle className="size-6 animate-spin text-cyan-400" />
        <p className="mt-2 text-xs text-slate-500">Loading source file…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex h-full flex-col items-center justify-center bg-[#080d14] p-6 text-center">
        <FileWarning className="size-8 text-rose-400" />
        <p className="mt-2 text-sm text-rose-300">{error}</p>
      </section>
    );
  }

  if (!file) {
    return (
      <section className="flex h-full flex-col items-center justify-center bg-[#080d14] p-6 text-center">
        <Code2 className="size-8 text-slate-600 animate-pulse" />
        <h2 className="mt-3 font-semibold text-slate-300">Select a file to preview</h2>
        <p className="mt-1 text-xs text-slate-500">Choose a repository file from the explorer.</p>
      </section>
    );
  }

  const isHighlighted = (lineNum: number) => {
    if (!clampedRange) return false;
    return lineNum >= clampedRange.startLine && lineNum <= clampedRange.endLine;
  };

  const highlightLabel = clampedRange
    ? clampedRange.startLine === clampedRange.endLine
      ? `Line ${clampedRange.startLine}`
      : `Lines ${clampedRange.startLine}–${clampedRange.endLine}`
    : null;

  return (
    <section className="flex h-full flex-col bg-[#080d14] font-mono text-[13px] leading-6 text-slate-300 min-h-0">
      <div className="shrink-0 flex h-10 items-center justify-between border-b border-slate-800 bg-[#0a1019] px-4 text-xs text-slate-400 select-none gap-2">
        <span className="truncate font-semibold text-slate-300" title={file.path}>
          {file.path}
        </span>

        <div className="flex items-center gap-2 shrink-0">
          {clampedRange && (
            <div className="flex items-center gap-1.5 rounded border border-cyan-500/30 bg-cyan-950/40 px-2 py-0.5 text-[11px] font-medium text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.15)] animate-in fade-in">
              <MapPin className="size-3 text-cyan-400" />
              <span>{highlightLabel}</span>
              {onClearHighlight && (
                <button
                  type="button"
                  onClick={onClearHighlight}
                  className="ml-1 rounded p-0.5 text-cyan-400/70 hover:bg-cyan-900/60 hover:text-cyan-200 transition-colors"
                  title="Clear location highlight"
                  aria-label="Clear highlight"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          )}

          <span className="font-mono text-[10px] tracking-wide text-cyan-400 uppercase bg-cyan-950/20 px-2 py-0.5 rounded border border-cyan-800/20">
            {file.language ?? "Plain text"}
          </span>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto py-3 min-h-0">
        <pre className="min-w-max">
          <code>
            {lines.map((line, index) => {
              const lineNum = index + 1;
              const highlighted = isHighlighted(lineNum);

              return (
                <span
                  key={index}
                  data-line={lineNum}
                  className={`flex transition-colors border-l-2 ${
                    highlighted
                      ? "bg-cyan-950/40 border-cyan-400 text-slate-100 font-medium"
                      : "border-transparent hover:bg-slate-900/35"
                  }`}
                >
                  <span
                    className={`w-12 shrink-0 select-none pr-3 text-right ${
                      highlighted
                        ? "border-r border-cyan-500/40 bg-cyan-950/60 text-cyan-300 font-bold"
                        : "border-r border-slate-800/70 text-slate-600"
                    }`}
                  >
                    {lineNum}
                  </span>
                  <span className="whitespace-pre px-4">
                    {renderLineWithColumnHighlight(line, lineNum, clampedRange)}
                  </span>
                </span>
              );
            })}
          </code>
        </pre>
      </div>
    </section>
  );
}
