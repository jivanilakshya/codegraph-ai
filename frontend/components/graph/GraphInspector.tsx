import { ArrowDownLeft, ArrowUpRight, FileCode2, X } from "lucide-react";

import type { CodeGraphEdge, CodeGraphNode, GraphRelationshipType } from "@/types/graph";

type GraphInspectorProps = {
  className?: string;
  edges: CodeGraphEdge[];
  node: CodeGraphNode | null;
  nodesById: Map<string, CodeGraphNode>;
  onClose: () => void;
  onNodeSelect: (nodeId: string) => void;
  projectName: string | null;
};

const relationshipNames: Record<GraphRelationshipType, string> = {
  IMPORTS: "Imports",
  DECLARES: "Declares",
  CALLS: "Calls",
};

function RelationshipList({ edges, icon: Icon, node, nodesById, onNodeSelect, title }: { edges: CodeGraphEdge[]; icon: typeof ArrowDownLeft; node: CodeGraphNode; nodesById: Map<string, CodeGraphNode>; onNodeSelect: (nodeId: string) => void; title: string }) {
  if (!edges.length) return null;
  return <section className="border-t border-slate-800 pt-4"><h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"><Icon className="size-3.5" />{title}</h3><ul className="mt-2 space-y-2">{edges.map((edge) => {
    const relatedId = edge.source === node.id ? edge.target : edge.source;
    const relatedNode = nodesById.get(relatedId);
    return <li key={edge.id}><button type="button" disabled={!relatedNode} onClick={() => onNodeSelect(relatedId)} className="w-full rounded-md border border-slate-800 bg-slate-900/50 px-2.5 py-2 text-left transition-colors hover:border-cyan-500/50 hover:bg-cyan-400/10 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 disabled:cursor-default disabled:opacity-60"><p className="truncate text-sm font-medium text-slate-200">{relatedNode?.label ?? "Unavailable node"}</p><p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-300">{relationshipNames[edge.type]}</p></button></li>;
  })}</ul></section>;
}

export function GraphInspector({ className, edges, node, nodesById, onClose, onNodeSelect, projectName }: GraphInspectorProps) {
  if (!node) return null;

  const incoming = edges.filter((edge) => edge.target === node.id);
  const outgoing = edges.filter((edge) => edge.source === node.id);
  const calls = outgoing.filter((edge) => edge.type === "CALLS");
  const calledBy = incoming.filter((edge) => edge.type === "CALLS");
  const imports = outgoing.filter((edge) => edge.type === "IMPORTS");
  const declares = outgoing.filter((edge) => edge.type === "DECLARES");
  const declaredIn = incoming.find((edge) => edge.type === "DECLARES");
  const owningFile = declaredIn ? nodesById.get(declaredIn.source) : null;

  return <aside aria-label="Node inspector" className={`overflow-y-auto border-slate-800 bg-slate-950/95 p-4 backdrop-blur-md ${className ?? "max-h-[min(72vh,48rem)] rounded-xl border"}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300">Node Inspector</p><h2 className="mt-1 truncate text-lg font-semibold text-slate-100" title={node.label}>{node.label}</h2></div><button type="button" onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-200" aria-label="Close node inspector"><X className="size-4" /></button></div><dl className="mt-4 space-y-2 rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-sm"><div className="flex justify-between gap-3"><dt className="text-slate-500">Type</dt><dd className="font-medium capitalize text-slate-200">{node.type}</dd></div>{owningFile ? <div className="flex justify-between gap-3"><dt className="text-slate-500">File</dt><dd className="max-w-40 truncate font-medium text-slate-200" title={owningFile.label}>{owningFile.label}</dd></div> : null}<div className="flex justify-between gap-3"><dt className="text-slate-500">Project</dt><dd className="max-w-40 truncate font-medium text-slate-200">{projectName ?? "Current project"}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Connected</dt><dd className="font-medium text-slate-200">{incoming.length + outgoing.length}</dd></div></dl><div className="mt-4 space-y-4">{declaredIn && owningFile ? <section className="border-t border-slate-800 pt-4"><h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"><FileCode2 className="size-3.5" />Declared In</h3><button type="button" onClick={() => onNodeSelect(owningFile.id)} className="mt-2 w-full rounded-md border border-slate-800 bg-slate-900/50 px-2.5 py-2 text-left transition-colors hover:border-cyan-500/50 hover:bg-cyan-400/10 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"><p className="truncate text-sm font-medium text-slate-200">{owningFile.label}</p></button></section> : null}<RelationshipList title="Calls" icon={ArrowUpRight} edges={calls} node={node} nodesById={nodesById} onNodeSelect={onNodeSelect} /><RelationshipList title="Called By" icon={ArrowDownLeft} edges={calledBy} node={node} nodesById={nodesById} onNodeSelect={onNodeSelect} /><RelationshipList title="Imports" icon={FileCode2} edges={imports} node={node} nodesById={nodesById} onNodeSelect={onNodeSelect} /><RelationshipList title="Declares" icon={FileCode2} edges={declares} node={node} nodesById={nodesById} onNodeSelect={onNodeSelect} /></div></aside>;
}
