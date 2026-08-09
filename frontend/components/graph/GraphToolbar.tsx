import { Crosshair, Filter, RefreshCw, Search, X } from "lucide-react";

import type { CodeGraphNode, GraphNodeType, GraphRelationshipType } from "@/types/graph";

type GraphToolbarProps = {
  activeNodeTypes: Set<GraphNodeType>;
  activeRelationships: Set<GraphRelationshipType>;
  isRefreshing: boolean;
  onFitView: () => void;
  onRefresh: () => void;
  onSearchResultSelect?: (node: CodeGraphNode) => void;
  onToggleNodeType: (type: GraphNodeType) => void;
  onToggleRelationship: (type: GraphRelationshipType) => void;
  query: string;
  searchResults?: CodeGraphNode[];
  isSearching?: boolean;
  searchCount: number | null;
  onQueryChange: (query: string) => void;
};

const nodeTypes: { label: string; value: GraphNodeType }[] = [
  { value: "function", label: "Functions" },
  { value: "file", label: "Files" },
  { value: "class", label: "Classes" },
  { value: "variable", label: "Variables" },
];

const relationshipTypes: { label: string; value: GraphRelationshipType }[] = [
  { value: "IMPORTS", label: "Imports" },
  { value: "CALLS", label: "Calls" },
  { value: "DECLARES", label: "Declares" },
];

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${active ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200" : "border-slate-800 bg-slate-900/40 text-slate-500 hover:text-slate-200"}`}>{label}</button>;
}

export function GraphToolbar({ activeNodeTypes, activeRelationships, isRefreshing, isSearching = false, onFitView, onQueryChange, onRefresh, onSearchResultSelect, onToggleNodeType, onToggleRelationship, query, searchCount, searchResults = [] }: GraphToolbarProps) {
  return <section aria-label="Graph controls" className="rounded-xl border border-slate-800 bg-slate-950/65 p-4">
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <label className="relative min-w-0 flex-1 xl:max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search by name, file, class, or function…" className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900 pl-9 pr-20 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-500/70" />
        {query ? <button type="button" onClick={() => onQueryChange("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-200" aria-label="Clear graph search"><X className="size-4" /></button> : null}
        {query && searchCount !== null ? <span className={`absolute right-9 top-1/2 -translate-y-1/2 text-xs ${searchCount ? "text-cyan-300" : "text-amber-300"}`}>{searchCount}</span> : null}
        {query && onSearchResultSelect ? <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-xl shadow-slate-950/70">{isSearching ? <p className="px-3 py-2 text-xs text-slate-500">Searching workspace…</p> : searchResults.length ? searchResults.map((node) => <button key={node.id} type="button" onClick={() => onSearchResultSelect(node)} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"><span className="truncate">{node.label}</span><span className="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-400">{node.type}</span></button>) : <p className="px-3 py-2 text-xs text-slate-500">No matching files or functions.</p>}</div> : null}
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
