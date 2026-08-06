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
    if (fragment.startsWith("\"") || fragment.startsWith("'")) return <span key={index} className="text-emerald-300">{fragment}</span>;
    if (keywords.has(fragment)) return <span key={index} className="text-violet-300">{fragment}</span>;
    return <span key={index}>{fragment}</span>;
  });
}

export function CodeViewer({ file, isLoading, error }: CodeViewerProps) {
  if (isLoading) return <section className="grid min-h-96 place-items-center bg-[#080d14]"><div className="flex items-center gap-2 text-sm text-slate-400"><LoaderCircle className="size-4 animate-spin" /> Loading file…</div></section>;
  if (error) return <section className="grid min-h-96 place-items-center bg-[#080d14] p-6 text-center"><div><FileWarning className="mx-auto size-7 text-rose-300" /><p className="mt-3 text-sm text-rose-200">{error}</p></div></section>;
  if (!file) return <section className="grid min-h-96 place-items-center bg-[#080d14] p-6 text-center"><div><Code2 className="mx-auto size-8 text-slate-600" /><h2 className="mt-3 font-medium text-slate-300">Select a file to preview</h2><p className="mt-1 text-sm text-slate-500">Choose a repository file from the explorer.</p></div></section>;

  const lines = file.content.split("\n");
  return (
    <section className="min-h-96 overflow-auto bg-[#080d14] font-mono text-[13px] leading-6 text-slate-300">
      <div className="sticky top-0 z-10 flex h-9 items-center border-b border-slate-800 bg-[#0b111b] px-4 text-xs text-slate-500"><span className="truncate">{file.path}</span><span className="ml-auto pl-4 uppercase">{file.language ?? "Plain text"}</span></div>
      <pre className="min-w-max py-3"><code>{lines.map((line, index) => <span key={index} className="flex"><span className="w-14 shrink-0 select-none border-r border-slate-800/70 pr-3 text-right text-slate-600">{index + 1}</span><span className="whitespace-pre px-4">{highlightLine(line)}</span></span>)}</code></pre>
    </section>
  );
}
