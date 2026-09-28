"use client";

import dagre from "dagre";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
  type ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AstNodeData } from "@/types/workspace";

import { ASTFlowNode, type ASTFlowNodeData } from "./ASTFlowNode";

type ASTTreeProps = {
  ast: AstNodeData;
  searchTerm: string;
  sourceText: string | null;
  projectId?: number | null;
  fileId?: number | null;
  filePath?: string | null;
  selectedNode?: AstNodeData | null;
  selectedNodeId?: string;
  onSelectNode?: (node: AstNodeData, id: string) => void;
};

const nodeTypes = { astCard: ASTFlowNode };
const NODE_WIDTH = 200;
const NODE_HEIGHT = 76;

export interface AstNodeDisplayInfo {
  typeLabel: string;
  name: string;
  metadata: string;
  rawType: string;
}

export function getAstNodeDisplayInfo(
  node: AstNodeData,
  sourceText: string | null,
  fileName?: string
): AstNodeDisplayInfo {
  const rawType = node.type;
  const startLine = node.start_point.row + 1;
  const endLine = node.end_point.row + 1;
  const startCol = node.start_point.column;
  const endCol = node.end_point.column;

  let snippet = "";
  if (sourceText) {
    const lines = sourceText.split("\n");
    if (node.start_point.row === node.end_point.row) {
      snippet = lines[node.start_point.row]?.slice(startCol, endCol)?.trim() ?? "";
    } else {
      snippet = lines[node.start_point.row]?.slice(startCol)?.trim() ?? "";
    }
  }

  // 1. MODULE
  if (rawType === "module" || rawType === "translation_unit" || rawType === "program" || rawType === "file") {
    const lineCount = sourceText ? sourceText.split("\n").length : endLine - startLine + 1;
    return {
      typeLabel: "MODULE",
      name: fileName ?? "Module",
      metadata: `${lineCount} lines`,
      rawType,
    };
  }

  const findIdentifierChild = (n: AstNodeData): string | null => {
    const idChild = n.children.find(
      (c) =>
        c.type === "identifier" ||
        c.type === "type_identifier" ||
        c.type === "name" ||
        c.type === "property_identifier"
    );
    if (idChild && sourceText) {
      const line = sourceText.split("\n")[idChild.start_point.row];
      return line?.slice(idChild.start_point.column, idChild.end_point.column)?.trim() ?? null;
    }
    return null;
  };

  // 2. FUNCTION DEFINITION
  if (
    rawType === "function_definition" ||
    rawType === "function_declarator" ||
    rawType === "method_definition" ||
    rawType === "function_declaration"
  ) {
    const funcName =
      findIdentifierChild(node) ??
      (snippet.length > 0 && !snippet.includes("\n")
        ? snippet.split("(")[0]?.replace(/^def\s+/, "")?.replace(/^function\s+/, "")?.trim()
        : null);
    const lineRange = startLine === endLine ? `Line ${startLine}` : `Lines ${startLine}-${endLine}`;
    return {
      typeLabel: "FUNCTION",
      name: funcName ? `${funcName}()` : "function",
      metadata: lineRange,
      rawType,
    };
  }

  // 3. CLASS DEFINITION
  if (rawType === "class_definition" || rawType === "class_declaration" || rawType === "struct_specifier") {
    const className = findIdentifierChild(node);
    const lineRange = startLine === endLine ? `Line ${startLine}` : `Lines ${startLine}-${endLine}`;
    return {
      typeLabel: "CLASS",
      name: className ?? "Class",
      metadata: lineRange,
      rawType,
    };
  }

  // 4. IMPORT STATEMENT
  if (rawType === "import_statement" || rawType === "import_from_statement" || rawType === "import_declaration") {
    const importName = snippet.replace(/^import\s+/, "")?.replace(/^from\s+/, "")?.trim() || snippet;
    return {
      typeLabel: "IMPORT",
      name: importName.length > 22 ? `${importName.slice(0, 20)}…` : importName || "import",
      metadata: `Line ${startLine}`,
      rawType,
    };
  }

  // 5. IDENTIFIER
  if (rawType === "identifier" || rawType === "type_identifier" || rawType === "field_identifier") {
    return {
      typeLabel: "IDENTIFIER",
      name: snippet || rawType,
      metadata: `L${startLine}:${startCol + 1}`,
      rawType,
    };
  }

  // 6. PARAMETERS
  if (rawType === "parameters" || rawType === "formal_parameters" || rawType === "parameter_list") {
    const count = node.children.filter((c) => c.is_named).length || node.children.length;
    return {
      typeLabel: "PARAMETERS",
      name: `${count} parameter${count === 1 ? "" : "s"}`,
      metadata: `Line ${startLine}`,
      rawType,
    };
  }

  // 7. BLOCK
  if (rawType === "block" || rawType === "compound_statement") {
    const count = node.children.filter((c) => c.is_named).length;
    const lineRange = startLine === endLine ? `Line ${startLine}` : `Lines ${startLine}-${endLine}`;
    return {
      typeLabel: "BLOCK",
      name: `${count} statement${count === 1 ? "" : "s"}`,
      metadata: lineRange,
      rawType,
    };
  }

  // 8. COMMENT
  if (rawType === "comment") {
    const commentText = snippet.length > 20 ? `${snippet.slice(0, 18)}…` : snippet;
    return {
      typeLabel: "COMMENT",
      name: commentText || "# comment",
      metadata: `Line ${startLine}`,
      rawType,
    };
  }

  // 9. RETURN STATEMENT
  if (rawType === "return_statement") {
    return {
      typeLabel: "RETURN",
      name: snippet.length > 22 ? `${snippet.slice(0, 20)}…` : snippet || "return",
      metadata: `Line ${startLine}`,
      rawType,
    };
  }

  // FALLBACK
  const cleanType = rawType.replace(/_statement|_definition|_expression|_declaration/g, "").toUpperCase();
  const nameText = snippet && snippet.length <= 22 && !snippet.includes("\n") ? snippet : cleanType;
  const lineInfo = startLine === endLine ? `Line ${startLine}` : `L${startLine}-${endLine}`;

  return {
    typeLabel: cleanType.length > 14 ? cleanType.slice(0, 12) + "…" : cleanType,
    name: nameText,
    metadata: lineInfo,
    rawType,
  };
}

