"use client";

import dagre from "dagre";
import { Background, BackgroundVariant, Controls, MiniMap, Position, ReactFlow, type Edge, type Node, type OnInit, type ReactFlowInstance, useEdgesState, useNodesState } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { CodeGraphNode, FileModuleNode, type FlowCodeGraphNodeData } from "@/components/graph/CodeGraphNode";
import type { CodeGraphEdge, CodeGraphNode as CodeGraphNodeRecord } from "@/types/graph";

type GraphCanvasProps = {
  edges?: CodeGraphEdge[];
  fitViewRequest?: number;
  focusNodeId?: string | null;
  graphKey?: string;
  isSearching?: boolean;
  matchedNodeIds?: Set<string>;
  nodes?: CodeGraphNodeRecord[];
  onFileFocus?: (fileNodeId: string, fileLabel: string) => void;
  onNodeSelect?: (nodeId: string) => void;
};

type ModuleLayout = {
  childNodes: Node<FlowCodeGraphNodeData>[];
  height: number;
  width: number;
};

const nodeTypes = { codeGraph: CodeGraphNode, fileModule: FileModuleNode };
const emptyMatchedNodeIds = new Set<string>();
const entityNodeWidth = 190;
const entityNodeHeight = 76;
const moduleMinWidth = 280;
const moduleEmptyHeight = 96;
const moduleHeaderHeight = 56;
const modulePadding = 28;

function createDagreGraph(rankdir: "LR" | "TB", options: Record<string, number>) {
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir, ...options });
  graph.setDefaultEdgeLabel(() => ({}));
  return graph;
}

function layoutStandaloneNodes(inputNodes: CodeGraphNodeRecord[], inputEdges: CodeGraphEdge[], xOffset = 0): Node<FlowCodeGraphNodeData>[] {
  const graph = createDagreGraph("TB", { nodesep: 80, ranksep: 120, marginx: 24, marginy: 24 });
  const nodeIds = new Set(inputNodes.map((node) => node.id));
  inputNodes.slice().sort((left, right) => left.id.localeCompare(right.id)).forEach((node) => graph.setNode(node.id, { width: entityNodeWidth, height: entityNodeHeight }));
  inputEdges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)).forEach((edge) => graph.setEdge(edge.source, edge.target));
  dagre.layout(graph);

  return inputNodes.map((node, index) => {
    const position = graph.node(node.id) as { x: number; y: number } | undefined;
    return {
      id: node.id,
      type: "codeGraph",
      position: {
        x: xOffset + (position?.x ?? (index % 4) * 240) - entityNodeWidth / 2,
        y: (position?.y ?? Math.floor(index / 4) * 140) - entityNodeHeight / 2,
      },
      style: { width: entityNodeWidth, height: entityNodeHeight },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      data: { label: node.label, nodeType: node.type, focused: false, matched: false, dimmed: false },
    };
  });
}

function layoutModuleChildren(fileId: string, entities: CodeGraphNodeRecord[], edges: CodeGraphEdge[]): ModuleLayout {
  if (!entities.length) return { childNodes: [], width: moduleMinWidth, height: moduleEmptyHeight };

  const graph = createDagreGraph("TB", { nodesep: 22, ranksep: 46, marginx: 0, marginy: 0 });
  const entityIds = new Set(entities.map((entity) => entity.id));
  entities.forEach((entity) => graph.setNode(entity.id, { width: entityNodeWidth, height: entityNodeHeight }));
  edges
    .filter((edge) => edge.type === "CALLS" && entityIds.has(edge.source) && entityIds.has(edge.target))
    .forEach((edge) => graph.setEdge(edge.source, edge.target));
  dagre.layout(graph);

  const bounds = graph.graph() as { width?: number; height?: number };
  const contentWidth = Math.max(entityNodeWidth, bounds.width ?? entityNodeWidth);
  const contentHeight = Math.max(entityNodeHeight, bounds.height ?? entityNodeHeight);
  const width = Math.max(moduleMinWidth, contentWidth + modulePadding * 2);
  const height = moduleHeaderHeight + contentHeight + modulePadding * 2;
  const childNodes = entities.map((entity, index) => {
    const position = graph.node(entity.id) as { x: number; y: number } | undefined;
    return {
      id: entity.id,
      type: "codeGraph",
      parentId: fileId,
      extent: "parent" as const,
      position: {
        x: (position?.x ?? contentWidth / 2) - entityNodeWidth / 2 + (width - contentWidth) / 2,
        y: moduleHeaderHeight + modulePadding + (position?.y ?? index * (entityNodeHeight + 30) + entityNodeHeight / 2) - entityNodeHeight / 2,
      },
      style: { width: entityNodeWidth, height: entityNodeHeight },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      data: { label: entity.label, nodeType: entity.type, focused: false, matched: false, dimmed: false, withinModule: true },
    };
  });
  return { childNodes, width, height };
}

