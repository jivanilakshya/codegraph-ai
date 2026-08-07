import { useEffect, useMemo, useState } from "react";

import type { AstNodeData } from "@/types/workspace";

import { ASTDetails } from "./ASTDetails";
import { ASTNode } from "./ASTNode";

type ASTTreeProps = { ast: AstNodeData; searchTerm: string; sourceText: string | null };

function expandedFirstTwoLevels(node: AstNodeData, nodeId = "0", depth = 0): Set<string> {
  const expanded = new Set<string>();
  if (depth < 2 && node.children.length) expanded.add(nodeId);
  node.children.forEach((child, index) => expandedFirstTwoLevels(child, `${nodeId}.${index}`, depth + 1).forEach((id) => expanded.add(id)));
  return expanded;
}

function searchMatches(node: AstNodeData, searchTerm: string, sourceText: string | null, nodeId = "0", ancestors: string[] = []): { matches: number; expanded: Set<string> } {
  const expanded = new Set<string>();
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const identifier = node.type === "identifier" && node.start_point.row === node.end_point.row && sourceText ? sourceText.split("\n")[node.start_point.row]?.slice(node.start_point.column, node.end_point.column) : "";
  const matches = normalizedSearch && `${node.type} ${identifier}`.toLowerCase().includes(normalizedSearch) ? 1 : 0;
  if (matches) ancestors.forEach((ancestor) => expanded.add(ancestor));

  return node.children.reduce(
    (result, child, index) => {
      const childResult = searchMatches(child, searchTerm, sourceText, `${nodeId}.${index}`, [...ancestors, nodeId]);
      childResult.expanded.forEach((id) => result.expanded.add(id));
      return { matches: result.matches + childResult.matches, expanded: result.expanded };
    },
    { matches, expanded },
  );
}

export function getAstMetrics(ast: AstNodeData): { nodeCount: number; maximumDepth: number } {
  return ast.children.reduce(
    (metrics, child) => {
      const childMetrics = getAstMetrics(child);
      return { nodeCount: metrics.nodeCount + childMetrics.nodeCount, maximumDepth: Math.max(metrics.maximumDepth, childMetrics.maximumDepth + 1) };
    },
    { nodeCount: 1, maximumDepth: 1 },
  );
}

export function getAstSearchMatchCount(ast: AstNodeData, searchTerm: string, sourceText: string | null): number {
  return searchMatches(ast, searchTerm, sourceText).matches;
}

export function ASTTree({ ast, searchTerm, sourceText }: ASTTreeProps) {
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(() => expandedFirstTwoLevels(ast));
  const [selectedNode, setSelectedNode] = useState<AstNodeData>(ast);
  const [selectedNodeId, setSelectedNodeId] = useState("0");
  const searchResult = useMemo(() => searchMatches(ast, searchTerm, sourceText), [ast, searchTerm, sourceText]);

  useEffect(() => {
    setExpandedNodeIds(expandedFirstTwoLevels(ast));
    setSelectedNode(ast);
    setSelectedNodeId("0");
  }, [ast]);

  useEffect(() => {
    if (searchTerm.trim()) setExpandedNodeIds((current) => new Set([...current, ...searchResult.expanded]));
  }, [searchResult.expanded, searchTerm]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-auto p-2"><ul><ASTNode node={ast} nodeId="0" depth={0} expandedNodeIds={expandedNodeIds} selectedNodeId={selectedNodeId} searchTerm={searchTerm} sourceText={sourceText} onSelect={(node, nodeId) => { setSelectedNode(node); setSelectedNodeId(nodeId); }} onToggle={(nodeId) => setExpandedNodeIds((current) => { const next = new Set(current); if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId); return next; })} /></ul></div>
      <ASTDetails node={selectedNode} sourceText={sourceText} />
    </div>
  );
}
