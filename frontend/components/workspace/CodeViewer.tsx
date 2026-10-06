"use client";

import { Check, ChevronRight, Code2, Copy, FileWarning, LoaderCircle, MapPin, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { clampHighlightRange, type HighlightRange } from "@/lib/navigation";
import type { FileContent } from "@/types/workspace";

type CodeViewerProps = {
  file: FileContent | null;
  isLoading: boolean;
  error: string | null;
  highlightRange?: HighlightRange | null;
  onClearHighlight?: () => void;
  projectName?: string;
  fileCount?: number;
};

// Expanded keyword set for syntax highlighting across Python, TS/JS, Rust, C++, Go, Java
const KEYWORDS = new Set([
  "from", "import", "def", "class", "return", "if", "else", "elif", "for", "in",
  "with", "as", "raise", "is", "None", "True", "False", "and", "or", "not", "self",
  "lambda", "pass", "try", "except", "finally", "while", "break", "continue", "async",
  "await", "yield", "const", "let", "var", "function", "export", "default", "extends",
  "implements", "interface", "type", "public", "private", "protected", "static",
  "struct", "enum", "fn", "pub", "use", "mod", "match"
]);

const TYPES_AND_BUILTINS = new Set([
  "int", "str", "float", "dict", "list", "List", "Dict", "Set", "Tuple", "Optional",
  "Any", "Union", "bool", "print", "sum", "len", "open", "range", "enumerate", "map",
  "filter", "ValueError", "TypeError", "Exception", "dataclass", "field", "React",
  "useState", "useEffect", "useMemo", "useRef", "useCallback", "Promise", "Array",
  "Object", "String", "Number", "Boolean"
]);

function highlightCodeLine(line: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(#.*$|\/\/.*$)|("""[^]*?"""|f?"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(@\w+)|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_]\w*\b)|(\s+)|(.)/g;
  let m: RegExpExecArray | null;
  let prevWord = "";
  let k = 0;

  while ((m = re.exec(line))) {
    const [t, comment, str, decorator, num, word] = m;
    let cls = "text-[#c9d4e3]";

    if (comment) {
      cls = "text-[#5b677a] italic";
    } else if (str) {
      cls = "text-[#7ee0c3]";
    } else if (decorator) {
      cls = "text-[#c4a7ff]";
    } else if (num) {
      cls = "text-[#f5b97a]";
    } else if (word) {
      if (KEYWORDS.has(word)) {
        cls = word === "self" ? "text-[#a8b4c8] italic" : "text-[#b69cff]";
      } else if (prevWord === "def" || prevWord === "class" || prevWord === "function" || prevWord === "fn") {
        cls = "text-[#5fd9f5] font-medium";
      } else if (TYPES_AND_BUILTINS.has(word) || /^[A-Z]/.test(word)) {
        cls = "text-[#7ab8ff]";
      }
    } else if (!/\s/.test(t)) {
      cls = "text-[#8792a6]";
    }

    out.push(
      <span key={k++} className={cls}>
        {t}
      </span>
    );

    if (word) prevWord = word;
  }

  return out;
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
    return highlightCodeLine(line);
  }

  if (highlightRange.startLine === highlightRange.endLine && lineNum === highlightRange.startLine) {
    const startCol = Math.max(0, Math.min(highlightRange.startColumn, line.length));
    const endCol = Math.max(startCol, Math.min(highlightRange.endColumn, line.length));

    if (startCol < endCol) {
      const before = line.slice(0, startCol);
      const target = line.slice(startCol, endCol);
      const after = line.slice(endCol);

      return (
        <>
          {highlightCodeLine(before)}
          <mark className="bg-[#00e5ff]/30 text-white rounded px-0.5 font-bold shadow-[0_0_8px_rgba(0,229,255,0.4)]">
            {target}
          </mark>
          {highlightCodeLine(after)}
        </>
      );
    }
  }

  return highlightCodeLine(line);
}

export function CodeViewer({
  file,
  isLoading,
  error,
  highlightRange,
  onClearHighlight,
  projectName = "Active Project",
  fileCount = 0,
}: CodeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const lines = useMemo(() => {
    if (!file) return [];
    return file.content.split("\n");
  }, [file]);

  const clampedRange = useMemo(() => {
    return clampHighlightRange(highlightRange, lines.length);
  }, [highlightRange, lines.length]);

  // Scroll to startLine when file or highlight range changes
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

  const handleCopy = () => {
    if (!file) return;
    navigator.clipboard?.writeText(file.content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  if (isLoading) {
    return (
      <div className="relative flex flex-col h-full items-center justify-center bg-[#05060b]/90 text-center select-none">
        <LoaderCircle className="w-6 h-6 animate-spin text-[#00e5ff]" />
        <p className="mt-3 font-mono text-xs text-muted-foreground">Loading source file…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative flex flex-col h-full items-center justify-center bg-[#05060b]/90 p-6 text-center select-none">
        <FileWarning className="w-8 h-8 text-rose-400 mb-3" />
        <p className="font-mono text-xs text-rose-200 max-w-md">{error}</p>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="relative flex-1 flex flex-col h-full items-center justify-center overflow-hidden bg-[#05060b]/90 select-none">
        <div className="absolute inset-0 cg-grid opacity-70" />
        <div className="absolute w-[380px] h-[260px] rounded-full bg-cyan-500/[0.07] blur-[80px]" />
        <svg aria-hidden className="absolute w-[420px] h-[260px] opacity-40" viewBox="0 0 420 260">
          {[
            [60, 60, 150, 110],
            [150, 110, 260, 70],
            [260, 70, 360, 130],
            [150, 110, 210, 200],
            [210, 200, 330, 210],
            [260, 70, 330, 210],
          ].map(([a, b, c, d], i) => (
            <line key={i} x1={a} y1={b} x2={c} y2={d} stroke="#67e8f9" strokeOpacity="0.25" strokeWidth="0.8" />
          ))}
          {[
            [60, 60],
            [150, 110],
            [260, 70],
            [360, 130],
            [210, 200],
            [330, 210],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2.2" fill="#67e8f9" className="cg-node" style={{ animationDelay: `${i * 0.7}s` }} />
          ))}
        </svg>
        <div className="relative text-center px-6 reveal" style={{ "--d": "320ms" } as React.CSSProperties}>
          <div className="relative mx-auto w-14 h-14 rounded-2xl border border-[#00e5ff]/25 bg-[#0a0d16] flex items-center justify-center shadow-[0_0_40px_-10px_rgba(0,229,255,0.5)]">
            <span className="absolute inset-0 rounded-2xl border border-[#00e5ff]/30 cg-ring" style={{ animationDuration: "3s" }} />
            <Code2 className="w-6 h-6 text-[#00e5ff]" strokeWidth={1.5} />
          </div>
          <p className="mt-5 text-[17px] font-medium text-white tracking-tight">Select a file to preview</p>
          <p className="mt-1.5 text-[13px] text-muted-foreground">Choose a repository file from the explorer.</p>
          {fileCount > 0 && (
            <p className="mt-4 font-mono text-[10.5px] text-white/25">
              {fileCount} files indexed in {projectName}
            </p>
          )}
        </div>
      </div>
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

  const langLower = (file.language ?? "").toLowerCase();
  const isSkyLang = langLower.includes("python") || langLower.includes("py") || langLower.includes("sql") || langLower.includes("sh");

  return (
    <div className="relative flex flex-col h-full min-h-[420px] md:min-h-0 bg-[#05060b]/90">
      {/* File Bar Header */}
      <div className="h-12 flex items-center gap-3 px-4 border-b border-white/[0.06] bg-[#080a12]/80 shrink-0">
        <div className="flex items-center gap-1.5 font-mono text-[12px] text-muted-foreground min-w-0">
          <span className="hidden sm:inline truncate">{projectName}</span>
          <ChevronRight className="hidden sm:block w-3 h-3 text-white/20 shrink-0" />
          <span key={file.path} className="text-white truncate cg-pop font-medium">
            {file.path}
          </span>
        </div>

        <span
          key={`lang-${file.language}`}
          className={`flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] uppercase px-2 py-0.5 rounded border cg-pop shrink-0 ${
            isSkyLang
              ? "text-sky-300 border-sky-400/25 bg-sky-400/[0.06]"
              : "text-violet-300 border-violet-400/25 bg-violet-400/[0.06]"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isSkyLang ? "bg-sky-300" : "bg-violet-300"}`} />
          {file.language || "Plain Text"}
        </span>

        <span className="ml-auto hidden sm:inline font-mono text-[10.5px] text-muted-foreground shrink-0">
          {lines.length} lines
        </span>

        {clampedRange && (
          <div className="flex items-center gap-1.5 rounded border border-[#00e5ff]/30 bg-[#00e5ff]/[0.08] px-2 py-0.5 font-mono text-[10.5px] text-[#00e5ff] shrink-0">
            <MapPin className="w-3 h-3 text-[#00e5ff]" />
            <span>{highlightLabel}</span>
            {onClearHighlight && (
              <button
                type="button"
                onClick={onClearHighlight}
                className="ml-1 rounded p-0.5 text-muted-foreground hover:bg-white/10 hover:text-white transition-colors"
                title="Clear location highlight"
                aria-label="Clear highlight"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleCopy}
          title="Copy source content"
          aria-label="Copy source content"
          className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-[#00e5ff] hover:bg-[#00e5ff]/[0.06] transition-colors shrink-0 ml-auto sm:ml-0"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Code Editor Pre Canvas */}
      <div
        key={file.id}
        ref={containerRef}
        className="flex-1 min-h-0 overflow-auto reveal"
        style={{ "--d": "0ms", animationDuration: "380ms" } as React.CSSProperties}
      >
        <pre className="font-mono text-[12.5px] md:text-[13px] leading-[1.75] py-4 min-w-max">
          {lines.map((ln, i) => {
            const lineNum = i + 1;
            const highlighted = isHighlighted(lineNum);
            return (
              <div
                key={i}
                data-line={lineNum}
                className={`group relative flex transition-colors ${
                  highlighted
                    ? "bg-[#00e5ff]/[0.12] text-white font-medium"
                    : "hover:bg-white/[0.025]"
                }`}
              >
                {highlighted && (
                  <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#00e5ff] shadow-[0_0_8px_#00e5ff]" />
                )}
                <span
                  className={`sticky left-0 w-12 md:w-14 pr-4 text-right select-none shrink-0 transition-colors bg-[#05060b] ${
                    highlighted ? "text-[#00e5ff] font-bold" : "text-white/20 group-hover:text-white/45"
                  }`}
                >
                  {lineNum}
                </span>
                <code className="pl-4 pr-8 whitespace-pre">
                  {ln === "" ? " " : renderLineWithColumnHighlight(ln, lineNum, clampedRange)}
                </code>
              </div>
            );
          })}
        </pre>
      </div>

      {/* Editor Footer Bar */}
      <div className="h-7 flex items-center gap-4 px-4 border-t border-white/[0.05] font-mono text-[10.5px] text-muted-foreground shrink-0 select-none">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
          indexed
        </span>
        <span>UTF-8</span>
        <span className="ml-auto">read-only preview</span>
      </div>
    </div>
  );
}
