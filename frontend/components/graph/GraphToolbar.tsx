import { Crosshair, Filter, RefreshCw, Search, X } from "lucide-react";

import type { GraphNodeType, GraphRelationshipType } from "@/types/graph";

type GraphToolbarProps = {
  activeNodeTypes: Set<GraphNodeType>;
  activeRelationships: Set<GraphRelationshipType>;
  isRefreshing: boolean;
  onFitView: () => void;
  onRefresh: () => void;
  onToggleNodeType: (type: GraphNodeType) => void;
  onToggleRelationship: (type: GraphRelationshipType) => void;
  query: string;
  searchCount: number | null;
  onQueryChange: (query: string) => void;
};

const nodeTypes: { label: string; value: GraphNodeType }[] = [
  { value: "file", label: "Files" },
  { value: "class", label: "Classes" },
  { value: "function", label: "Functions" },
  { value: "method", label: "Methods" },
  { value: "variable", label: "Variables" },
  { value: "module", label: "Modules" },
];

const relationshipTypes: { label: string; value: GraphRelationshipType }[] = [
  { value: "IMPORTS", label: "Imports" },
  { value: "CALLS", label: "Calls" },
  { value: "CONTAINS", label: "Contains" },
  { value: "HAS_METHOD", label: "Has Method" },
  { value: "EXTENDS", label: "Extends" },
  { value: "EXPORTS", label: "Exports" },
];

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${active ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200" : "border-slate-800 bg-slate-900/40 text-slate-500 hover:text-slate-200"}`}>{label}</button>;
}

export function GraphToolbar({ activeNodeTypes, activeRelationships, isRefreshing, onFitView, onQueryChange, onRefresh, onToggleNodeType, onToggleRelationship, query, searchCount }: GraphToolbarProps) {
  return <section aria-label="Graph controls" className="rounded-xl border border-slate-800 bg-slate-950/65 p-4">
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <label className="relative min-w-0 flex-1 xl:max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search by name, file, class, or function…" className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900 pl-9 pr-20 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-500/70" />
        {query ? <button type="button" onClick={() => onQueryChange("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-200" aria-label="Clear graph search"><X className="size-4" /></button> : null}
        {query && searchCount !== null ? <span className={`absolute right-9 top-1/2 -translate-y-1/2 text-xs ${searchCount ? "text-cyan-300" : "text-amber-300"}`}>{searchCount}</span> : null}
      </label>
      <div className="flex gap-2">
        <button type="button" onClick={onFitView} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-700 px-3 text-sm font-semibold text-slate-300 hover:border-cyan-500/60 hover:text-cyan-200"><Crosshair className="size-4" />Fit view</button>
        <button type="button" onClick={onRefresh} disabled={isRefreshing} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-700 px-3 text-sm font-semibold text-slate-300 hover:border-cyan-500/60 hover:text-cyan-200 disabled:cursor-wait disabled:opacity-60"><RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />Refresh</button>
      </div>
    </div>
    <div className="mt-4 border-t border-slate-800 pt-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"><Filter className="size-3.5" />Node types</div>
      <div className="mt-2 flex flex-wrap gap-1.5">{nodeTypes.map((type) => <FilterChip key={type.value} active={activeNodeTypes.has(type.value)} label={type.label} onClick={() => onToggleNodeType(type.value)} />)}</div>
      <div className="mt-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"><Filter className="size-3.5" />Relationships</div>
      <div className="mt-2 flex flex-wrap gap-1.5">{relationshipTypes.map((type) => <FilterChip key={type.value} active={activeRelationships.has(type.value)} label={type.label} onClick={() => onToggleRelationship(type.value)} />)}</div>
    </div>
  </section>;
}
