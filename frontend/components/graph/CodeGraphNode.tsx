import {
  Box,
  FileCode2,
  FolderTree,
  FunctionSquare,
  Layers,
  Radio,
  Variable,
} from "lucide-react";
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

const nodeAppearance: Record<
  GraphNodeType,
  {
    badgeBg: string;
    border: string;
    glow: string;
    icon: typeof FileCode2;
    iconColor: string;
    label: string;
    textColor: string;
  }
> = {
  project: {
    label: "Project",
    icon: Layers,
    border: "border-fuchsia-500/40 hover:border-fuchsia-400",
    badgeBg: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
    iconColor: "text-fuchsia-400",
    textColor: "text-fuchsia-100",
    glow: "shadow-fuchsia-500/20",
  },
  module: {
    label: "Module",
    icon: FolderTree,
    border: "border-sky-500/40 hover:border-sky-400",
    badgeBg: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    iconColor: "text-sky-400",
    textColor: "text-sky-100",
    glow: "shadow-sky-500/20",
  },
  api_route: {
    label: "API Route",
    icon: Radio,
    border: "border-rose-500/40 hover:border-rose-400",
    badgeBg: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    iconColor: "text-rose-400",
    textColor: "text-rose-100",
    glow: "shadow-rose-500/20",
  },
  file: {
    label: "File",
    icon: FileCode2,
    border: "border-blue-500/40 hover:border-blue-400",
    badgeBg: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    iconColor: "text-blue-400",
    textColor: "text-blue-100",
    glow: "shadow-blue-500/20",
  },
  class: {
    label: "Class",
    icon: Box,
    border: "border-violet-500/40 hover:border-violet-400",
    badgeBg: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    iconColor: "text-violet-400",
    textColor: "text-violet-100",
    glow: "shadow-violet-500/20",
  },
  function: {
    label: "Function",
    icon: FunctionSquare,
    border: "border-emerald-500/40 hover:border-emerald-400",
    badgeBg: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    iconColor: "text-emerald-400",
    textColor: "text-emerald-100",
    glow: "shadow-emerald-500/20",
  },
  method: {
    label: "Method",
    icon: FunctionSquare,
    border: "border-teal-500/40 hover:border-teal-400",
    badgeBg: "bg-teal-500/15 text-teal-300 border-teal-500/30",
    iconColor: "text-teal-400",
    textColor: "text-teal-100",
    glow: "shadow-teal-500/20",
  },
  variable: {
    label: "Variable",
    icon: Variable,
    border: "border-amber-500/40 hover:border-amber-400",
    badgeBg: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    iconColor: "text-amber-400",
    textColor: "text-amber-100",
    glow: "shadow-amber-500/20",
  },
};

export const CodeGraphNode = memo(function CodeGraphNode({ data, selected }: NodeProps) {
  const typedData = data as FlowCodeGraphNodeData;
  const appearance = nodeAppearance[typedData.nodeType] ?? nodeAppearance.function;
  const Icon = appearance.icon;
  const targetPosition = typedData.withinModule ? Position.Top : Position.Left;
  const sourcePosition = typedData.withinModule ? Position.Bottom : Position.Right;

  const isFocused = selected || typedData.focused;

  return (
    <div
      className={`group relative flex h-full w-full flex-col justify-between rounded-xl border bg-slate-950/90 p-3 shadow-lg backdrop-blur-md transition-all duration-200 ${
        appearance.border
      } ${
        typedData.dimmed
          ? "opacity-25 saturate-50 pointer-events-none"
          : "opacity-100 hover:shadow-xl hover:-translate-y-0.5"
      } ${
        isFocused
          ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#060a10] border-cyan-400 shadow-[0_0_24px_rgba(34,211,238,0.35)] scale-[1.02]"
          : typedData.matched
            ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-[#060a10] border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.3)]"
            : ""
      }`}
    >
      <Handle
        type="target"
        position={targetPosition}
        className="!h-2 !w-2 !rounded-full !border-2 !border-slate-900 !bg-slate-400 group-hover:!bg-cyan-400 transition-colors"
      />

      {/* Top row: Icon container + Label */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`grid size-7 shrink-0 place-items-center rounded-lg border ${appearance.badgeBg}`}
        >
          <Icon className={`size-3.5 ${appearance.iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-[13px] font-semibold tracking-tight text-slate-100 group-hover:text-white"
            title={typedData.label}
          >
            {typedData.label}
          </p>
        </div>
      </div>

      {/* Bottom row: Type badge */}
      <div className="mt-2 flex items-center justify-between">
        <span
          className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${appearance.badgeBg}`}
        >
          {appearance.label}
        </span>
      </div>

      <Handle
        type="source"
        position={sourcePosition}
        className="!h-2 !w-2 !rounded-full !border-2 !border-slate-900 !bg-slate-400 group-hover:!bg-cyan-400 transition-colors"
      />
    </div>
  );
});

/** A file is both a selectable node and the architectural frame for its declarations. */
export const FileModuleNode = memo(function FileModuleNode({ data, selected }: NodeProps) {
  const typedData = data as FlowCodeGraphNodeData;
  const isFocused = selected || typedData.focused;

  return (
    <div
      className={`h-full w-full overflow-visible rounded-2xl border bg-slate-950/80 shadow-[0_18px_42px_rgba(2,6,23,0.5)] backdrop-blur-md transition-all duration-200 ${
        typedData.dimmed
          ? "border-slate-800/80 opacity-25"
          : isFocused
            ? "border-cyan-400 ring-2 ring-cyan-400/60 ring-offset-2 ring-offset-[#060a10] shadow-[0_0_30px_rgba(34,211,238,0.25)]"
            : "border-slate-700/80 hover:border-cyan-500/70"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !rounded-full !border-2 !border-slate-900 !bg-cyan-400"
      />

      <header className="flex h-12 items-center justify-between gap-2.5 border-b border-slate-800/80 bg-slate-900/60 px-3.5 rounded-t-2xl">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="grid size-6 shrink-0 place-items-center rounded-md border border-blue-500/30 bg-blue-500/15">
            <FileCode2 className="size-3.5 text-blue-400" />
          </div>
          <span
            className="truncate text-xs font-semibold text-slate-100"
            title={typedData.label}
          >
            {typedData.label}
          </span>
        </div>
        <span className="shrink-0 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-300">
          {typedData.entityCount ?? 0} decl.
        </span>
      </header>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !rounded-full !border-2 !border-slate-900 !bg-cyan-400"
      />
    </div>
  );
});
