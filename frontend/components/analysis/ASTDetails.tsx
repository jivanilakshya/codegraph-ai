import { Braces } from "lucide-react";

import type { AstNodeData } from "@/types/workspace";

type ASTDetailsProps = { node: AstNodeData | null; sourceText: string | null };

function sourceSnippet(node: AstNodeData, sourceText: string | null): string | null {
  if (!sourceText) return null;

  const lines = sourceText.split("\n");
  const startLine = lines[node.start_point.row];
  const endLine = lines[node.end_point.row];
  if (startLine === undefined || endLine === undefined) return null;
  if (node.start_point.row === node.end_point.row) return startLine.slice(node.start_point.column, node.end_point.column);

  return [startLine.slice(node.start_point.column), ...lines.slice(node.start_point.row + 1, node.end_point.row), endLine.slice(0, node.end_point.column)].join("\n");
}

export function ASTDetails({ node, sourceText }: ASTDetailsProps) {
  if (!node) return null;
  const snippet = sourceSnippet(node, sourceText);

  return (
    <section className="border-t border-slate-800 bg-[#0b111b] p-3">
      <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500"><Braces className="size-3.5" /> Node details</h3>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <div className="col-span-2"><dt className="text-slate-500">Type</dt><dd className="mt-0.5 font-mono text-cyan-300">{node.type}</dd></div>
        <div><dt className="text-slate-500">Start</dt><dd className="mt-0.5 text-slate-300">Line {node.start_point.row + 1}, Col {node.start_point.column + 1}</dd></div>
        <div><dt className="text-slate-500">End</dt><dd className="mt-0.5 text-slate-300">Line {node.end_point.row + 1}, Col {node.end_point.column + 1}</dd></div>
      </dl>
      <div className="mt-3"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Source text</p>{snippet ? <pre className="mt-1 max-h-28 overflow-auto rounded bg-slate-900 p-2 whitespace-pre-wrap break-words font-mono text-[11px] leading-4 text-slate-300">{snippet}</pre> : <p className="mt-1 text-xs text-slate-600">Source text unavailable.</p>}</div>
    </section>
  );
}