function layoutFocusedGraph(inputNodes: CodeGraphNodeRecord[] = [], inputEdges: CodeGraphEdge[] = []): Node<FlowCodeGraphNodeData>[] {
  const nodesById = new Map(inputNodes.map((node) => [node.id, node]));
  const files = inputNodes.filter((node) => node.type === "file");
  if (!files.length) return layoutStandaloneNodes(inputNodes, inputEdges);

  const ownerByEntity = new Map<string, string>();
  inputEdges.forEach((edge) => {
    if (edge.type === "DECLARES" && nodesById.get(edge.source)?.type === "file" && nodesById.get(edge.target)?.type !== "file") ownerByEntity.set(edge.target, edge.source);
  });
  const entitiesByFile = new Map(files.map((file) => [file.id, [] as CodeGraphNodeRecord[]]));
  inputNodes.filter((node) => node.type !== "file").forEach((entity) => {
    const ownerId = ownerByEntity.get(entity.id);
    if (ownerId) entitiesByFile.get(ownerId)?.push(entity);
  });

  const modules = new Map<string, ModuleLayout>();
  files.forEach((file) => modules.set(file.id, layoutModuleChildren(file.id, entitiesByFile.get(file.id) ?? [], inputEdges)));
  const fileGraph = createDagreGraph("TB", { nodesep: 80, ranksep: 120, marginx: 36, marginy: 36 });
  files.forEach((file) => {
    const moduleLayout = modules.get(file.id)!;
    fileGraph.setNode(file.id, { width: moduleLayout.width, height: moduleLayout.height });
  });
  const laidOutFileEdges = new Set<string>();
  const moduleEndpoint = (nodeId: string) => nodesById.get(nodeId)?.type === "file" ? nodeId : ownerByEntity.get(nodeId);
  inputEdges.forEach((edge) => {
    const source = moduleEndpoint(edge.source);
    const target = moduleEndpoint(edge.target);
    if (!source || !target || source === target) return;
    const key = `${source}:${target}`;
    if (!laidOutFileEdges.has(key)) {
      laidOutFileEdges.add(key);
      fileGraph.setEdge(source, target);
    }
  });
  dagre.layout(fileGraph);

  const moduleNodes: Node<FlowCodeGraphNodeData>[] = [];
  const childNodes: Node<FlowCodeGraphNodeData>[] = [];
  files.forEach((file, index) => {
    const moduleLayout = modules.get(file.id)!;
    const position = fileGraph.node(file.id) as { x: number; y: number } | undefined;
    moduleNodes.push({
      id: file.id,
      type: "fileModule",
      position: { x: (position?.x ?? index * (moduleLayout.width + 120)) - moduleLayout.width / 2, y: (position?.y ?? 0) - moduleLayout.height / 2 },
      style: { width: moduleLayout.width, height: moduleLayout.height },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      data: { label: file.label, nodeType: "file", focused: false, matched: false, dimmed: false, entityCount: moduleLayout.childNodes.length },
    });
    childNodes.push(...moduleLayout.childNodes);
  });

  const groupedEntityIds = new Set(ownerByEntity.keys());
  const ungroupedNodes = inputNodes.filter((node) => node.type !== "file" && !groupedEntityIds.has(node.id));
  const groupBounds = fileGraph.graph() as { width?: number };
  return [...moduleNodes, ...childNodes, ...layoutStandaloneNodes(ungroupedNodes, inputEdges, (groupBounds.width ?? 0) + 180)];
}

function flowEdges(edges: CodeGraphEdge[] = [], matchedNodeIds: Set<string> = emptyMatchedNodeIds, isSearching = false, focusedNodeId: string | null = null): Edge[] {
  return edges.map((edge, index) => {
    const connectedToFocus = focusedNodeId !== null && (edge.source === focusedNodeId || edge.target === focusedNodeId);
    const dimmedByFocus = focusedNodeId !== null && !connectedToFocus;
    const relatedToMatch = !isSearching || matchedNodeIds.has(edge.source) || matchedNodeIds.has(edge.target);
    const visible = !dimmedByFocus && relatedToMatch;
    const relationshipColor = edge.type === "CALLS" ? "#22c55e" : edge.type === "DECLARES" ? "#60a5fa" : "#a78bfa";
    return { id: edge.id || `${edge.source}-${edge.target}-${edge.type}-${index}`, source: edge.source, target: edge.target, type: "smoothstep", label: edge.type, animated: edge.type === "CALLS", labelStyle: { fill: connectedToFocus ? "#f8fafc" : relationshipColor, fontSize: 10, fontWeight: 700, opacity: visible ? 1 : 0.2 }, labelBgStyle: { fill: "#0f172a", fillOpacity: visible ? 0.9 : 0.35 }, labelBgPadding: [4, 2], style: { stroke: connectedToFocus ? "#22d3ee" : visible ? relationshipColor : "#334155", strokeWidth: connectedToFocus ? 2.5 : visible ? 1.45 : 1, opacity: visible ? 1 : 0.2 } };
  });
}

