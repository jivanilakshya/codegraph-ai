"use client";

import {
  Box,
  Braces,
  FileCode2,
  FunctionSquare,
  Layers3,
  Network,
  Radio,
  Variable,
} from "lucide-react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import React, { memo } from "react";

import { cn } from "@/lib/cn";
import type { GraphNodeType } from "@/types/graph";

export type FlowCodeGraphNodeData = {
  label: string;
  nodeType: GraphNodeType;
  focused: boolean;
  selected: boolean;
  connected: boolean;
  matched: boolean;
  dimmed: boolean;
  meta?: string;
  entityCount?: number;
  withinModule?: boolean;
  isExpandable?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: (nodeId: string) => void;
  nodeId?: string;
};

export const NODE_APPEARANCE: Record<
  GraphNodeType,
  {
    icon: React.ElementType;
    color: string;
    tone: string;
    plural: string;
    typeLabel: string;
  }
> = {
  project: {
    icon: Network,
    color: "#00e5ff",
    tone: "text-primary",
    plural: "Projects",
    typeLabel: "PROJECT",
  },
  module: {
    icon: Layers3,
    color: "#7dd3fc",
    tone: "text-sky-300",
    plural: "Folders",
    typeLabel: "FOLDER",
  },
  api_route: {
    icon: Radio,
    color: "#fb7185",
    tone: "text-rose-300",
    plural: "Routes",
    typeLabel: "ROUTE",
  },
  file: {
    icon: FileCode2,
    color: "#60a5fa",
    tone: "text-blue-300",
    plural: "Files",
    typeLabel: "FILE",
  },
  class: {
    icon: Box,
    color: "#a78bfa",
    tone: "text-violet-300",
    plural: "Classes",
    typeLabel: "CLASS",
  },
  function: {
    icon: FunctionSquare,
    color: "#22d3ee",
    tone: "text-cyan-300",
    plural: "Functions",
    typeLabel: "FUNCTION",
  },
  method: {
    icon: Braces,
    color: "#34d399",
    tone: "text-emerald-300",
    plural: "Methods",
    typeLabel: "METHOD",
  },
  variable: {
    icon: Variable,
    color: "#fbbf24",
    tone: "text-amber-300",
    plural: "Variables",
    typeLabel: "VARIABLE",
  },
};

