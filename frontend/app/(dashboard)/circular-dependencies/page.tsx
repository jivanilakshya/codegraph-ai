"use client";

import { GitFork, RefreshCw, Filter, Search, FolderOpen, GitGraph, AlertTriangle, CheckCircle2, ArrowRight, ShieldAlert, Layers } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { StatCard } from "@/components/ui/StatCard";
import { useActiveProject } from "@/hooks/useActiveProject";
import { ProjectSelector } from "@/components/developer/ProjectSelector";
import { getProjectCircularDependencies } from "@/services/circular_dependency";
import type { CircularDependencyItem, CircularDependencyResponse } from "@/types/circular_dependency";

export default function CircularDependenciesPage() {
  const { projects, activeProjectId, selectProject } = useActiveProject();
  const [data, setData] = useState<CircularDependencyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const loadData = useCallback(async () => {
    if (!activeProjectId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await getProjectCircularDependencies(activeProjectId);
      setData(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze circular dependencies.");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [activeProjectId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredCycles = useMemo(() => {
    if (!data?.cycles) return [];
    return data.cycles.filter((item) => {
      if (severityFilter !== "all" && item.severity.toLowerCase() !== severityFilter.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchPath = item.file_paths.some((p) => p.toLowerCase().includes(query));
        const matchExplanation = item.explanation.toLowerCase().includes(query);
        if (!matchPath && !matchExplanation) return false;
      }
      return true;
    });
  }, [data, severityFilter, searchQuery]);

  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "high":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300 border border-rose-500/20">
            <AlertTriangle className="size-3" /> High Severity
          </span>
        );
      case "medium":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/20">
            Medium Severity
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-300 border border-blue-500/20">
            Low Severity
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 250ms ease-out forwards;
        }
      `}</style>

      <div className="flex items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
            <GitFork className="size-7 text-amber-400" /> Circular Dependency Detection
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Detect potential circular import chains and architectural cycles across module dependencies.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadData()}
          disabled={isLoading}
          className="flex h-9 items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-cyan-500/30 hover:text-cyan-100 disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Project Selector */}
      <ProjectSelector
        onSelect={selectProject}
        projects={projects}
        selectedProjectId={activeProjectId}
      />

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          <p className="font-semibold text-rose-100">Failed to analyze circular dependencies</p>
          <p className="mt-1 text-slate-400">{error}</p>
        </div>
      )}

      {/* Summary Cards Section */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total Cycles"
          value={isLoading ? "..." : String(data?.summary.total_cycles ?? 0)}
          icon={GitFork}
        />
        <StatCard
          label="High Severity"
          value={isLoading ? "..." : String(data?.summary.high_severity ?? 0)}
          icon={ShieldAlert}
        />
        <StatCard
          label="Medium Severity"
          value={isLoading ? "..." : String(data?.summary.medium_severity ?? 0)}
          icon={AlertTriangle}
        />
        <StatCard
          label="Low Severity"
          value={isLoading ? "..." : String(data?.summary.low_severity ?? 0)}
          icon={GitFork}
        />
        <StatCard
          label="Largest Cycle"
          value={isLoading ? "..." : `${data?.summary.max_cycle_length ?? 0} files`}
          icon={Layers}
        />
      </section>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4 backdrop-blur-sm">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Search className="size-4 text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder="Search cycles by file path or explanation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3 shrink-0 border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0">
          <div className="flex items-center gap-1.5">
            <Filter className="size-3.5 text-slate-500" />
            <span className="text-xs font-medium text-slate-400">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded px-2 py-1 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="all">All Severities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cycles List */}
      <section className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="h-28 animate-pulse rounded-xl bg-slate-900/60 border border-slate-800" />
            ))}
          </div>
        ) : filteredCycles.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
            <CheckCircle2 className="size-10 mx-auto text-emerald-500/60 mb-2" />
            <h3 className="text-sm font-semibold text-slate-300">No Circular Dependencies Detected</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
              {searchQuery || severityFilter !== "all"
                ? "No circular dependencies match your selected filter criteria."
                : "The knowledge graph analysis observed no circular import cycles in the currently indexed project."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>Showing {filteredCycles.length} potential circular dependenc{filteredCycles.length === 1 ? "y" : "ies"}</span>
              <span className="text-[11px] text-slate-500 font-mono">File import graph analysis</span>
            </div>

            {filteredCycles.map((item: CircularDependencyItem) => (
              <div
                key={item.id}
                className="group flex flex-col p-5 rounded-xl border border-slate-800/80 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-950 transition-all gap-4"
              >
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    {getSeverityBadge(item.severity)}
                    <span className="rounded bg-slate-800/80 px-2 py-0.5 text-[10px] font-semibold text-slate-300 border border-slate-700">
                      {item.cycle_length} files involved
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    {item.explanation}
                  </span>
                </div>

                {/* Dependency Path Flow Diagram */}
                <div className="rounded-lg border border-slate-800/60 bg-slate-900/40 p-3 overflow-x-auto">
                  <div className="flex items-center gap-2 min-w-max">
                    {item.cycle.map((filePath, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="rounded bg-slate-950 px-2.5 py-1 text-xs font-mono font-semibold text-cyan-300 border border-slate-800">
                          {filePath}
                        </span>
                        {idx < item.cycle.length - 1 && (
                          <div className="flex items-center gap-1 text-slate-500 text-[10px] font-mono">
                            <ArrowRight className="size-3.5 text-cyan-500/70" />
                            <span>IMPORTS</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Links for Involved Files */}
                <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-800/50">
                  <span className="text-[11px] font-medium text-slate-500 mr-2">File Actions:</span>
                  {item.file_ids.map((fileId, idx) => (
                    <div key={fileId} className="flex items-center gap-1.5 mr-3">
                      <span className="text-xs font-mono text-slate-400">{item.file_paths[idx]}</span>
                      <Link
                        href={`/repository?projectId=${activeProjectId}&file=${fileId}`}
                        className="p-1 rounded text-slate-400 hover:bg-slate-900 hover:text-cyan-300 transition-colors"
                        title="View File"
                      >
                        <FolderOpen className="size-3.5" />
                      </Link>
                      <Link
                        href={`/graph?projectId=${activeProjectId}&fileId=${fileId}`}
                        className="p-1 rounded text-slate-400 hover:bg-slate-900 hover:text-cyan-300 transition-colors"
                        title="Explore Graph"
                      >
                        <GitGraph className="size-3.5" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
