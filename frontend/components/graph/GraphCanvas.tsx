"use client";

import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type OnInit,
  type ReactFlowInstance,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Maximize,
  Minus,
  Plus,
  RefreshCw,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  CodeGraphNode,
  FileModuleNode,
  type FlowCodeGraphNodeData,
} from "@/components/graph/CodeGraphNode";
import { computeHierarchicalLayout, NODE_HEIGHT, NODE_WIDTH } from "@/lib/graphLayout";
import type { CodeGraphEdge, CodeGraphNode as CodeGraphNodeRecord } from "@/types/graph";

type GraphCanvasProps = {
  edges?: CodeGraphEdge[];
  fitViewRequest?: number;
  focusNodeId?: string | null;
  graphKey?: string;
  isSearching?: boolean;
  matchedNodeIds?: Set<string>;
  nodes?: CodeGraphNodeRecord[];
  onNodeSelect?: (nodeId: string) => void;
  onPaneClick?: () => void;
  depth?: number;
  isLoading?: boolean;
  connectedNodeIds?: Set<string>;
  highlightedNodeIds?: Set<string> | null;
  isFocused?: boolean;
  expandedNodeIds?: Set<string>;
  onToggleExpand?: (nodeId: string) => void;
};

const nodeTypes = { codeGraph: CodeGraphNode, fileModule: FileModuleNode };
const emptyMatchedNodeIds = new Set<string>();

const relationshipColors: Record<string, string> = {
  CALLS: "#00e5ff",
  IMPORTS: "#a78bfa",
  DECLARES: "#6366f1",
  EXTENDS: "#34d399",
  HAS_METHOD: "#34d399",
  HANDLES: "#fb7185",
  CONTAINS: "#64748b",
};

function determineHandles(
  edgeType: string,
  sourceId: string,
  targetId: string,
  layoutMap?: Map<string, Node<FlowCodeGraphNodeData>>
) {
  const sourceNode = layoutMap?.get(sourceId);
  const targetNode = layoutMap?.get(targetId);

  if (sourceNode && targetNode) {
    const sy = sourceNode.position.y;
    const ty = targetNode.position.y;
    const sx = sourceNode.position.x;
    const tx = targetNode.position.x;

    // Downward vertical hierarchy (source is above target)
    if (sy < ty - 25) {
      return { sourceHandle: "bottom", targetHandle: "top" };
    }
    // Upward vertical hierarchy (target is above source)
    if (sy > ty + 25) {
      return { sourceHandle: "top-source", targetHandle: "bottom-target" };
    }
    // Same vertical tier (e.g. cross-file imports)
    if (sx < tx) {
      return { sourceHandle: "right", targetHandle: "left" };
    }
    return { sourceHandle: "left-source", targetHandle: "right-target" };
  }

  if (edgeType === "IMPORTS") {
    return { sourceHandle: "right", targetHandle: "left" };
  }
  return { sourceHandle: "bottom", targetHandle: "top" };
}

function flowEdges(
  edges: CodeGraphEdge[] = [],
  matchedNodeIds: Set<string> = emptyMatchedNodeIds,
  isSearching = false,
  focusedNodeId: string | null = null,
  layoutMap?: Map<string, Node<FlowCodeGraphNodeData>>
): Edge[] {
  // Only show default edge labels when graph is small (<= 25 edges)
  const showLabels = edges.length <= 25;

  return edges.map((edge, index) => {
    const isDirectlyConnected =
      focusedNodeId !== null &&
      (edge.source === focusedNodeId || edge.target === focusedNodeId);

    const isDimmed = focusedNodeId !== null && !isDirectlyConnected;

    const relatedToMatch =
      !isSearching || matchedNodeIds.has(edge.source) || matchedNodeIds.has(edge.target);

    const baseColor = relationshipColors[edge.type] ?? "#64748b";
    const { sourceHandle, targetHandle } = determineHandles(
      edge.type,
      edge.source,
      edge.target,
      layoutMap
    );

    return {
      id: edge.id || `${edge.source}-${edge.target}-${edge.type}-${index}`,
      source: edge.source,
      target: edge.target,
      sourceHandle,
      targetHandle,
      type: "default", // Clean cubic Bezier curve matching Figma
      label:
        isDirectlyConnected || (focusedNodeId === null && showLabels && relatedToMatch)
          ? edge.type === "HAS_METHOD"
            ? "HAS METHOD"
            : edge.type
          : undefined,
      animated: isDirectlyConnected,
      zIndex: isDirectlyConnected ? 20 : isDimmed ? 1 : 5,
      labelStyle: {
        fill: isDirectlyConnected ? baseColor : "#8a96a8",
        fontSize: 8.5,
        fontFamily: "var(--font-geist-mono), 'JetBrains Mono', monospace",
        fontWeight: 600,
        opacity: isDimmed ? 0.12 : 1,
      },
      labelBgStyle: {
        fill: "#080b12",
        fillOpacity: isDimmed ? 0.15 : 0.95,
        rx: 3,
        ry: 3,
      },
      labelBgPadding: [4, 2],
      style: {
        stroke: isDirectlyConnected ? baseColor : isDimmed ? "#334155" : baseColor,
        strokeWidth: isDirectlyConnected ? 2.4 : isDimmed ? 0.8 : 1.2,
        opacity: isDirectlyConnected ? 1 : isDimmed ? 0.12 : 0.65,
        filter: isDirectlyConnected ? `drop-shadow(0 0 6px ${baseColor}99)` : undefined,
      },
    };
  });
}

