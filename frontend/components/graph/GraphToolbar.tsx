import { Crosshair, RefreshCw, Search, X } from "lucide-react";

import type { CodeGraphNode, GraphNodeType, GraphRelationshipType } from "@/types/graph";

type GraphToolbarProps = {
  activeNodeTypes: Set<GraphNodeType>;
  activeRelationships: Set<GraphRelationshipType>;
  canFocus: boolean;
  focusError: string | null;
  focusDepth: 1 | 2 | 3;
  isFocused: boolean;
  isFocusing: boolean;
  isRefreshing: boolean;
  onFocusDepthChange: (depth: 1 | 2 | 3) => void;
  onFocus: () => void;
  onShowFullGraph: () => void;
  onFitView: () => void;
  onRefresh: () => void;
  onSearchResultSelect?: (node: CodeGraphNode) => void;
  onToggleNodeType: (type: GraphNodeType) => void;
  onToggleRelationship: (type: GraphRelationshipType) => void;
  query: string;
  searchError: string | null;
  searchResults?: CodeGraphNode[];
  isSearching?: boolean;
  searchCount: number | null;
  onQueryChange: (query: string) => void;
};

const nodeTypes: { label: string; value: GraphNodeType; dotColor: string }[] = [
  { value: "project", label: "Project", dotColor: "bg-fuchsia-400" },
  { value: "module", label: "Modules", dotColor: "bg-sky-400" },
  { value: "api_route", label: "Routes", dotColor: "bg-rose-400" },
  { value: "file", label: "Files", dotColor: "bg-blue-400" },
  { value: "class", label: "Classes", dotColor: "bg-violet-400" },
  { value: "function", label: "Functions", dotColor: "bg-emerald-400" },
  { value: "method", label: "Methods", dotColor: "bg-teal-400" },
  { value: "variable", label: "Variables", dotColor: "bg-amber-400" },
];

const relationshipTypes: { label: string; value: GraphRelationshipType; color: string }[] = [
  { value: "CONTAINS", label: "Contains", color: "#8b5cf6" },
  { value: "HANDLES", label: "Handles", color: "#f43f5e" },
  { value: "IMPORTS", label: "Imports", color: "#38bdf8" },
  { value: "CALLS", label: "Calls", color: "#10b981" },
  { value: "EXTENDS", label: "Extends", color: "#f97316" },
  { value: "HAS_METHOD", label: "Has methods", color: "#eab308" },
  { value: "DECLARES", label: "Declares", color: "#6366f1" },
];