export const CodeGraphNode = memo(function CodeGraphNode({ data, selected }: NodeProps) {
  const typedData = data as unknown as FlowCodeGraphNodeData;
  const meta = NODE_APPEARANCE[typedData.nodeType] ?? NODE_APPEARANCE.function;
  const Icon = meta.icon;

  const isSelected = selected || typedData.focused || typedData.selected;
  const isConnected = !isSelected && Boolean(typedData.connected);
  const isDimmed = !isSelected && !isConnected && typedData.dimmed;

  return (
    <div
      className={cn(
        "group relative flex h-full w-full flex-col justify-between rounded-lg border px-2.5 py-1.5 text-left overflow-hidden select-none transition-all duration-200",
        isSelected
          ? "border-primary bg-[#091820] shadow-[0_0_28px_-7px_rgba(0,229,255,0.7)] ring-1 ring-primary/60 scale-[1.02] z-30 opacity-100"
          : isConnected
          ? "border-primary/50 bg-[#0c1626] shadow-[0_0_16px_rgba(0,229,255,0.2)] z-20 opacity-100"
          : typedData.matched
          ? "border-amber-400/80 bg-[#161208] shadow-[0_0_20px_rgba(251,191,36,0.3)] z-20 opacity-100"
          : "border-white/[0.11] bg-[#0a0d15]/95 hover:border-primary/40 hover:bg-[#0d131d] z-10 opacity-100",
        isDimmed && "!opacity-20 hover:!opacity-75 !border-white/[0.05] !bg-[#0a0d15]/60 !z-0"
      )}
    >
      {/* Neon left active bar on selected node */}
      {isSelected && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-[2.5px] rounded-full bg-primary shadow-[0_0_10px_#00e5ff]" />
      )}

      {/* Connected indicator bar on related neighbors */}
      {isConnected && (
        <span className="absolute left-0 top-2 bottom-2 w-[1.5px] rounded-full bg-primary/60 shadow-[0_0_6px_rgba(0,229,255,0.4)]" />
      )}

      {/* Handles for clean curved / flowing routing */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!h-1.5 !w-1.5 !rounded-full !border-2 !border-[#0a0d15] !bg-slate-400 group-hover:!bg-primary transition-colors"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        className="!h-1.5 !w-1.5 !rounded-full !border-2 !border-[#0a0d15] !bg-slate-400 group-hover:!bg-primary transition-colors"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!h-1.5 !w-1.5 !rounded-full !border-2 !border-[#0a0d15] !bg-slate-400 group-hover:!bg-primary transition-colors"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        className="!h-1.5 !w-1.5 !rounded-full !border-2 !border-[#0a0d15] !bg-slate-400 group-hover:!bg-primary transition-colors"
      />

      {/* Top row: Icon + Label + Expand/Collapse Button */}
      <div className="flex items-center gap-1.5 min-w-0">
        <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", meta.tone)} />
        <span
          className="font-mono text-[11.5px] font-medium text-white truncate flex-1"
          title={typedData.label}
        >
          {typedData.label}
        </span>
        {typedData.isExpandable && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (typedData.nodeId && typedData.onToggleExpand) {
                typedData.onToggleExpand(typedData.nodeId);
              }
            }}
            className={cn(
              "flex h-4 w-4 shrink-0 items-center justify-center rounded border font-mono text-[9px] font-bold transition-all",
              typedData.isExpanded
                ? "border-primary/50 bg-primary/20 text-primary hover:bg-primary/30"
                : "border-white/10 bg-white/[0.05] text-muted-foreground hover:border-primary/40 hover:text-white"
            )}
            title={typedData.isExpanded ? "Collapse children" : "Expand children"}
          >
            {typedData.isExpanded ? "−" : "+"}
          </button>
        )}
      </div>

      {/* Bottom row: Type tag + Sub-label/meta */}
      <div className="flex items-center justify-between mt-1 min-w-0">
        <span className={cn("font-mono text-[8.5px] font-bold tracking-[0.12em] shrink-0", meta.tone)}>
          {meta.typeLabel}
        </span>
        {typedData.meta && (
          <span className="font-mono text-[8.5px] text-muted-foreground truncate ml-1.5">
            {typedData.meta}
          </span>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        className="!h-1.5 !w-1.5 !rounded-full !border-2 !border-[#0a0d15] !bg-slate-400 group-hover:!bg-primary transition-colors"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!h-1.5 !w-1.5 !rounded-full !border-2 !border-[#0a0d15] !bg-slate-400 group-hover:!bg-primary transition-colors"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        className="!h-1.5 !w-1.5 !rounded-full !border-2 !border-[#0a0d15] !bg-slate-400 group-hover:!bg-primary transition-colors"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!h-1.5 !w-1.5 !rounded-full !border-2 !border-[#0a0d15] !bg-slate-400 group-hover:!bg-primary transition-colors"
      />
    </div>
  );
});

export const FileModuleNode = memo(function FileModuleNode({ data, selected }: NodeProps) {
  const typedData = data as unknown as FlowCodeGraphNodeData;
  const isFocused = selected || typedData.focused;

  return (
    <div
      className={cn(
        "h-full w-full overflow-visible rounded-xl border bg-[#060810]/80 shadow-[0_18px_42px_rgba(2,6,23,0.5)] backdrop-blur-md transition-all duration-200",
        typedData.dimmed
          ? "border-white/[0.05] opacity-25"
          : isFocused
          ? "border-primary/60 ring-1 ring-primary/40 shadow-[0_0_30px_rgba(0,229,255,0.25)]"
          : "border-white/[0.08] hover:border-primary/40"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!h-2.5 !w-2.5 !rounded-full !border-2 !border-slate-900 !bg-primary"
      />

      <header className="flex h-10 items-center justify-between gap-2.5 border-b border-white/[0.06] bg-white/[0.02] px-3 rounded-t-xl">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileCode2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span
            className="truncate font-mono text-[11px] font-semibold text-white"
            title={typedData.label}
          >
            {typedData.label}
          </span>
        </div>
        <span className="shrink-0 rounded border border-primary/20 bg-primary/[0.07] px-1.5 py-0.5 font-mono text-[8.5px] text-primary">
          {typedData.entityCount ?? 0} decl
        </span>
      </header>

      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!h-2.5 !w-2.5 !rounded-full !border-2 !border-slate-900 !bg-primary"
      />
    </div>
  );
});