function ViewportTracker({
  onZoomChange,
}: {
  onZoomChange: (zoom: number) => void;
}) {
  const { getZoom } = useReactFlow();

  useEffect(() => {
    const interval = setInterval(() => {
      onZoomChange(getZoom());
    }, 250);
    return () => clearInterval(interval);
  }, [getZoom, onZoomChange]);

  return null;
}

export function GraphCanvas({
  edges: inputEdges = [],
  fitViewRequest = 0,
  focusNodeId = null,
  graphKey = "initial",
  isSearching = false,
  matchedNodeIds = emptyMatchedNodeIds,
  nodes: inputNodes = [],
  onNodeSelect,
  onPaneClick,
  depth = 1,
  isLoading = false,
  connectedNodeIds,
  isFocused = false,
  expandedNodeIds = new Set(),
  onToggleExpand,
}: GraphCanvasProps) {
  const instance = useRef<ReactFlowInstance<Node<FlowCodeGraphNodeData>, Edge> | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(0.85);

  const nodesById = useMemo(
    () => new Map(inputNodes.map((node) => [node.id, node])),
    [inputNodes]
  );

  // Compute hierarchical layout with expansion and focus awareness
  const layoutedNodes = useMemo(
    () =>
      computeHierarchicalLayout(
        inputNodes,
        inputEdges,
        nodesById,
        focusNodeId,
        isFocused,
        expandedNodeIds,
        onToggleExpand
      ),
    [expandedNodeIds, focusNodeId, inputEdges, inputNodes, isFocused, nodesById, onToggleExpand]
  );

  const layoutedNodesMap = useMemo(
    () => new Map(layoutedNodes.map((n) => [n.id, n])),
    [layoutedNodes]
  );

  const initialNodes = useMemo(
    () =>
      layoutedNodes.map((node) => {
        const isNodeSelected = focusNodeId !== null && node.id === focusNodeId;
        const isConnected = focusNodeId !== null && Boolean(connectedNodeIds?.has(node.id));
        const isDimmed = focusNodeId !== null && !isNodeSelected && !isConnected;

        return {
          ...node,
          data: {
            ...node.data,
            focused: isNodeSelected,
            selected: isNodeSelected,
            connected: isConnected,
            matched: matchedNodeIds.has(node.id),
            dimmed: isDimmed,
          },
        };
      }),
    [connectedNodeIds, focusNodeId, layoutedNodes, matchedNodeIds]
  );

  const initialEdges = useMemo(
    () =>
      flowEdges(
        inputEdges,
        matchedNodeIds,
        isSearching,
        focusNodeId,
        layoutedNodesMap
      ),
    [focusNodeId, inputEdges, isSearching, layoutedNodesMap, matchedNodeIds]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FlowCodeGraphNodeData>>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes([...initialNodes]);
  }, [graphKey, initialNodes, setNodes]);

  useEffect(() => {
    setEdges([...initialEdges]);
  }, [graphKey, initialEdges, setEdges]);

  // Handle fitView requests smoothly
  useEffect(() => {
    if (fitViewRequest) {
      requestAnimationFrame(() =>
        instance.current?.fitView({
          padding: 0.22,
          duration: 350,
          maxZoom: 1.15,
          minZoom: 0.45,
        })
      );
    }
  }, [fitViewRequest]);

  useEffect(() => {
    const onResize = () =>
      requestAnimationFrame(() =>
        instance.current?.fitView({
          padding: 0.22,
          duration: 200,
          maxZoom: 1.15,
          minZoom: 0.45,
        })
      );
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Smoothly center on focused node when focusNodeId changes
  useEffect(() => {
    const focusedNode = focusNodeId ? nodes.find((node) => node.id === focusNodeId) : null;
    if (focusedNode && instance.current) {
      instance.current.setCenter(
        focusedNode.position.x + NODE_WIDTH / 2,
        focusedNode.position.y + NODE_HEIGHT / 2,
        { duration: 350, zoom: 1.05 }
      );
    }
  }, [focusNodeId, nodes]);

  const onInit: OnInit<Node<FlowCodeGraphNodeData>, Edge> = (reactFlowInstance) => {
    instance.current = reactFlowInstance;
    setZoomLevel(reactFlowInstance.getZoom());
    requestAnimationFrame(() =>
      reactFlowInstance.fitView({
        padding: 0.22,
        maxZoom: 1.1,
        minZoom: 0.5,
      })
    );
  };

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node<FlowCodeGraphNodeData>) => {
      onNodeSelect?.(node.id);
    },
    [onNodeSelect],
  );

  const handleZoomIn = () => {
    instance.current?.zoomIn({ duration: 250 });
  };

  const handleZoomOut = () => {
    instance.current?.zoomOut({ duration: 250 });
  };

  const handleFitView = () => {
    instance.current?.fitView({ padding: 0.22, duration: 350 });
  };

  return (
    <div className="relative h-full w-full overflow-hidden graph-canvas select-none">
      <ReactFlow
        key={graphKey}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={onInit}
        onNodeClick={handleNodeClick}
        onPaneClick={onPaneClick}
        fitView
        nodesDraggable
        panOnDrag
        panOnScroll
        zoomOnScroll
        zoomOnPinch
        minZoom={0.15}
        maxZoom={2.5}
        onlyRenderVisibleElements
        proOptions={{ hideAttribution: true }}
      >
        <ViewportTracker onZoomChange={setZoomLevel} />
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="rgba(125, 211, 252, 0.12)"
        />

        {/* Custom Zoom Controls matching Figma design */}
        <div className="absolute left-3 bottom-3 z-20 flex flex-col rounded-lg border border-white/[0.09] bg-[#090c14]/90 backdrop-blur-lg overflow-hidden shadow-xl">
          <button
            type="button"
            onClick={handleZoomIn}
            className="graph-zoom"
            aria-label="Zoom in"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="graph-zoom border-t border-white/[0.07]"
            aria-label="Zoom out"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleFitView}
            className="graph-zoom border-t border-white/[0.07]"
            aria-label="Fit graph"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bottom Zoom & Node summary label */}
        <div className="absolute left-16 bottom-3 z-20 font-mono text-[9.5px] text-muted-foreground pointer-events-none hidden sm:block">
          {Math.round(zoomLevel * 100)}% · depth {depth} · {inputNodes.length} nodes
        </div>

        {/* MiniMap matching Figma design */}
        <MiniMap
          pannable
          zoomable
          nodeColor={(node) => {
            const type = (node.data as unknown as FlowCodeGraphNodeData)?.nodeType;
            return type === "project"
              ? "#00e5ff"
              : type === "module"
                ? "#7dd3fc"
                : type === "class"
                  ? "#a78bfa"
                  : type === "function"
                    ? "#22d3ee"
                    : type === "method"
                      ? "#34d399"
                      : type === "variable"
                        ? "#fbbf24"
                        : type === "api_route"
                          ? "#fb7185"
                          : "#60a5fa";
          }}
          maskColor="rgba(8, 11, 18, 0.85)"
          className="!bottom-3 !right-3 !top-auto !h-20 !w-32 !rounded-lg !border !border-white/[0.09] !bg-[#080b12]/90 !shadow-xl !backdrop-blur-lg"
        />
      </ReactFlow>

      {/* Loading overlay with spinner */}
      {isLoading && (
        <div className="absolute inset-0 z-30 bg-[#04060b]/70 backdrop-blur-[2px] flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-6 h-6 text-primary animate-spin mx-auto" />
            <p className="mt-3 font-mono text-[11px] text-muted-foreground">
              rebuilding graph neighborhood…
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
