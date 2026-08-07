import { Box, Braces, FileCode2, FolderCode, FunctionSquare, Variable } from "lucide-react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

import type { GraphNodeType } from "@/types/graph";

export type FlowCodeGraphNodeData = {
  label: string;
  nodeType: GraphNodeType;
  focused: boolean;
  matched: boolean;
  dimmed: boolean;
};

const nodeAppearance: Record<GraphNodeType, { accent: string; icon: typeof FileCode2; label: string }> = {
  file: { accent: "border-cyan-400/60 bg-cyan-400/10 text-cyan-200", icon: FileCode2, label: "File" },
  class: { accent: "border-violet-400/60 bg-violet-400/10 text-violet-200", icon: Box, label: "Class" },
  function: { accent: "border-emerald-400/60 bg-emerald-400/10 text-emerald-200", icon: FunctionSquare, label: "Function" },
  method: { accent: "border-teal-400/60 bg-teal-400/10 text-teal-200", icon: Braces, label: "Method" },
  variable: { accent: "border-amber-400/60 bg-amber-400/10 text-amber-200", icon: Variable, label: "Variable" },
  module: { accent: "border-blue-400/60 bg-blue-400/10 text-blue-200", icon: FolderCode, label: "Module" },
};

export function CodeGraphNode({ data, selected }: NodeProps) {
  const typedData = data as FlowCodeGraphNodeData;
  const appearance = nodeAppearance[typedData.nodeType];
  const Icon = appearance.icon;

  return (
    <div className={`min-w-36 rounded-lg border px-3 py-2 shadow-lg shadow-slate-950/50 transition-all ${appearance.accent} ${typedData.dimmed ? "opacity-35 saturate-50" : ""} ${selected || typedData.focused ? "ring-2 ring-cyan-200 ring-offset-2 ring-offset-slate-950" : typedData.matched ? "ring-2 ring-cyan-400/60 ring-offset-1 ring-offset-slate-950" : ""}`}>
      <Handle type="target" position={Position.Top} className="!h-1.5 !w-1.5 !border-0 !bg-slate-400" />
      <div className="flex items-center gap-2">
        <Icon className="size-4 shrink-0" />
        <span className="max-w-44 truncate text-sm font-semibold" title={typedData.label}>{typedData.label}</span>
      </div>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] opacity-70">{appearance.label}</p>
      <Handle type="source" position={Position.Bottom} className="!h-1.5 !w-1.5 !border-0 !bg-slate-400" />
    </div>
  );
}