function expandedFirstLevel(node: AstNodeData, nodeId = "0", depth = 0): Set<string> {
  const expanded = new Set<string>();
  if (depth === 0 && node.children.length) {
    expanded.add(nodeId);
  }
  return expanded;
}

function expandNextLevel(
  node: AstNodeData,
  currentExpanded: Set<string>,
  nodeId = "0"
): Set<string> {
  const next = new Set(currentExpanded);
  if (currentExpanded.has(nodeId)) {
    node.children.forEach((child, index) => {
      const childId = `${nodeId}.${index}`;
      if (child.children.length > 0) {
        next.add(childId);
      }
    });
  } else if (node.children.length > 0) {
    next.add(nodeId);
  }
  return next;
}

function searchMatches(
  node: AstNodeData,
  searchTerm: string,
  sourceText: string | null,
  nodeId = "0",
  ancestors: string[] = []
): { matches: number; expanded: Set<string> } {
  const expanded = new Set<string>();
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const info = getAstNodeDisplayInfo(node, sourceText);
  const matches =
    normalizedSearch &&
    `${info.typeLabel} ${info.name} ${info.rawType}`.toLowerCase().includes(normalizedSearch)
      ? 1
      : 0;
  if (matches) ancestors.forEach((ancestor) => expanded.add(ancestor));

  return node.children.reduce(
    (result, child, index) => {
      const childResult = searchMatches(child, searchTerm, sourceText, `${nodeId}.${index}`, [
        ...ancestors,
        nodeId,
      ]);
      childResult.expanded.forEach((id) => result.expanded.add(id));
      return { matches: result.matches + childResult.matches, expanded: result.expanded };
    },
    { matches, expanded }
  );
}

