"use client";

import { Background, BackgroundVariant, Controls, MiniMap, ReactFlow, type Edge, type Node, type OnInit, type ReactFlowInstance, useEdgesState, useNodesState } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useRef } from "react";

import { CodeGraphNode, type FlowCodeGraphNodeData } from "@/components/graph/CodeGraphNode";
import type { CodeGraphEdge, CodeGraphNode as CodeGraphNodeRecord } from "@/types/graph";

type GraphCanvasProps = {
  edges?: CodeGraphEdge[];
  fitViewRequest?: number;
  focusNodeId?: string | null;
  isSearching?: boolean;
  matchedNodeIds?: Set<string>;
  nodes?: CodeGraphNodeRecord[];
  onNodeSelect?: (nodeId: string) => void;
};

const nodeTypes = { codeGraph: CodeGraphNode };
const layerByType = { file: 0, module: 1, class: 1, function: 2, method: 2, variable: 3 } as const;
const emptyMatchedNodeIds = new Set<string>();

/**
 * Deterministic grouped layered layout. Each file owns a horizontal lane, and
 * semantic node types always occupy the same column. The in-lane ordering is
 * refined with a few barycentric passes over graph neighbors, reducing edge
 * crossings without allowing nodes to leave their file group.
 */
function layoutBySourceHierarchy(inputNodes: CodeGraphNodeRecord[] = [], inputEdges: CodeGraphEdge[] = [], matchedNodeIds: Set<string> = emptyMatchedNodeIds, focusedNodeId: string | null = null, isSearching = false): Node<FlowCodeGraphNodeData>[] {
  const byId = new Map(inputNodes.map((node) => [node.id, node]));
  const neighbors = new Map<string, string[]>();
  inputEdges.forEach((edge) => {
    if (!byId.has(edge.source) || !byId.has(edge.target)) return;
    neighbors.set(edge.source, [...(neighbors.get(edge.source) ?? []), edge.target]);
    neighbors.set(edge.target, [...(neighbors.get(edge.target) ?? []), edge.source]);
  });
  const filesById = new Map(inputNodes.filter((node) => node.type === "file" && node.file_id !== null).map((node) => [node.file_id, node]));
  const groupedNodes = new Map<number | null, CodeGraphNodeRecord[]>();
  inputNodes.filter((node) => node.type !== "file").forEach((node) => groupedNodes.set(node.file_id, [...(groupedNodes.get(node.file_id) ?? []), node]));
  const groupIds = [...new Set<number | null>([...filesById.keys(), ...groupedNodes.keys()])].sort((left, right) => {
    const leftLabel = filesById.get(left)?.label ?? groupedNodes.get(left)?.[0]?.label ?? "";
    const rightLabel = filesById.get(right)?.label ?? groupedNodes.get(right)?.[0]?.label ?? "";
    return leftLabel.localeCompare(rightLabel);
  });
  const baseOrder = new Map(inputNodes.slice().sort((left, right) => left.label.localeCompare(right.label) || left.id.localeCompare(right.id)).map((node, index) => [node.id, index]));
  const columns = [0, 330, 660, 990];
  const rowGap = Math.max(86, Math.round(96 - Math.min(inputNodes.length, 120) / 12));
  const laneGap = Math.max(110, rowGap + 20);
  const bucketsByGroup = new Map<number | null, Map<number, CodeGraphNodeRecord[]>>();
  groupIds.forEach((fileId) => {
    const buckets = new Map<number, CodeGraphNodeRecord[]>();
    groupedNodes.get(fileId)?.forEach((node) => {
      const layer = layerByType[node.type];
      buckets.set(layer, [...(buckets.get(layer) ?? []), node]);
    });
    buckets.forEach((bucket) => bucket.sort((left, right) => (baseOrder.get(left.id) ?? 0) - (baseOrder.get(right.id) ?? 0)));
    bucketsByGroup.set(fileId, buckets);
  });

  let order = new Map(baseOrder);
  for (let pass = 0; pass < 3; pass += 1) {
    groupIds.forEach((fileId) => bucketsByGroup.get(fileId)?.forEach((bucket) => bucket.sort((left, right) => {
      const score = (node: CodeGraphNodeRecord) => {
        const orderedNeighbors = (neighbors.get(node.id) ?? []).map((id) => order.get(id)).filter((rank): rank is number => rank !== undefined);
        return orderedNeighbors.length ? orderedNeighbors.reduce((sum, rank) => sum + rank, 0) / orderedNeighbors.length : baseOrder.get(node.id) ?? 0;
      };
      return score(left) - score(right) || (baseOrder.get(left.id) ?? 0) - (baseOrder.get(right.id) ?? 0);
    })));
    order = new Map<string, number>();
    let rank = 0;
    groupIds.forEach((fileId) => {
      const file = filesById.get(fileId);
      if (file) order.set(file.id, rank++);
      bucketsByGroup.get(fileId)?.forEach((bucket) => bucket.forEach((node) => order.set(node.id, rank++)));
    });
  }

  const positionById = new Map<string, { x: number; y: number }>();
  let laneTop = 0;
  groupIds.forEach((fileId) => {
    const buckets = bucketsByGroup.get(fileId) ?? new Map<number, CodeGraphNodeRecord[]>();
    const laneHeight = Math.max(rowGap, ...[...buckets.values()].map((bucket) => bucket.length * rowGap));
    const file = filesById.get(fileId);
    if (file) positionById.set(file.id, { x: columns[0], y: laneTop + (laneHeight - 64) / 2 });
    buckets.forEach((bucket, layer) => bucket.forEach((node, index) => positionById.set(node.id, { x: columns[layer], y: laneTop + index * rowGap })));
    laneTop += laneHeight + laneGap;
  });
  inputNodes.filter((node) => node.type === "file" && !positionById.has(node.id)).sort((left, right) => left.label.localeCompare(right.label)).forEach((file) => {
    positionById.set(file.id, { x: columns[0], y: laneTop });
    laneTop += rowGap + laneGap;
  });

  return inputNodes.map((node) => ({ id: node.id, type: "codeGraph", position: positionById.get(node.id) ?? { x: 860, y: 0 }, data: { label: node.label, nodeType: node.type, focused: node.id === focusedNodeId, matched: matchedNodeIds.has(node.id), dimmed: isSearching && !matchedNodeIds.has(node.id) } }));
}

