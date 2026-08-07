import { ArrowDownLeft, ArrowUpRight, Box, FileCode2, Network, X } from "lucide-react";

import type { CodeGraphEdge, CodeGraphNode, GraphRelationshipType } from "@/types/graph";

type GraphInspectorProps = {
  edges: CodeGraphEdge[];
  node: CodeGraphNode | null;
  nodesById: Map<string, CodeGraphNode>;
  onClose: () => void;
  projectName: string | null;
};

const relationshipNames: Record<GraphRelationshipType, string> = {
  IMPORTS: "Imports",
  EXPORTS: "Exports",
  CALLS: "Calls",
  HAS_METHOD: "Has method",
  EXTENDS: "Extends",
  CONTAINS: "Contains",
};

function relatedLabel(edge: CodeGraphEdge, node: CodeGraphNode, nodesById: Map<string, CodeGraphNode>) {
  return nodesById.get(edge.source === node.id ? edge.target : edge.source)?.label ?? "Unavailable node";
}

function RelationshipList({ edges, icon: Icon, node, nodesById, title }: { edges: CodeGraphEdge[]; icon: typeof ArrowDownLeft; node: CodeGraphNode; nodesById: Map<string, CodeGraphNode>; title: string }) {
  if (!edges.length) return null;
  return <section className="border-t border-slate-800 pt-4"><h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"><Icon className="size-3.5" />{title}</h3><ul className="mt-2 space-y-2">{edges.map((edge, index) => <li key={`${edge.source}-${edge.target}-${edge.relationship}-${index}`} className="rounded-md border border-slate-800 bg-slate-900/50 px-2.5 py-2"><p className="truncate text-sm font-medium text-slate-200">{relatedLabel(edge, node, nodesById)}</p><p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-300">{relationshipNames[edge.relationship]}</p></li>)}</ul></section>;
}

export function GraphInspector({ edges, node, nodesById, onClose, projectName }: GraphInspectorProps) {
  if (!node) return <aside className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-950/65 p-6 text-center"><Network className="size-6 text-slate-600" /><h2 className="mt-3 text-sm font-semibold text-slate-300">Node Inspector</h2><p className="mt-1 text-sm leading-6 text-slate-500">Select a node to inspect its code relationships.</p></aside>;

  const incoming = edges.filter((edge) => edge.target === node.id);
  const outgoing = edges.filter((edge) => edge.source === node.id);
  const imports = outgoing.filter((edge) => edge.relationship === "IMPORTS");
  const calls = outgoing.filter((edge) => edge.relationship === "CALLS");
  const methods = [...incoming, ...outgoing].filter((edge) => edge.relationship === "HAS_METHOD");
  const references = [...incoming, ...outgoing].filter((edge) => !["IMPORTS", "CALLS", "HAS_METHOD"].includes(edge.relationship));

  return <aside aria-label="Node inspector" className="max-h-[min(72vh,48rem)] overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/65 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300">Node Inspector</p><h2 className="mt-1 truncate text-lg font-semibold text-slate-100" title={node.label}>{node.label}</h2></div><button type="button" onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-200" aria-label="Close node inspector"><X className="size-4" /></button></div><dl className="mt-4 space-y-2 rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-sm"><div className="flex justify-between gap-3"><dt className="text-slate-500">Type</dt><dd className="font-medium capitalize text-slate-200">{node.type}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Project</dt><dd className="max-w-40 truncate font-medium text-slate-200">{projectName ?? `Project #${node.project_id}`}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">File ID</dt><dd className="font-mono text-slate-300">{node.file_id ?? "—"}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Project ID</dt><dd className="font-mono text-slate-300">{node.project_id}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Connected</dt><dd className="font-medium text-slate-200">{incoming.length + outgoing.length}</dd></div></dl><div className="mt-4 space-y-4"><RelationshipList title="Incoming edges" icon={ArrowDownLeft} edges={incoming} node={node} nodesById={nodesById} /><RelationshipList title="Outgoing edges" icon={ArrowUpRight} edges={outgoing} node={node} nodesById={nodesById} /><RelationshipList title="Imports" icon={FileCode2} edges={imports} node={node} nodesById={nodesById} /><RelationshipList title="Calls" icon={ArrowUpRight} edges={calls} node={node} nodesById={nodesById} /><RelationshipList title="Methods" icon={Box} edges={methods} node={node} nodesById={nodesById} /><RelationshipList title="References" icon={Network} edges={references} node={node} nodesById={nodesById} /></div></aside>;
}
