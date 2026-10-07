"use client";

import {
  Box,
  Braces,
  CircleDot,
  Code2,
  Network,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";

import { NODE_APPEARANCE } from "@/components/graph/CodeGraphNode";
import { cn } from "@/lib/cn";
import type { CodeGraphEdge, CodeGraphNode, GraphRelationshipType } from "@/types/graph";

type GraphInspectorProps = {
  className?: string;
  edges: CodeGraphEdge[];
  node: CodeGraphNode | null;
  nodesById: Map<string, CodeGraphNode>;
  onClose?: () => void;
  onNodeSelect: (nodeId: string) => void;
  projectName: string | null;
  projectId?: number | null;
  depth?: number;
  isExpanded?: boolean;
  onToggleExpand?: (nodeId: string) => void;
};

const relationshipNames: Record<GraphRelationshipType, string> = {
  CONTAINS: "CONTAINS",
  HANDLES: "HANDLES",
  IMPORTS: "IMPORTS",
  DECLARES: "DECLARES",
  CALLS: "CALLS",
  EXTENDS: "EXTENDS",
  HAS_METHOD: "HAS METHOD",
};

export function GraphInspector({
  className,
  edges,
  node,
  nodesById,
  onNodeSelect,
  projectName,
  projectId,
  depth = 1,
  isExpanded = false,
  onToggleExpand,
}: GraphInspectorProps) {
  const router = useRouter();

  if (!node) {
    return (
      <aside
        aria-label="Node inspector"
        className={cn(
          "flex flex-col h-full bg-gradient-to-b from-[#0a0d16]/95 to-[#070910]/95 border-white/[0.06] min-h-[360px] 2xl:min-h-0",
          className
        )}
      >
        <div className="h-12 flex items-center gap-2 px-4 border-b border-white/[0.06] sticky top-0 bg-[#0a0d16]/95 backdrop-blur z-10 shrink-0">
          <CircleDot className="w-3.5 h-3.5 text-primary/80" />
          <span className="cg-label !text-foreground/80">Node Details</span>
        </div>
        <div className="h-[310px] 2xl:h-[calc(100%-3rem)] flex items-center justify-center text-center px-6">
          <div>
            <span className="mx-auto w-12 h-12 rounded-xl border border-white/[0.08] bg-white/[0.025] flex items-center justify-center">
              <Network className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            </span>
            <p className="mt-4 text-[14px] font-medium text-white">No node selected</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
              Select a node to inspect its details and connections.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  const meta = NODE_APPEARANCE[node.type] ?? NODE_APPEARANCE.function;
  const Icon = meta.icon;

  const incoming = edges.filter((edge) => edge.target === node.id);
  const outgoing = edges.filter((edge) => edge.source === node.id);
  const callsCount = outgoing.filter((edge) => edge.type === "CALLS").length;
  const calledByCount = incoming.filter((edge) => edge.type === "CALLS").length;
  const importsCount = outgoing.filter((edge) => edge.type === "IMPORTS").length;
  const declaresCount = outgoing.filter((edge) => edge.type === "DECLARES" || edge.type === "HAS_METHOD").length;
  const declaredIn = incoming.find((edge) => edge.type === "DECLARES");
  const owningFile = declaredIn ? nodesById.get(declaredIn.source) : null;

  // Folder specific child stats
  const childFilesCount = outgoing.filter((edge) => {
    const target = nodesById.get(edge.target);
    return target?.type === "file";
  }).length;
  const childFoldersCount = outgoing.filter((edge) => {
    const target = nodesById.get(edge.target);
    return target?.type === "module";
  }).length;

  // Build connected items
  const connected = edges
    .filter((edge) => edge.source === node.id || edge.target === node.id)
    .map((edge) => {
      const isOutgoing = edge.source === node.id;
      const relatedId = isOutgoing ? edge.target : edge.source;
      const relatedNode = nodesById.get(relatedId);
      return {
        edge,
        relatedId,
        node: relatedNode,
        relation: isOutgoing
          ? (relationshipNames[edge.type] ?? edge.type)
          : edge.type === "CALLS"
          ? "CALLED BY"
          : `${relationshipNames[edge.type] ?? edge.type} (IN)`,
      };
    })
    .filter((item) => item.node !== undefined);

  // Guess language from label or owning file if file extension exists
  const fileTarget = node.type === "file" ? node.label : owningFile?.label;
  const language = fileTarget
    ? fileTarget.endsWith(".py")
      ? "Python"
      : fileTarget.endsWith(".ts") || fileTarget.endsWith(".tsx")
      ? "TypeScript"
      : fileTarget.endsWith(".js") || fileTarget.endsWith(".jsx")
      ? "JavaScript"
      : fileTarget.endsWith(".go")
      ? "Go"
      : fileTarget.endsWith(".rs")
      ? "Rust"
      : fileTarget.endsWith(".java")
      ? "Java"
      : fileTarget.endsWith(".cpp") || fileTarget.endsWith(".c")
      ? "C/C++"
      : "—"
    : "—";

  const handleNavigate = (path: string) => {
    if (!projectId) {
      router.push(path);
      return;
    }
    const queryParams = new URLSearchParams({ projectId: String(projectId) });
    if (path === "/repository" && fileTarget) {
      queryParams.set("file", fileTarget);
    }
    if (path === "/symbols" && node.type !== "project" && node.type !== "module") {
      queryParams.set("search", node.label);
    }
    router.push(`${path}?${queryParams.toString()}`);
  };

  const isFolder = node.type === "module";
  const isFile = node.type === "file";
  const isFunction = node.type === "function" || node.type === "method";

  return (
    <aside
      aria-label="Node inspector"
      className={cn(
        "flex flex-col h-full bg-gradient-to-b from-[#0a0d16]/95 to-[#070910]/95 border-white/[0.06] overflow-y-auto",
        className
      )}
    >
      {/* Header */}
      <div className="h-12 flex items-center gap-2 px-4 border-b border-white/[0.06] sticky top-0 bg-[#0a0d16]/95 backdrop-blur z-10 shrink-0">
        <CircleDot className="w-3.5 h-3.5 text-primary/80" />
        <span className="cg-label !text-foreground/80">Node Details</span>
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_#00e5ff]" />
      </div>

      <div key={node.id} className="p-4 cg-pop flex-1 flex flex-col">
        {/* Node card */}
        <div className="rounded-xl border border-primary/20 bg-primary/[0.035] p-3.5">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-lg border border-primary/25 bg-primary/[0.06] flex items-center justify-center shrink-0">
              <Icon className={cn("w-4 h-4", meta.tone)} />
            </span>
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  "font-mono text-[9.5px] tracking-[0.15em] uppercase",
                  meta.tone
                )}
              >
                {isFolder ? "FOLDER" : node.type}
              </div>
              <div
                className="mt-0.5 font-mono text-[13px] text-white truncate"
                title={node.label}
              >
                {node.label}
              </div>
            </div>
          </div>
        </div>

        {/* Specs grid */}
        <dl className="mt-3 grid grid-cols-2 gap-px bg-white/[0.06] border border-white/[0.06] rounded-lg overflow-hidden shrink-0">
          <div className="bg-[#080b12] p-2.5">
            <dt className="cg-label !text-[8px]">TYPE</dt>
            <dd className="mt-1 font-mono text-[11px] text-white uppercase">
              {isFolder ? "FOLDER" : node.type}
            </dd>
          </div>
          <div className="bg-[#080b12] p-2.5">
            <dt className="cg-label !text-[8px]">EXPLORE DEPTH</dt>
            <dd className="mt-1 font-mono text-[11px] text-white">Depth {depth}</dd>
          </div>

          {isFolder ? (
            <>
              <div className="bg-[#080b12] p-2.5">
                <dt className="cg-label !text-[8px]">FILES</dt>
                <dd className="mt-1 font-mono text-[11px] text-white">{childFilesCount}</dd>
              </div>
              <div className="bg-[#080b12] p-2.5">
                <dt className="cg-label !text-[8px]">SUBFOLDERS</dt>
                <dd className="mt-1 font-mono text-[11px] text-white">{childFoldersCount}</dd>
              </div>
            </>
          ) : isFile ? (
            <>
              <div className="bg-[#080b12] p-2.5">
                <dt className="cg-label !text-[8px]">LANGUAGE</dt>
                <dd className="mt-1 font-mono text-[11px] text-white truncate">{language}</dd>
              </div>
              <div className="bg-[#080b12] p-2.5">
                <dt className="cg-label !text-[8px]">DECLARATIONS</dt>
                <dd className="mt-1 font-mono text-[11px] text-white">{declaresCount}</dd>
              </div>
              <div className="bg-[#080b12] p-2.5">
                <dt className="cg-label !text-[8px]">IMPORTS</dt>
                <dd className="mt-1 font-mono text-[11px] text-white">{importsCount}</dd>
              </div>
              <div className="bg-[#080b12] p-2.5">
                <dt className="cg-label !text-[8px]">CALLS</dt>
                <dd className="mt-1 font-mono text-[11px] text-white">{callsCount}</dd>
              </div>
            </>
          ) : isFunction ? (
            <>
              <div className="bg-[#080b12] p-2.5">
                <dt className="cg-label !text-[8px]">FILE</dt>
                <dd className="mt-1 font-mono text-[11px] text-white truncate" title={fileTarget ?? "—"}>
                  {fileTarget ? fileTarget.split("/").pop() : "—"}
                </dd>
              </div>
              <div className="bg-[#080b12] p-2.5">
                <dt className="cg-label !text-[8px]">LANGUAGE</dt>
                <dd className="mt-1 font-mono text-[11px] text-white truncate">{language}</dd>
              </div>
              <div className="bg-[#080b12] p-2.5">
                <dt className="cg-label !text-[8px]">CALLS</dt>
                <dd className="mt-1 font-mono text-[11px] text-white">{callsCount}</dd>
              </div>
              <div className="bg-[#080b12] p-2.5">
                <dt className="cg-label !text-[8px]">CALLED BY</dt>
                <dd className="mt-1 font-mono text-[11px] text-white">{calledByCount}</dd>
              </div>
            </>
          ) : (
            <>
              <div className="bg-[#080b12] p-2.5">
                <dt className="cg-label !text-[8px]">PROJECT</dt>
                <dd className="mt-1 font-mono text-[11px] text-white truncate" title={projectName ?? "—"}>
                  {projectName ?? "—"}
                </dd>
              </div>
              <div className="bg-[#080b12] p-2.5">
                <dt className="cg-label !text-[8px]">CONNECTIONS</dt>
                <dd className="mt-1 font-mono text-[11px] text-white">
                  {incoming.length + outgoing.length}
                </dd>
              </div>
            </>
          )}
        </dl>

        {/* Expand / Collapse Action Button if node is expandable */}
        {(isFolder || (isFile && declaresCount > 0)) && onToggleExpand && (
          <button
            type="button"
            onClick={() => onToggleExpand(node.id)}
            className="mt-3 w-full h-8 flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary font-mono text-[11px] font-medium transition-colors"
          >
            <span>{isExpanded ? "− Collapse Children" : "+ Expand Children"}</span>
          </button>
        )}

        {/* Connected Nodes */}
        <div className="mt-5 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="cg-label !text-[9px] !text-foreground/75">Connected Nodes</span>
            <span className="flex-1 h-px bg-white/[0.06]" />
            <span className="font-mono text-[9px] text-muted-foreground">{connected.length}</span>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {connected.slice(0, 12).map((item) => {
              const nodeItem = item.node!;
              const itemMeta = NODE_APPEARANCE[nodeItem.type] ?? NODE_APPEARANCE.function;
              return (
                <button
                  key={`${item.edge.id}-${item.relatedId}`}
                  type="button"
                  onClick={() => onNodeSelect(nodeItem.id)}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md border border-white/[0.06] hover:border-primary/25 hover:bg-primary/[0.035] text-left transition-colors group"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: itemMeta.color }}
                  />
                  <span className="font-mono text-[10.5px] text-foreground group-hover:text-white truncate">
                    {nodeItem.label}
                  </span>
                  <span className="ml-auto font-mono text-[8px] text-muted-foreground uppercase shrink-0">
                    {relationshipNames[item.edge.type] ?? item.edge.type}
                  </span>
                </button>
              );
            })}
            {!connected.length && (
              <p className="py-3 text-[11px] text-muted-foreground">
                No visible connections at this depth.
              </p>
            )}
          </div>
        </div>

        {/* Quick action navigation buttons */}
        <div className="mt-5 grid grid-cols-1 gap-1.5 pt-2 border-t border-white/[0.06] shrink-0">
          <button
            type="button"
            onClick={() => handleNavigate("/repository")}
            className="graph-action w-full justify-start"
          >
            <Code2 className="w-3.5 h-3.5 text-blue-400" />
            View Source
          </button>
          <button
            type="button"
            onClick={() => handleNavigate("/ast")}
            className="graph-action w-full justify-start"
          >
            <Braces className="w-3.5 h-3.5 text-cyan-400" />
            Open AST
          </button>
          <button
            type="button"
            onClick={() => handleNavigate("/symbols")}
            className="graph-action w-full justify-start"
          >
            <Box className="w-3.5 h-3.5 text-emerald-400" />
            View Symbols
          </button>
          <button
            type="button"
            onClick={() => handleNavigate("/relationships")}
            className="graph-action w-full justify-start"
          >
            <Network className="w-3.5 h-3.5 text-violet-400" />
            View Relationships
          </button>
        </div>
      </div>
    </aside>
  );
}