function flowEdges(edges: CodeGraphEdge[] = [], matchedNodeIds: Set<string> = emptyMatchedNodeIds, isSearching = false): Edge[] {
  return edges.map((edge, index) => {
    const relatedToMatch = !isSearching || matchedNodeIds.has(edge.source) || matchedNodeIds.has(edge.target);
    return { id: `${edge.source}-${edge.target}-${edge.relationship}-${index}`, source: edge.source, target: edge.target, type: "smoothstep", label: edge.relationship, labelStyle: { fill: "#bae6fd", fontSize: 10, fontWeight: 700, opacity: relatedToMatch ? 1 : 0.35 }, labelBgStyle: { fill: "#0f172a", fillOpacity: relatedToMatch ? 0.9 : 0.45 }, labelBgPadding: [4, 2], style: { stroke: relatedToMatch ? "#64748b" : "#334155", strokeWidth: relatedToMatch ? 1.35 : 1, opacity: relatedToMatch ? 1 : 0.3 } };
  });
}

export function GraphCanvas({ edges: inputEdges = [], fitViewRequest = 0, focusNodeId = null, isSearching = false, matchedNodeIds = emptyMatchedNodeIds, nodes: inputNodes = [], onNodeSelect = () => {} }: GraphCanvasProps) {
  const instance = useRef<ReactFlowInstance<Node<FlowCodeGraphNodeData>, Edge> | null>(null);
  const initialNodes = useMemo(() => layoutBySourceHierarchy(inputNodes, inputEdges, matchedNodeIds, focusNodeId, isSearching), [focusNodeId, inputEdges, inputNodes, isSearching, matchedNodeIds]);
  const initialEdges = useMemo(() => flowEdges(inputEdges, matchedNodeIds, isSearching), [inputEdges, isSearching, matchedNodeIds]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => { setNodes(layoutBySourceHierarchy(inputNodes, inputEdges, matchedNodeIds, focusNodeId, isSearching)); }, [focusNodeId, inputEdges, inputNodes, isSearching, matchedNodeIds, setNodes]);
  useEffect(() => { setEdges(flowEdges(inputEdges, matchedNodeIds, isSearching)); }, [inputEdges, isSearching, matchedNodeIds, setEdges]);
  useEffect(() => { if (fitViewRequest) requestAnimationFrame(() => instance.current?.fitView({ duration: 350, padding: 0.2, maxZoom: 1.2 })); }, [fitViewRequest]);
  useEffect(() => { const focusedNode = focusNodeId ? nodes.find((node) => node.id === focusNodeId) : null; if (focusedNode) instance.current?.setCenter(focusedNode.position.x + 90, focusedNode.position.y + 42, { duration: 350, zoom: 1.15 }); }, [focusNodeId, nodes]);

  const onInit: OnInit<Node<FlowCodeGraphNodeData>, Edge> = (reactFlowInstance) => { instance.current = reactFlowInstance; requestAnimationFrame(() => reactFlowInstance.fitView({ padding: 0.2, maxZoom: 1.2 })); };

  return <div className="h-[min(68vh,760px)] min-h-[34rem] overflow-hidden rounded-xl border border-slate-800 bg-slate-950"><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onInit={onInit} onNodeClick={(_, node) => onNodeSelect(node.id)} fitView nodesDraggable panOnDrag zoomOnScroll zoomOnPinch minZoom={0.2} maxZoom={2.5} proOptions={{ hideAttribution: true }}><Background variant={BackgroundVariant.Lines} gap={20} size={1} color="#334155" /><Controls className="!rounded-lg !border-slate-700 !bg-slate-900 [&>button]:!border-slate-700 [&>button]:!bg-slate-900 [&>button]:!fill-slate-300 hover:[&>button]:!bg-slate-800" showInteractive={false} /><MiniMap pannable zoomable nodeColor={(node) => { const type = (node.data as FlowCodeGraphNodeData).nodeType; return type === "class" ? "#a78bfa" : type === "function" || type === "method" ? "#34d399" : type === "variable" ? "#fbbf24" : type === "module" ? "#60a5fa" : "#22d3ee"; }} maskColor="rgba(2, 6, 23, 0.78)" className="!rounded-lg !border !border-slate-700 !bg-slate-900" /></ReactFlow></div>;
}
