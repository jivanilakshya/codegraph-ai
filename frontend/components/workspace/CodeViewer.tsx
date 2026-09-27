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
  "async", "await", "break", "case", "catch", "class", "const", "continue",
  "debugger", "default", "def", "delete", "do", "else", "enum", "export",
  "extends", "false", "finally", "for", "from", "function", "if", "implements",
  "import", "in", "instanceof", "interface", "let", "new", "null", "package",
  "private", "protected", "public", "return", "super", "switch", "this",
  "throw", "true", "try", "typeof", "var", "void", "while", "with", "yield",
  "self", "None", "True", "False", "lambda", "pass", "raise", "as", "is",
  "and", "or", "not", "elif"
]);

function highlightLine(line: string) {
  const tokens = line.split(/(\/\/.*$|#.*$|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b|[=+\-*/%&|^~<>!?:;,.\(\)\{\}\[\]])/g);

  return tokens.map((fragment, index) => {
    if (!fragment) return null;

    // Comments -> #737373
    if (fragment.startsWith("//") || fragment.startsWith("#")) {
      return <span key={index} className="text-[#737373] italic">{fragment}</span>;
    }
    // Strings -> #D0D0D0
    if (fragment.startsWith("\"") || fragment.startsWith("'") || fragment.startsWith("`")) {
      return <span key={index} className="text-[#D0D0D0]">{fragment}</span>;
    }
    // Numbers -> #C4C4C4
    if (/^\b\d+(?:\.\d+)?\b$/.test(fragment)) {
      return <span key={index} className="text-[#C4C4C4]">{fragment}</span>;
    }
    // Keywords -> #FFFFFF
    if (keywords.has(fragment)) {
      return <span key={index} className="text-white font-semibold">{fragment}</span>;
    }
    // Types / Classes -> #FFFFFF
    if (/^[A-Z][A-Za-z0-9_]*$/.test(fragment)) {
      return <span key={index} className="text-white font-semibold">{fragment}</span>;
    }
    // Functions -> #F0F0F0
    if (/^[a-z_][A-Za-z0-9_]*$/.test(fragment)) {
      const remainingLine = tokens.slice(index + 1).join("").trimStart();
      if (remainingLine.startsWith("(")) {
        return <span key={index} className="text-[#F0F0F0] font-medium">{fragment}</span>;
      }
      return <span key={index} className="text-[#E5E5E5]">{fragment}</span>;
    }
    // Operators / Punctuation -> #A3A3A3
    if (/^[=+\-*/%&|^~<>!?:;,.\(\)\{\}\[\]]$/.test(fragment)) {
      return <span key={index} className="text-[#A3A3A3]">{fragment}</span>;
    }
    // Primary code text -> #E5E5E5
    return <span key={index} className="text-[#E5E5E5]">{fragment}</span>;
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
          <mark className="bg-[rgba(255,255,255,0.2)] text-white rounded px-0.5 font-bold shadow-[0_0_8px_rgba(255,255,255,0.3)]">
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
      <section className="flex h-full flex-col items-center justify-center bg-[#050505]">
        <LoaderCircle className="size-6 animate-spin text-white" />
        <p className="mt-3 font-mono text-sm text-[#737373]">Loading source file…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex h-full flex-col items-center justify-center bg-[#050505] p-6 text-center font-mono text-sm">
        <FileWarning className="size-8 text-rose-300" />
        <p className="mt-3 text-rose-200">{error}</p>
      </section>
    );
  }

  if (!file) {
    return (
      <section className="flex h-full flex-col items-center justify-center bg-[#050505] p-6 text-center select-none">
        <Code2 className="size-10 text-[#737373] animate-pulse" />
        <h2 className="mt-4 font-sans text-lg font-bold text-white">Select a file to preview</h2>
        <p className="mt-1 font-mono text-xs text-[#737373]">Choose a repository file from the explorer.</p>
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
    <section
      className="flex h-full flex-col bg-[#050505] text-[#E5E5E5] min-h-0 text-[15px] leading-[1.65] sm:text-[16px] sm:leading-[1.65]"
      style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'SFMono-Regular', Consolas, monospace" }}
    >
      {/* Editor File Header */}
      <div className="shrink-0 flex h-12 items-center justify-between border-b border-[#202020] bg-[#0A0A0A] px-4 text-xs select-none gap-3">
        <span className="truncate text-[16px] font-semibold text-white" title={file.path}>
          {file.path}
        </span>

        <div className="flex items-center gap-2.5 shrink-0">
          {clampedRange && (
            <div className="flex items-center gap-1.5 rounded border border-[#303030] bg-[#121212] px-2 py-0.5 text-[11px] font-medium text-white shadow-sm">
              <MapPin className="size-3 text-white" />
              <span>{highlightLabel}</span>
              {onClearHighlight && (
                <button
                  type="button"
                  onClick={onClearHighlight}
                  className="ml-1 rounded p-0.5 text-[#A3A3A3] hover:bg-[#202020] hover:text-white transition-colors"
                  title="Clear location highlight"
                  aria-label="Clear highlight"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          )}

          <span className="font-mono text-[11px] font-bold tracking-wider text-white uppercase bg-[#151515] px-2.5 py-1 rounded border border-[#303030]">
            {file.language ?? "Plain Text"}
          </span>
        </div>
      </div>

      {/* Editor Code Area */}
      <div ref={containerRef} className="flex-1 overflow-auto py-3 min-h-0 bg-[#050505]">
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
                      ? "bg-[rgba(255,255,255,0.08)] border-white text-white font-medium"
                      : "border-transparent hover:bg-[rgba(255,255,255,0.03)]"
                  }`}
                >
                  {/* Line Number Column */}
                  <span
                    className={`w-12 sm:w-14 shrink-0 select-none pr-3 text-right text-[14px] sm:text-[15px] ${
                      highlighted
                        ? "border-r border-[#444444] bg-[#151515] text-[#A3A3A3] font-bold"
                        : "border-r border-[#202020] text-[#777777]"
                    }`}
                  >
                    {lineNum}
                  </span>

                  {/* Code Line Content */}
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