function FilterChip({
  active,
  dotColor,
  label,
  onClick,
}: {
  active: boolean;
  dotColor?: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all duration-150 ${
        active
          ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-100 shadow-[0_0_10px_rgba(34,211,238,0.1)]"
          : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
      }`}
    >
      {dotColor && (
        <span
          className={`size-1.5 rounded-full ${dotColor} ${active ? "opacity-100 ring-2 ring-cyan-400/40" : "opacity-40"}`}
        />
      )}
      {label}
    </button>
  );
}

function ActionChip({
  disabled,
  icon: Icon,
  label,
  onClick,
  spinning = false,
}: {
  disabled?: boolean;
  icon: typeof RefreshCw;
  label: string;
  onClick: () => void;
  spinning?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/80 px-2.5 text-[11px] font-medium text-slate-200 transition-all duration-150 hover:border-cyan-500/60 hover:bg-slate-800 hover:text-cyan-100 disabled:cursor-wait disabled:opacity-50"
    >
      <Icon className={`size-3.5 ${spinning ? "animate-spin text-cyan-400" : "text-slate-400"}`} />
      {label}
    </button>
  );
}

export function GraphToolbar({
  activeNodeTypes,
  activeRelationships,
  isRefreshing,
  canFocus,
  focusError,
  focusDepth,
  isFocused,
  isFocusing,
  onFocus,
  onFocusDepthChange,
  onShowFullGraph,
  isSearching = false,
  onFitView,
  onQueryChange,
  onRefresh,
  onSearchResultSelect,
  onToggleNodeType,
  onToggleRelationship,
  query,
  searchError,
  searchCount,
  searchResults = [],
}: GraphToolbarProps) {
  return (
    <section
      aria-label="Graph controls"
      className="pointer-events-none absolute inset-x-3 top-3 z-20"
    >
      <div className="pointer-events-auto rounded-2xl border border-slate-800/80 bg-slate-950/90 p-2.5 shadow-2xl shadow-slate-950/60 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box with autocomplete */}
          <label className="relative min-w-[13rem] flex-1 sm:min-w-[15rem] sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search nodes by name…"
              className="h-8 w-full rounded-lg border border-slate-800 bg-slate-900/90 pl-8 pr-14 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/40"
            />
            {query ? (
              <button
                type="button"
                onClick={() => onQueryChange("")}
                className="absolute right-7 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-100"
                aria-label="Clear graph search"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
            {query && searchCount !== null ? (
              <span
                className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold ${
                  searchCount ? "text-cyan-300" : "text-amber-300"
                }`}
              >
                {searchCount}
              </span>
            ) : null}
            {query && onSearchResultSelect ? (
              <div className="absolute z-30 mt-1.5 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-700 bg-slate-900/95 shadow-2xl shadow-slate-950/80 backdrop-blur-md">
                {isSearching ? (
                  <p className="px-3 py-2 text-xs text-slate-400">Searching workspace…</p>
                ) : searchError ? (
                  <p className="px-3 py-2 text-xs text-rose-300">{searchError}</p>
                ) : searchResults.length ? (
                  searchResults.map((node) => (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => onSearchResultSelect(node)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs text-slate-200 transition-colors hover:bg-slate-800/80"
                    >
                      <span className="truncate font-medium">{node.label}</span>
                      <span className="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-400">
                        {node.type}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-2 text-xs text-slate-500">No matching nodes.</p>
                )}
              </div>
            ) : null}
          </label>

          <div className="hidden h-5 w-px bg-slate-800 sm:block" />

          {/* Node type chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {nodeTypes.map((type) => (
              <FilterChip
                key={type.value}
                active={activeNodeTypes.has(type.value)}
                dotColor={type.dotColor}
                label={type.label}
                onClick={() => onToggleNodeType(type.value)}
              />
            ))}
          </div>

          <div className="hidden h-5 w-px bg-slate-800 md:block" />

          {/* Relationship type chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {relationshipTypes.map((type) => (
              <FilterChip
                key={type.value}
                active={activeRelationships.has(type.value)}
                label={type.label}
                onClick={() => onToggleRelationship(type.value)}
              />
            ))}
          </div>

          <div className="hidden h-5 w-px bg-slate-800 xl:block" />

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 ml-auto">
            <ActionChip icon={Crosshair} label="Fit View" onClick={onFitView} />

            <label className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/80 px-2.5 text-[11px] font-medium text-slate-300">
              <span className="text-slate-400">Depth</span>
              <select
                aria-label="Focus depth"
                value={focusDepth}
                onChange={(event) =>
                  onFocusDepthChange(Number(event.target.value) as 1 | 2 | 3)
                }
                className="bg-transparent text-[11px] font-semibold text-cyan-300 outline-none cursor-pointer"
              >
                <option value={1} className="bg-slate-900 text-white">
                  1
                </option>
                <option value={2} className="bg-slate-900 text-white">
                  2
                </option>
                <option value={3} className="bg-slate-900 text-white">
                  3
                </option>
              </select>
            </label>

            <ActionChip
              disabled={!canFocus || isFocusing}
              icon={Crosshair}
              label="Focus"
              onClick={onFocus}
              spinning={isFocusing}
            />

            {isFocused ? (
              <ActionChip
                icon={RefreshCw}
                label="Full Graph"
                onClick={onShowFullGraph}
              />
            ) : null}

            <ActionChip
              icon={RefreshCw}
              label="Refresh"
              onClick={onRefresh}
              disabled={isRefreshing}
              spinning={isRefreshing}
            />
          </div>
        </div>

        {focusError ? <p className="mt-2 text-xs text-rose-300">{focusError}</p> : null}
      </div>
    </section>
  );
}