export function GraphCanvas({ edges: inputEdges = [], fitViewRequest = 0, focusNodeId = null, graphKey = "initial", isSearching = false, matchedNodeIds = emptyMatchedNodeIds, nodes: inputNodes = [], onFileFocus, onNodeSelect }: GraphCanvasProps) {
  const instance = useRef<ReactFlowInstance<Node<FlowCodeGraphNodeData>, Edge> | null>(null);
  const layoutedNodes = useMemo(() => layoutFocusedGraph(inputNodes, inputEdges), [inputEdges, inputNodes]);
  const connectedNodeIds = useMemo(() => !focusNodeId ? null : new Set([focusNodeId, ...inputEdges.flatMap((edge) => edge.source === focusNodeId ? [edge.target] : edge.target === focusNodeId ? [edge.source] : [])]), [focusNodeId, inputEdges]);
  const initialNodes = useMemo(() => layoutedNodes.map((node) => ({ ...node, data: { ...node.data, focused: node.id === focusNodeId, matched: matchedNodeIds.has(node.id), dimmed: connectedNodeIds !== null && !connectedNodeIds.has(node.id) } })), [connectedNodeIds, focusNodeId, layoutedNodes, matchedNodeIds]);
  const initialEdges = useMemo(() => flowEdges(inputEdges, matchedNodeIds, isSearching, focusNodeId), [focusNodeId, inputEdges, isSearching, matchedNodeIds]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => { setNodes([...initialNodes]); }, [graphKey, initialNodes, setNodes]);
  useEffect(() => { setEdges([...initialEdges]); }, [graphKey, initialEdges, setEdges]);
  useEffect(() => { if (fitViewRequest) requestAnimationFrame(() => instance.current?.fitView({ padding: 0.16, duration: 350 })); }, [fitViewRequest]);
  useEffect(() => {
    const focusedNode = focusNodeId ? nodes.find((node) => node.id === focusNodeId) : null;
    if (focusedNode) {
      const width = typeof focusedNode.style?.width === "number" ? focusedNode.style.width : entityNodeWidth;
      const height = typeof focusedNode.style?.height === "number" ? focusedNode.style.height : entityNodeHeight;
      instance.current?.setCenter(focusedNode.position.x + width / 2, focusedNode.position.y + height / 2, { duration: 350, zoom: 1.1 });
    }
  }, [focusNodeId, nodes]);

  const onInit: OnInit<Node<FlowCodeGraphNodeData>, Edge> = (reactFlowInstance) => { instance.current = reactFlowInstance; requestAnimationFrame(() => reactFlowInstance.fitView({ padding: 0.16, maxZoom: 1.2 })); };
  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node<FlowCodeGraphNodeData>) => {
    if (node.data.nodeType === "file") onFileFocus?.(node.id, node.data.label);
    onNodeSelect?.(node.id);
  }, [onFileFocus, onNodeSelect]);

  return <div className="h-[min(68vh,760px)] min-h-[34rem] overflow-hidden rounded-xl border border-slate-800 bg-slate-950"><ReactFlow key={graphKey} nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onInit={onInit} onNodeClick={handleNodeClick} fitView nodesDraggable panOnDrag panOnScroll zoomOnScroll zoomOnPinch minZoom={0.2} maxZoom={2.5} proOptions={{ hideAttribution: true }}><Background variant={BackgroundVariant.Lines} gap={20} size={1} color="#334155" /><Controls className="!rounded-lg !border-slate-700 !bg-slate-900 [&>button]:!border-slate-700 [&>button]:!bg-slate-900 [&>button]:!fill-slate-300 hover:[&>button]:!bg-slate-800" showInteractive={false} /><MiniMap pannable zoomable nodeColor={(node) => { const type = (node.data as FlowCodeGraphNodeData).nodeType; return type === "class" ? "#a78bfa" : type === "function" ? "#34d399" : type === "variable" ? "#fbbf24" : "#22d3ee"; }} maskColor="rgba(2, 6, 23, 0.78)" className="!rounded-lg !border !border-slate-700 !bg-slate-900" /></ReactFlow></div>;
}
