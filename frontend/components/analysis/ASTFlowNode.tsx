"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import {
  Braces,
  CircleDot,
  FunctionSquare,
  GitBranch,
  Layers3,
  Split,
  SquareCode,
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

const KIND_ICON: Record<string, React.ElementType> = {
  MODULE: Layers3,
  IMPORT: GitBranch,
  FUNCTION: FunctionSquare,
  IDENTIFIER: CircleDot,
  PARAMETERS: Split,
  BLOCK: SquareCode,
  STATEMENTS: Braces,
  CLASS: Variable,
};

function kindTone(kind: string): string {
  const upper = kind.toUpperCase();
  if (upper === "FUNCTION") return "text-[#00e5ff]";
  if (upper === "MODULE") return "text-sky-300";
  if (upper === "IMPORT") return "text-violet-300";
  return "text-[#9cabc0]";
}

export function ASTFlowNode({ data }: NodeProps<ASTFlowNodeRecord>) {
  const nodeData = data;
  const isSelected = nodeData.isSelected;
  const isMatch = nodeData.isMatch;
  const isHovered = nodeData.isHovered;

  const upperKind = nodeData.typeLabel.toUpperCase();
  const Icon = KIND_ICON[upperKind] ?? CircleDot;
  const toneClass = kindTone(upperKind);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        nodeData.onSelect(nodeData.id);
      }}
      onMouseEnter={() => nodeData.onHover(nodeData.id)}
      onMouseLeave={() => nodeData.onHover(null)}
      className={`
        ast-node group relative w-44 md:w-48 h-[76px] rounded-lg border text-left px-3 py-2.5 overflow-hidden font-mono select-none cursor-pointer
        ${
          isSelected
            ? "ast-node-active border-[#00e5ff]/70 bg-[#0a1720]"
            : isMatch
            ? "border-[#00e5ff] bg-[#0c1822] shadow-[0_0_15px_rgba(0,229,255,0.2)]"
            : isHovered
            ? "border-[#00e5ff]/45 bg-[#0d141d]"
            : "border-white/[0.11] bg-[#0b0e16]/95 hover:border-[#00e5ff]/45 hover:bg-[#0d141d]"
        }
      `}
    >
      {/* Top Handle (Incoming connection) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-transparent !border-none !w-2 !h-2 !-top-1 opacity-0 pointer-events-none"
      />

      {/* Selected cyan indicator bar */}
      {isSelected && (
        <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-[#00e5ff] shadow-[0_0_8px_#00e5ff]" />
      )}

      {/* Header: Kind Tag + Children count badge */}
      <span className="flex items-center justify-between gap-1.5 mb-1">
        <span className={`flex items-center gap-1.5 font-mono text-[9px] tracking-[0.14em] font-bold uppercase truncate ${toneClass}`}>
          <Icon className="w-3 h-3 shrink-0" />
          <span className="truncate">{nodeData.typeLabel}</span>
        </span>
        {nodeData.hasChildren && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              nodeData.onToggleExpand(nodeData.id);
            }}
            className="font-mono text-[9px] text-muted-foreground hover:text-white px-1 rounded border border-white/[0.08] hover:border-white/20 transition-colors shrink-0"
            title={nodeData.isExpanded ? "Collapse children" : "Expand children"}
          >
            {nodeData.childCount} child{nodeData.childCount > 1 ? "ren" : ""}
          </button>
        )}
      </span>

      {/* Main Node Name */}
      <span
        className="block font-mono text-[12px] font-semibold text-white truncate tracking-tight mb-0.5"
        title={nodeData.name}
      >
        {nodeData.name}
      </span>

      {/* Metadata (Line/col range) */}
      <span className="block font-mono text-[9.5px] text-muted-foreground truncate">
        {nodeData.metadata}
      </span>

      {/* Bottom connection dot */}
      <span
        className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full border bg-[#080b12] ${
          isSelected ? "border-[#00e5ff] shadow-[0_0_7px_#00e5ff]" : "border-white/20"
        }`}
      />

      {/* Bottom Handle (Outgoing connection) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-transparent !border-none !w-2 !h-2 !-bottom-1 opacity-0 pointer-events-none"
      />
    </div>
  );
}
