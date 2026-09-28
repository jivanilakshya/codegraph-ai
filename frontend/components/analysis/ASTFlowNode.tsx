"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import {
  Box,
  Braces,
  Code2,
  FileCode,
  ListFilter,
  Package,
  Sliders,
  Type,
  Variable,
} from "lucide-react";
import React from "react";

export type ASTFlowNodeData = {
  id: string;
  typeLabel: string;
  name: string;
  metadata: string;
  rawType: string;
  isExpanded: boolean;
  hasChildren: boolean;
  childCount: number;
  isSelected: boolean;
  isMatch: boolean;
  isHovered: boolean;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onHover: (id: string | null) => void;
};

export type ASTFlowNodeRecord = Node<ASTFlowNodeData, "astCard">;

function getNodeIcon(typeLabel: string, rawType: string) {
  const upper = typeLabel.toUpperCase();
  if (upper === "MODULE" || rawType === "module" || rawType === "file") {
    return <FileCode className="size-3.5 shrink-0 text-[#A3A3A3]" />;
  }
  if (upper === "FUNCTION" || rawType.includes("function") || rawType.includes("method")) {
    return <Code2 className="size-3.5 shrink-0 text-[#A3A3A3]" />;
  }
  if (upper === "CLASS" || rawType.includes("class") || rawType.includes("struct")) {
    return <Box className="size-3.5 shrink-0 text-[#A3A3A3]" />;
  }
  if (upper === "IMPORT" || rawType.includes("import")) {
    return <Package className="size-3.5 shrink-0 text-[#A3A3A3]" />;
  }
  if (upper === "IDENTIFIER" || rawType.includes("identifier") || rawType.includes("name")) {
    return <Type className="size-3.5 shrink-0 text-[#A3A3A3]" />;
  }
  if (upper === "PARAMETERS" || rawType.includes("param")) {
    return <Sliders className="size-3.5 shrink-0 text-[#A3A3A3]" />;
  }
  if (upper === "BLOCK" || rawType.includes("block") || rawType.includes("compound")) {
    return <Braces className="size-3.5 shrink-0 text-[#A3A3A3]" />;
  }
  if (upper === "VARIABLE" || rawType.includes("var")) {
    return <Variable className="size-3.5 shrink-0 text-[#A3A3A3]" />;
  }
  return <ListFilter className="size-3.5 shrink-0 text-[#737373]" />;
}

export function ASTFlowNode({ data }: NodeProps<ASTFlowNodeRecord>) {
  const nodeData = data;

  const isSelected = nodeData.isSelected;
  const isMatch = nodeData.isMatch;
  const isHovered = nodeData.isHovered;
  const icon = getNodeIcon(nodeData.typeLabel, nodeData.rawType);

  const isRoot = nodeData.typeLabel === "MODULE" || nodeData.id === "0";

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        nodeData.onSelect(nodeData.id);
      }}
      onMouseEnter={() => nodeData.onHover(nodeData.id)}
      onMouseLeave={() => nodeData.onHover(null)}
      className={`
        group relative min-w-[190px] max-w-[240px] rounded-lg border font-mono select-none cursor-pointer p-3
        transition-all duration-180 ease-out
        ${
          isSelected
            ? "bg-[#151515] border-white text-white shadow-[0_0_20px_rgba(255,255,255,0.06),inset_0_0_15px_rgba(255,255,255,0.025)] -translate-y-0.5"
            : isMatch
            ? "bg-[#0D0D0D] border-white ring-1 ring-white/30 text-white shadow-[0_0_15px_rgba(255,255,255,0.04)]"
            : isHovered
            ? "bg-[#121212] border-[#555555] text-white shadow-[0_0_20px_rgba(255,255,255,0.04)] -translate-y-0.5"
            : isRoot
            ? "bg-[#080808] border-[#444444] text-[#E5E5E5] hover:border-[#666666]"
            : "bg-[#080808] border-[#292929] text-[#E5E5E5] hover:border-[#444444]"
        }
      `}
    >
      {/* Top Handle (Incoming parent connection) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-[#555555] !border-none !w-2 !h-2 !-top-1 opacity-80"
      />

      {/* Header: Icon + Type Badge + Expand/Collapse Arrow */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {icon}
          <span
            className={`text-[10px] font-bold uppercase tracking-[0.08em] truncate ${
              isSelected ? "text-white" : "text-[#737373]"
            }`}
          >
            {nodeData.typeLabel}
          </span>
        </div>

        {nodeData.hasChildren && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              nodeData.onToggleExpand(nodeData.id);
            }}
            className="inline-flex items-center gap-1 rounded border border-[#262626] bg-[#0F0F0F] px-1.5 py-0.5 text-[10px] font-mono text-[#A3A3A3] hover:border-[#555555] hover:bg-[#1A1A1A] hover:text-white transition-all shrink-0"
            title={nodeData.isExpanded ? "Collapse children" : "Expand children"}
          >
            <span>{nodeData.isExpanded ? "▼" : "▶"}</span>
            <span className="text-[9px] text-[#737373]">{nodeData.childCount}</span>
          </button>
        )}
      </div>

      {/* Main Node Title */}
      <div
        className="text-[14px] font-semibold truncate tracking-tight text-white mb-1 leading-snug"
        title={nodeData.name}
      >
        {nodeData.name}
      </div>

      {/* Node Metadata */}
      <div className="text-[11px] text-[#A3A3A3] truncate font-sans">
        {nodeData.metadata}
      </div>

      {/* Bottom Handle (Outgoing children connection) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-[#555555] !border-none !w-2 !h-2 !-bottom-1 opacity-80"
      />
    </div>
  );
}
