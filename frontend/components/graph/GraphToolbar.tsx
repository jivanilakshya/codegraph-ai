import { Crosshair, RefreshCw, Search, X } from "lucide-react";

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
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
        active
          ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-100"
          : "border-slate-700/80 bg-slate-900/60 text-slate-400 hover:border-slate-600 hover:text-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

function ActionChip({ disabled, icon: Icon, label, onClick, spinning = false }: { disabled?: boolean; icon: typeof RefreshCw; label: string; onClick: () => void; spinning?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-700/80 bg-slate-900/60 px-2.5 text-[11px] font-medium text-slate-300 transition-colors hover:border-cyan-500/50 hover:text-cyan-100 disabled:cursor-wait disabled:opacity-60"
    >
      <Icon className={`size-3.5 ${spinning ? "animate-spin" : ""}`} />
      {label}
    </button>
  );
}

export function GraphToolbar({
  activeNodeTypes,
  activeRelationships,
  isRefreshing,
  isSearching = false,
  onFitView,
  onQueryChange,
  onRefresh,
  onSearchResultSelect,
  onToggleNodeType,
  onToggleRelationship,
  query,
  searchCount,
  searchResults = [],
}: GraphToolbarProps) {
  return (
    <section aria-label="Graph controls" className="pointer-events-none absolute inset-x-3 top-3 z-20">
      <div className="pointer-events-auto rounded-xl border border-slate-700/70 bg-slate-950/90 px-3 py-2 shadow-xl shadow-slate-950/50 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[12rem] flex-1 sm:min-w-[14rem] sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search nodes…"
              className="h-8 w-full rounded-md border border-slate-700/80 bg-slate-900/80 pl-8 pr-14 text-xs text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-500/60"
            />
            {query ? (
              <button
                type="button"
                onClick={() => onQueryChange("")}
                className="absolute right-7 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-500 hover:text-slate-200"
                aria-label="Clear graph search"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
            {query && searchCount !== null ? (
              <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold ${searchCount ? "text-cyan-300" : "text-amber-300"}`}>
                {searchCount}
              </span>
            ) : null}
            {query && onSearchResultSelect ? (
              <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-xl shadow-slate-950/70">
                {isSearching ? (
                  <p className="px-3 py-2 text-xs text-slate-500">Searching…</p>
                ) : searchResults.length ? (
                  searchResults.map((node) => (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => onSearchResultSelect(node)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800"
                    >
                      <span className="truncate">{node.label}</span>
                      <span className="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-400">{node.type}</span>
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-2 text-xs text-slate-500">No matching nodes.</p>
                )}
              </div>
            ) : null}
          </label>

          <div className="hidden h-6 w-px bg-slate-700/80 sm:block" />

          {nodeTypes.map((type) => (
            <FilterChip key={type.value} active={activeNodeTypes.has(type.value)} label={type.label} onClick={() => onToggleNodeType(type.value)} />
          ))}

          <div className="hidden h-6 w-px bg-slate-700/80 md:block" />

          {relationshipTypes.map((type) => (
            <FilterChip key={type.value} active={activeRelationships.has(type.value)} label={type.label} onClick={() => onToggleRelationship(type.value)} />
          ))}

          <div className="hidden h-6 w-px bg-slate-700/80 sm:block" />

          <ActionChip icon={Crosshair} label="Fit View" onClick={onFitView} />
          <ActionChip icon={RefreshCw} label="Refresh" onClick={onRefresh} disabled={isRefreshing} spinning={isRefreshing} />
        </div>
      </div>
    </section>
  );
}
