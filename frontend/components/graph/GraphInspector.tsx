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
  CONTAINS: "Contains",
  HANDLES: "Handles",
  IMPORTS: "Imports",
  DECLARES: "Declares",
  CALLS: "Calls",
  EXTENDS: "Extends",
  HAS_METHOD: "Has method",
};

const typeBadgeColors: Record<string, string> = {
  project: "border-fuchsia-500/30 bg-fuchsia-500/15 text-fuchsia-300",
  module: "border-sky-500/30 bg-sky-500/15 text-sky-300",
  api_route: "border-rose-500/30 bg-rose-500/15 text-rose-300",
  file: "border-blue-500/30 bg-blue-500/15 text-blue-300",
  class: "border-violet-500/30 bg-violet-500/15 text-violet-300",
  function: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
  method: "border-teal-500/30 bg-teal-500/15 text-teal-300",
  variable: "border-amber-500/30 bg-amber-500/15 text-amber-300",
};

function RelationshipList({
  edges,
  icon: Icon,
  node,
  nodesById,
  onNodeSelect,
  title,
}: {
  edges: CodeGraphEdge[];
  icon: typeof ArrowDownLeft;
  node: CodeGraphNode;
  nodesById: Map<string, CodeGraphNode>;
  onNodeSelect: (nodeId: string) => void;
  title: string;
}) {
  if (!edges.length) return null;

  return (
    <section className="border-t border-slate-800/80 pt-3">
      <h3 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
        <Icon className="size-3.5 text-cyan-400" />
        {title}
        <span className="text-slate-500">({edges.length})</span>
      </h3>
      <ul className="mt-2 space-y-1.5">
        {edges.map((edge) => {
          const relatedId = edge.source === node.id ? edge.target : edge.source;
          const relatedNode = nodesById.get(relatedId);
          const typeBadge = relatedNode
            ? typeBadgeColors[relatedNode.type] ?? "border-slate-700 bg-slate-800 text-slate-300"
            : "";

          return (
            <li key={edge.id}>
              <button
                type="button"
                disabled={!relatedNode}
                onClick={() => onNodeSelect(relatedId)}
                className="group flex w-full items-center justify-between gap-2 rounded-lg border border-slate-800/90 bg-slate-900/60 p-2.5 text-left transition-all duration-150 hover:border-cyan-500/50 hover:bg-slate-800/80 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 disabled:cursor-default disabled:opacity-50"
              >
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-xs font-semibold text-slate-200 group-hover:text-white"
                    title={relatedNode?.label ?? "Unavailable node"}
                  >
                    {relatedNode?.label ?? "Unavailable node"}
                  </p>
                  <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-400/80">
                    {relationshipNames[edge.type] ?? edge.type}
                  </p>
                </div>
                {relatedNode && (
                  <span
                    className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${typeBadge}`}
                  >
                    {relatedNode.type}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function GraphInspector({
  className,
  edges,
  node,
  nodesById,
  onClose,
  onNodeSelect,
  projectName,
}: GraphInspectorProps) {
  if (!node) return null;

  const incoming = edges.filter((edge) => edge.target === node.id);
  const outgoing = edges.filter((edge) => edge.source === node.id);
  const calls = outgoing.filter((edge) => edge.type === "CALLS");
  const calledBy = incoming.filter((edge) => edge.type === "CALLS");
  const imports = outgoing.filter((edge) => edge.type === "IMPORTS");
  const importedBy = incoming.filter((edge) => edge.type === "IMPORTS");
  const contains = outgoing.filter((edge) => edge.type === "CONTAINS");
  const containedBy = incoming.find((edge) => edge.type === "CONTAINS");
  const declares = outgoing.filter((edge) => edge.type === "DECLARES");
  const extendsEdges = outgoing.filter((edge) => edge.type === "EXTENDS");
  const extendedBy = incoming.filter((edge) => edge.type === "EXTENDS");
  const hasMethods = outgoing.filter((edge) => edge.type === "HAS_METHOD");
  const methodOf = incoming.filter((edge) => edge.type === "HAS_METHOD");
  const declaredIn = incoming.find((edge) => edge.type === "DECLARES");
  const owningFile = declaredIn ? nodesById.get(declaredIn.source) : null;
  const parentArchitectureNode = containedBy ? nodesById.get(containedBy.source) : null;

  const badgeColor =
    typeBadgeColors[node.type] ?? "border-slate-700 bg-slate-800 text-slate-300";

  return (
    <aside
      aria-label="Node inspector"
      className={`flex flex-col overflow-y-auto border-slate-800 bg-slate-950/95 p-4 backdrop-blur-md shadow-2xl ${
        className ?? "max-h-[min(72vh,48rem)] rounded-2xl border"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-400">
            Node Inspector
          </p>
          <h2
            className="mt-1 truncate text-base font-bold text-slate-100 sm:text-lg"
            title={node.label}
          >
            {node.label}
          </h2>
          <div className="mt-1.5 flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}
            >
              {node.type}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          aria-label="Close node inspector"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Overview Specs */}
      <dl className="mt-3.5 space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">Type</dt>
          <dd className="font-semibold capitalize text-slate-200">{node.type}</dd>
        </div>
        {owningFile ? (
          <div className="flex justify-between gap-3">
            <dt className="text-slate-400">File</dt>
            <dd className="max-w-44 truncate font-medium text-cyan-300" title={owningFile.label}>
              {owningFile.label}
            </dd>
          </div>
        ) : null}
        {parentArchitectureNode ? (
          <div className="flex justify-between gap-3">
            <dt className="text-slate-400">Parent</dt>
            <dd className="max-w-44 truncate font-medium text-slate-200" title={parentArchitectureNode.label}>
              {parentArchitectureNode.label}
            </dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">Project</dt>
          <dd className="max-w-44 truncate font-medium text-slate-200">
            {projectName ?? "Current project"}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">Connections</dt>
          <dd className="font-semibold text-slate-200">
            {incoming.length + outgoing.length}
          </dd>
        </div>
      </dl>

      {/* Relationships */}
      <div className="mt-3.5 space-y-3 flex-1">
        {declaredIn && owningFile ? (
          <section className="border-t border-slate-800/80 pt-3">
            <h3 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              <FileCode2 className="size-3.5 text-cyan-400" />
              Declared In
            </h3>
            <button
              type="button"
              onClick={() => onNodeSelect(owningFile.id)}
              className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 text-left transition-all hover:border-cyan-500/50 hover:bg-slate-800/80"
            >
              <p className="truncate text-xs font-semibold text-slate-200">{owningFile.label}</p>
            </button>
          </section>
        ) : null}

        <RelationshipList title="Contains" icon={ArrowDownLeft} edges={contains} node={node} nodesById={nodesById} onNodeSelect={onNodeSelect} />
        <RelationshipList title="Calls" icon={ArrowUpRight} edges={calls} node={node} nodesById={nodesById} onNodeSelect={onNodeSelect} />
        <RelationshipList title="Called By" icon={ArrowDownLeft} edges={calledBy} node={node} nodesById={nodesById} onNodeSelect={onNodeSelect} />
        <RelationshipList title="Extends" icon={ArrowUpRight} edges={extendsEdges} node={node} nodesById={nodesById} onNodeSelect={onNodeSelect} />
        <RelationshipList title="Extended By" icon={ArrowDownLeft} edges={extendedBy} node={node} nodesById={nodesById} onNodeSelect={onNodeSelect} />
        <RelationshipList title="Methods" icon={ArrowUpRight} edges={hasMethods} node={node} nodesById={nodesById} onNodeSelect={onNodeSelect} />
        <RelationshipList title="Method Of" icon={ArrowDownLeft} edges={methodOf} node={node} nodesById={nodesById} onNodeSelect={onNodeSelect} />
        <RelationshipList title="Imports" icon={FileCode2} edges={imports} node={node} nodesById={nodesById} onNodeSelect={onNodeSelect} />
        <RelationshipList title="Imported By" icon={ArrowDownLeft} edges={importedBy} node={node} nodesById={nodesById} onNodeSelect={onNodeSelect} />
        <RelationshipList title="Declares" icon={FileCode2} edges={declares} node={node} nodesById={nodesById} onNodeSelect={onNodeSelect} />
      </div>
    </aside>
  );
}