export function getAstMetrics(ast: AstNodeData): { nodeCount: number; maximumDepth: number } {
  return ast.children.reduce(
    (metrics, child) => {
      const childMetrics = getAstMetrics(child);
      return {
        nodeCount: metrics.nodeCount + childMetrics.nodeCount,
        maximumDepth: Math.max(metrics.maximumDepth, childMetrics.maximumDepth + 1),
      };
    },
    { nodeCount: 1, maximumDepth: 1 }
  );
}

export function getAstSearchMatchCount(
  ast: AstNodeData,
  searchTerm: string,
  sourceText: string | null
): number {
  return searchMatches(ast, searchTerm, sourceText).matches;
}

export function ASTTree({
  ast,
  searchTerm,
  sourceText,
  filePath,
  selectedNodeId: propSelectedNodeId,
  onSelectNode: propOnSelectNode,
}: ASTTreeProps) {
  const instanceRef = useRef<ReactFlowInstance<Node<ASTFlowNodeData>, Edge> | null>(null);

  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(() =>
    expandedFirstLevel(ast)
  );
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Fallback internal selection state if props not provided
  const [internalSelectedNodeId, setInternalSelectedNodeId] = useState("0");
  const selectedNodeId = propSelectedNodeId ?? internalSelectedNodeId;

  const handleSelectNode = useCallback(
    (node: AstNodeData, id: string) => {
      setInternalSelectedNodeId(id);
      propOnSelectNode?.(node, id);
    },
    [propOnSelectNode]
  );

  const searchResult = useMemo(
    () => searchMatches(ast, searchTerm, sourceText),
    [ast, searchTerm, sourceText]
  );

  useEffect(() => {
    setExpandedNodeIds(expandedFirstLevel(ast));
  }, [ast]);

  useEffect(() => {
    if (searchTerm.trim()) {
      setExpandedNodeIds((current) => new Set([...current, ...searchResult.expanded]));
    }
  }, [searchResult.expanded, searchTerm]);

  // Handle Toggle Expand
  const handleToggleExpand = useCallback((id: string) => {
    setExpandedNodeIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Compute Dagre Layout & Flow Nodes/Edges
  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    const nodes: Node<ASTFlowNodeData>[] = [];
    const edges: Edge[] = [];

    function traverse(node: AstNodeData, nodeId: string) {
      const displayInfo = getAstNodeDisplayInfo(
        node,
        sourceText,
        filePath ? filePath.split("/").pop() : undefined
      );
      const hasChildren = node.children.length > 0;
      const isExpanded = expandedNodeIds.has(nodeId);
      const isSelected = selectedNodeId === nodeId;
      const isMatch =
        searchTerm.trim().length > 0 &&
        `${displayInfo.typeLabel} ${displayInfo.name} ${displayInfo.rawType}`
          .toLowerCase()
          .includes(searchTerm.trim().toLowerCase());
      const isHovered = hoveredNodeId === nodeId;

      nodes.push({
        id: nodeId,
        type: "astCard",
        position: { x: 0, y: 0 },
        data: {
          id: nodeId,
          typeLabel: displayInfo.typeLabel,
          name: displayInfo.name,
          metadata: displayInfo.metadata,
          rawType: displayInfo.rawType,
          isExpanded,
          hasChildren,
          childCount: node.children.length,
          isSelected,
          isMatch,
          isHovered,
          onSelect: () => handleSelectNode(node, nodeId),
          onToggleExpand: () => handleToggleExpand(nodeId),
          onHover: setHoveredNodeId,
        },
      });

      if (hasChildren && isExpanded) {
        node.children.forEach((child, index) => {
          const childId = `${nodeId}.${index}`;
          const isEdgeConnectedToHover =
            hoveredNodeId !== null && (hoveredNodeId === nodeId || hoveredNodeId === childId);

          edges.push({
            id: `e-${nodeId}-${childId}`,
            source: nodeId,
            target: childId,
            type: "smoothstep",
            style: {
              stroke: isEdgeConnectedToHover
                ? "rgba(255, 255, 255, 0.50)"
                : "rgba(255, 255, 255, 0.20)",
              strokeWidth: isEdgeConnectedToHover ? 1.5 : 1,
            },
          });

          traverse(child, childId);
        });
      }
    }

    traverse(ast, "0");

    // Layout with Dagre
    const g = new dagre.graphlib.Graph();
    g.setGraph({
      rankdir: "TB",
      nodesep: 40,
      ranksep: 70,
      marginx: 40,
      marginy: 40,
    });
    g.setDefaultEdgeLabel(() => ({}));

    nodes.forEach((node) => g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
    edges.forEach((edge) => g.setEdge(edge.source, edge.target));

    dagre.layout(g);

    const laidOutNodes = nodes.map((node) => {
      const pos = g.node(node.id) as { x: number; y: number } | undefined;
      return {
        ...node,
        position: {
          x: (pos?.x ?? 0) - NODE_WIDTH / 2,
          y: (pos?.y ?? 0) - NODE_HEIGHT / 2,
        },
      };
    });

    return { nodes: laidOutNodes, edges };
  }, [
    ast,
    expandedNodeIds,
    selectedNodeId,
    hoveredNodeId,
    searchTerm,
    sourceText,
    filePath,
    handleSelectNode,
    handleToggleExpand,
  ]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  useEffect(() => {
    setNodes(flowNodes);
  }, [flowNodes, setNodes]);

  useEffect(() => {
    setEdges(flowEdges);
  }, [flowEdges, setEdges]);

  // Fit view with reasonable bounds so nodes are never microscopic
  const handleFitView = useCallback(() => {
    instanceRef.current?.fitView({ padding: 0.25, minZoom: 0.65, maxZoom: 1.5, duration: 300 });
  }, []);

  useEffect(() => {
    if (instanceRef.current) {
      requestAnimationFrame(() => {
        handleFitView();
      });
    }
  }, [ast, expandedNodeIds, handleFitView]);

  const handleExpandOneLevel = useCallback(() => {
    setExpandedNodeIds((curr) => expandNextLevel(ast, curr));
  }, [ast]);

  const handleCollapseAll = useCallback(() => {
    setExpandedNodeIds(new Set(["0"]));
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#050505] relative select-none">
      {/* Upper Right Canvas Controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-lg border border-[#242424] bg-[#080808]/90 px-2 py-1 backdrop-blur shadow-md font-mono text-[10px]">
        <button
          type="button"
          onClick={handleExpandOneLevel}
          className="rounded px-2 py-1 text-[#A3A3A3] hover:bg-[#151515] hover:text-white transition-colors"
          title="Expand next level of children"
        >
          Expand One Level
        </button>
        <span className="text-[#242424]">|</span>
        <button
          type="button"
          onClick={handleCollapseAll}
          className="rounded px-2 py-1 text-[#A3A3A3] hover:bg-[#151515] hover:text-white transition-colors"
          title="Collapse all except root"
        >
          Collapse All
        </button>
        <span className="text-[#242424]">|</span>
        <button
          type="button"
          onClick={handleFitView}
          className="rounded px-2 py-1 text-[#A3A3A3] hover:bg-[#151515] hover:text-white transition-colors"
          title="Fit view to current visible nodes"
        >
          Fit View
        </button>
      </div>

      {/* Main Visual Tree Canvas */}
      <div className="min-h-0 flex-1 w-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onInit={(flowInstance) => {
            instanceRef.current = flowInstance;
            requestAnimationFrame(() => {
              flowInstance.fitView({ padding: 0.25, minZoom: 0.65, maxZoom: 1.5 });
            });
          }}
          fitView
          panOnDrag
          zoomOnScroll
          zoomOnPinch
          minZoom={0.5}
          maxZoom={1.8}
          proOptions={{ hideAttribution: true }}
          className="bg-[#050505]"
        >
          {/* Subtle dot grid background */}
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#242424" />
          <Controls
            className="!bottom-4 !left-4 !top-auto !rounded-lg !border-[#242424] !bg-[#080808] [&>button]:!border-[#242424] [&>button]:!bg-[#080808] [&>button]:!fill-[#A3A3A3] hover:[&>button]:!bg-[#151515] hover:[&>button]:!fill-white"
            showInteractive={false}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
