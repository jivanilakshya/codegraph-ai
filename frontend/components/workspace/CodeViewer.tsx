import { Code2, FileWarning, LoaderCircle } from "lucide-react";

import type { FileContent } from "@/types/workspace";

type CodeViewerProps = {
  file: FileContent | null;
  isLoading: boolean;
  error: string | null;
};

const keywords = new Set(["async", "await", "class", "const", "def", "export", "for", "from", "function", "if", "import", "in", "interface", "let", "new", "return", "type", "var"]);

function highlightLine(line: string) {
  const fragments = line.split(/(\/\/.*$|#.*$|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b[A-Za-z_][A-Za-z0-9_]*\b)/g);
  return fragments.map((fragment, index) => {
    if (fragment.startsWith("//") || fragment.startsWith("#")) return <span key={index} className="text-slate-500">{fragment}</span>;
    if (fragment.startsWith("\"") || fragment.startsWith("'")) return <span key={index} className="text-emerald-350">{fragment}</span>;
    if (keywords.has(fragment)) return <span key={index} className="text-violet-300">{fragment}</span>;
    return <span key={index}>{fragment}</span>;
  });
}

export function CodeViewer({ file, isLoading, error }: CodeViewerProps) {
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

  const lines = file.content.split("\n");
  return (
    <section className="flex h-full flex-col bg-[#080d14] font-mono text-[13px] leading-6 text-slate-300 min-h-0">
      <div className="shrink-0 flex h-10 items-center border-b border-slate-800 bg-[#0a1019] px-4 text-xs text-slate-400 select-none">
        <span className="truncate font-semibold text-slate-300">{file.path}</span>
        <span className="ml-auto pl-4 font-mono text-[10px] tracking-wide text-cyan-400 uppercase bg-cyan-950/20 px-2 py-0.5 rounded border border-cyan-800/20">
          {file.language ?? "Plain text"}
        </span>
      </div>
      <div className="flex-1 overflow-auto py-3 min-h-0">
        <pre className="min-w-max">
          <code>
            {lines.map((line, index) => (
              <span key={index} className="flex hover:bg-slate-900/35 transition-colors">
                <span className="w-12 shrink-0 select-none border-r border-slate-800/70 pr-3 text-right text-slate-600">
                  {index + 1}
                </span>
                <span className="whitespace-pre px-4">{highlightLine(line)}</span>
              </span>
            ))}
          </code>
        </pre>
      </div>
    </section>
  );
}
