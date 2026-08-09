import { Box, FileCode2, FunctionSquare, Variable } from "lucide-react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { memo } from "react";

import type { GraphNodeType } from "@/types/graph";

export type FlowCodeGraphNodeData = {
  label: string;
  nodeType: GraphNodeType;
  focused: boolean;
  matched: boolean;
  dimmed: boolean;
  entityCount?: number;
  withinModule?: boolean;
};

const nodeAppearance: Record<GraphNodeType, { accent: string; icon: typeof FileCode2; label: string }> = {
  file: { accent: "border-blue-400/60 bg-blue-400/10 text-blue-200", icon: FileCode2, label: "File" },
  class: { accent: "border-violet-400/60 bg-violet-400/10 text-violet-200", icon: Box, label: "Class" },
  function: { accent: "border-emerald-400/60 bg-emerald-400/10 text-emerald-200", icon: FunctionSquare, label: "Function" },
  variable: { accent: "border-amber-400/60 bg-amber-400/10 text-amber-200", icon: Variable, label: "Variable" },
};

export const CodeGraphNode = memo(function CodeGraphNode({ data, selected }: NodeProps) {
  const typedData = data as FlowCodeGraphNodeData;
  const appearance = nodeAppearance[typedData.nodeType];
  const Icon = appearance.icon;
  const targetPosition = typedData.withinModule ? Position.Top : Position.Left;
  const sourcePosition = typedData.withinModule ? Position.Bottom : Position.Right;

  return (
    <div className={`h-full min-w-36 rounded-lg border px-3 py-2 shadow-lg shadow-slate-950/50 transition-all ${appearance.accent} ${typedData.dimmed ? "opacity-20 saturate-50" : "opacity-100"} ${selected || typedData.focused ? "ring-2 ring-cyan-200 ring-offset-2 ring-offset-slate-950" : typedData.matched ? "ring-2 ring-cyan-400/60 ring-offset-1 ring-offset-slate-950" : ""}`}>
      <Handle type="target" position={targetPosition} className="!h-1.5 !w-1.5 !border-0 !bg-slate-400" />
      <div className="flex items-center gap-2">
        <Icon className="size-4 shrink-0" />
        <span className="max-w-44 truncate text-sm font-semibold" title={typedData.label}>{typedData.label}</span>
      </div>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] opacity-70">{appearance.label}</p>
      <Handle type="source" position={sourcePosition} className="!h-1.5 !w-1.5 !border-0 !bg-slate-400" />
    </div>
  );
});

/** A file is both a selectable node and the architectural frame for its declarations. */
export const FileModuleNode = memo(function FileModuleNode({ data, selected }: NodeProps) {
  const typedData = data as FlowCodeGraphNodeData;
  const focused = selected || typedData.focused;

  return (
    <div className={`h-full w-full overflow-visible rounded-xl border bg-slate-950/85 shadow-[0_18px_42px_rgba(2,6,23,0.42)] transition-colors ${typedData.dimmed ? "border-slate-800 opacity-25" : focused ? "border-cyan-300/85 ring-1 ring-cyan-300/50" : "border-cyan-900/80 hover:border-cyan-600/70"}`}>
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-0 !bg-cyan-400" />
      <header className="flex h-14 items-center gap-2 border-b border-cyan-950/80 bg-cyan-950/25 px-3">
        <FileCode2 className="size-4 shrink-0 text-cyan-300" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-100" title={typedData.label}>{typedData.label}</span>
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-300/70">{typedData.entityCount ?? 0} decl.</span>
      </header>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-0 !bg-cyan-400" />
    </div>
  );
});
