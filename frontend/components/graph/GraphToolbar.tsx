"use client";

import {
  Focus,
  Maximize,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import React from "react";

import { NODE_APPEARANCE } from "@/components/graph/CodeGraphNode";
import { cn } from "@/lib/cn";
import type { CodeGraphNode, GraphNodeType, GraphRelationshipType } from "@/types/graph";

type GraphToolbarProps = {
  activeNodeTypes: Set<GraphNodeType>;
  activeRelationships: Set<GraphRelationshipType>;
  canFocus: boolean;
  focusDepth: 1 | 2 | 3;
  isFocused: boolean;
  isFocusing: boolean;
  isRefreshing: boolean;
  onFocusDepthChange: (depth: 1 | 2 | 3) => void;
  onFocus: () => void;
  onShowFullGraph?: () => void;
  onFitView: () => void;
  onRefresh: () => void;
  onSearchResultSelect?: (node: CodeGraphNode) => void;
  query: string;
  searchError: string | null;
  searchResults?: CodeGraphNode[];
  isSearching?: boolean;
  searchCount: number | null;
  onQueryChange: (query: string) => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
};

export function GraphToolbar({
  activeNodeTypes,
  activeRelationships,
  canFocus,
  focusDepth,
  isFocused,
  isFocusing,
  isRefreshing,
  onFocusDepthChange,
  onFocus,
  onFitView,
  onRefresh,
  onSearchResultSelect,
  query,
  searchError,
  searchResults = [],
  isSearching = false,
  searchCount,
  onQueryChange,
  onExpandAll,
  onCollapseAll,
}: GraphToolbarProps) {
  return (
    <div className="relative z-20 min-h-12 px-3 py-2 border-b border-white/[0.06] bg-[#080a12]/90 flex flex-wrap items-center gap-2">
      {/* Search Input with Autocomplete */}
      <div className="relative flex-1 max-w-xs min-w-[180px]">
        <label className="flex items-center gap-2 h-8 w-full px-2.5 rounded-md border border-white/[0.07] bg-black/20 focus-within:border-primary/40 transition-colors">
          <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search graph nodes..."
            className="w-full min-w-0 bg-transparent outline-none text-[11.5px] text-white placeholder:text-muted-foreground/60 font-mono"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              className="text-muted-foreground hover:text-white"
              aria-label="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          {query && searchCount !== null && (
            <span className="font-mono text-[9.5px] text-primary shrink-0">
              {searchCount}
            </span>
          )}
        </label>

        {/* Autocomplete Dropdown */}
        {query && onSearchResultSelect && (
          <div className="absolute left-0 right-0 top-full mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-white/[0.12] bg-[#0a0d16]/95 p-1.5 shadow-2xl backdrop-blur-xl z-50 cg-pop">
            {isSearching ? (
              <p className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                Searching graph nodes…
              </p>
            ) : searchError ? (
              <p className="px-3 py-2 font-mono text-[11px] text-rose-300">
                {searchError}
              </p>
            ) : searchResults.length ? (
              searchResults.map((node) => {
                const meta = NODE_APPEARANCE[node.type] ?? NODE_APPEARANCE.function;
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => {
                      onSearchResultSelect(node);
                    }}
                    className="flex w-full items-center justify-between gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors hover:bg-white/[0.06] group"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: meta.color }}
                      />
                      <span className="truncate font-mono text-[11px] text-slate-200 group-hover:text-white">
                        {node.label}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 font-mono text-[8.5px] uppercase font-bold",
                        meta.tone
                      )}
                    >
                      {node.type}
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                No matching nodes found.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Summary count */}
      <span className="hidden xl:inline font-mono text-[9.5px] text-muted-foreground px-2">
        {activeNodeTypes.size} types · {activeRelationships.size} relationships
      </span>

      {/* Depth Segmented Control */}
      <div className="flex items-center h-8 rounded-md border border-white/[0.08] bg-black/15 overflow-hidden">
        <span className="px-2 cg-label !text-[8px] border-r border-white/[0.07]">
          Depth
        </span>
        {([1, 2, 3] as const).map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onFocusDepthChange(level)}
            title={
              level === 1
                ? "Depth 1: Architecture Overview (Project, Folders)"
                : level === 2
                ? "Depth 2: Progressive Exploration (+ Files)"
                : "Depth 3: Progressive Exploration (+ Functions & Methods)"
            }
            className={cn(
              "w-8 h-8 font-mono text-[10px] border-r last:border-r-0 border-white/[0.06] transition-colors",
              focusDepth === level
                ? "text-primary bg-primary/[0.09]"
                : "text-muted-foreground hover:text-white"
            )}
          >
            {level}
          </button>
        ))}
      </div>

      {/* Expand / Collapse All Controls */}
      {onExpandAll && onCollapseAll && (
        <div className="flex items-center h-8 rounded-md border border-white/[0.08] bg-black/15 overflow-hidden">
          <button
            type="button"
            onClick={onExpandAll}
            className="px-2.5 h-full font-mono text-[9.5px] text-muted-foreground hover:text-white hover:bg-white/[0.04] border-r border-white/[0.06] transition-colors"
            title="Expand visible nodes at current depth"
          >
            Expand
          </button>
          <button
            type="button"
            onClick={onCollapseAll}
            className="px-2.5 h-full font-mono text-[9.5px] text-muted-foreground hover:text-white hover:bg-white/[0.04] transition-colors"
            title="Collapse all nodes to root"
          >
            Collapse
          </button>
        </div>
      )}

      {/* Tool Buttons */}
      <button
        type="button"
        onClick={onFitView}
        className="graph-tool"
        title="Fit view to graph"
      >
        <Maximize className="w-3 h-3" />
        Fit
      </button>

      <button
        type="button"
        onClick={onFocus}
        disabled={!canFocus}
        className={cn(
          "graph-tool",
          isFocused && "!text-primary !border-primary/30 !bg-primary/[0.07]"
        )}
        title={canFocus ? "Focus on selected node" : "Select a node to focus"}
      >
        <Focus className={cn("w-3 h-3", isFocusing && "animate-pulse")} />
        {isFocused ? "Reset" : "Focus"}
      </button>

      <button
        type="button"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="graph-tool"
        title="Refresh graph"
      >
        <RefreshCw className={cn("w-3 h-3", isRefreshing && "animate-spin text-primary")} />
        Refresh
      </button>
    </div>
  );
}
