"use client";

import { Gauge, RefreshCw, Filter, Search, Code2, FolderOpen, GitGraph, AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { StatCard } from "@/components/ui/StatCard";
import { useActiveProject } from "@/hooks/useActiveProject";
import { ProjectSelector } from "@/components/developer/ProjectSelector";
import { getProjectComplexity } from "@/services/complexity";
import { buildSourceLocationUrl } from "@/lib/navigation";
import type { ComplexityItem, ComplexityResponse } from "@/types/complexity";

export default function ComplexityPage() {
  const { projects, activeProjectId, selectProject } = useActiveProject();
  const [data, setData] = useState<ComplexityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>("all");
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
      const response = await getProjectComplexity(activeProjectId);
      setData(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze code complexity.");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [activeProjectId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((item) => {
      if (typeFilter !== "all" && item.entity_type.toLowerCase() !== typeFilter.toLowerCase()) {
        return false;
      }
      if (severityFilter !== "all" && item.severity.toLowerCase() !== severityFilter.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(query);
        const matchPath = item.file_path.toLowerCase().includes(query);
        if (!matchName && !matchPath) return false;
      }
      return true;
    });
  }, [data, typeFilter, severityFilter, searchQuery]);

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

  const getSizeBadge = (warning: string | null | undefined) => {
    if (!warning) return null;
    if (warning === "very_large") {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-300 border border-purple-500/20">
          <FileText className="size-3" /> Very Large (&gt;100 lines)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-300 border border-indigo-500/20">
        <FileText className="size-3" /> Large (&gt;50 lines)
      </span>
    );
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
            <Gauge className="size-7 text-cyan-400" /> Complexity Analysis
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Identify potentially complex functions and methods using cyclomatic complexity metrics and size warnings.
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
          <p className="font-semibold text-rose-100">Failed to analyze code complexity</p>
          <p className="mt-1 text-slate-400">{error}</p>
        </div>
      )}

      {/* Summary Cards Section */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total Complex Functions"
          value={isLoading ? "..." : String(data?.summary.total_items ?? 0)}
          icon={Gauge}
        />
        <StatCard
          label="High Complexity"
          value={isLoading ? "..." : String(data?.summary.high_complexity ?? 0)}
          icon={AlertTriangle}
        />
        <StatCard
          label="Medium Complexity"
          value={isLoading ? "..." : String(data?.summary.medium_complexity ?? 0)}
          icon={Code2}
        />
        <StatCard
          label="Low Complexity"
          value={isLoading ? "..." : String(data?.summary.low_complexity ?? 0)}
          icon={CheckCircle2}
        />
        <StatCard
          label="Maximum Complexity"
          value={isLoading ? "..." : String(data?.summary.max_complexity ?? 0)}
          icon={Gauge}
        />
      </section>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4 backdrop-blur-sm">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Search className="size-4 text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder="Search functions by name or file path..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3 shrink-0 border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0">
          <div className="flex items-center gap-1.5">
            <Filter className="size-3.5 text-slate-500" />
            <span className="text-xs font-medium text-slate-400">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded px-2 py-1 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="all">All Types</option>
              <option value="function">Functions</option>
              <option value="method">Methods</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
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

      {/* Complexity Items List */}
      <section className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-20 animate-pulse rounded-xl bg-slate-900/60 border border-slate-800" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
            <CheckCircle2 className="size-10 mx-auto text-emerald-500/60 mb-2" />
            <h3 className="text-sm font-semibold text-slate-300">No Potentially Complex Code Detected</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
              {searchQuery || typeFilter !== "all" || severityFilter !== "all"
                ? "No function or method metrics match your selected filter criteria."
                : "The analysis observed no potentially complex functions or methods in the currently indexed project."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>Showing {filteredItems.length} analyzed function{filteredItems.length === 1 ? "" : "s"} / method{filteredItems.length === 1 ? "" : "s"}</span>
              <span className="text-[11px] text-slate-500 font-mono">Cyclomatic control-flow analysis</span>
            </div>

            {filteredItems.map((item: ComplexityItem) => (
              <div
                key={item.entity_id}
                className="group flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-xl border border-slate-800/80 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-950 transition-all gap-4"
              >
                <div className="min-w-0 space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 border border-slate-700">
                      <Code2 className="size-3" /> {item.entity_type}
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 font-mono truncate">
                      {item.name}
                    </h3>
                    {getSeverityBadge(item.severity)}
                    {getSizeBadge(item.size_warning)}
                  </div>

                  <p className="text-xs text-slate-400 font-mono truncate">
                    {item.file_path}
                    <span className="text-slate-500"> (L{item.start_line}-L{item.end_line}, {item.line_count} lines)</span>
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0 self-end md:self-center">
                  <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 block font-medium">Complexity</span>
                    <span className={`text-base font-bold font-mono ${
                      item.complexity > 10 ? "text-rose-400" : item.complexity >= 6 ? "text-amber-400" : "text-cyan-400"
                    }`}>
                      {item.complexity}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={buildSourceLocationUrl({
                        projectId: activeProjectId,
                        fileId: item.file_id,
                        filePath: item.file_path,
                        startLine: item.start_line,
                        endLine: item.end_line,
                      })}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-xs font-semibold text-slate-300 hover:border-cyan-500/30 hover:text-cyan-200 transition-colors"
                      title="View File"
                    >
                      <FolderOpen className="size-3.5" /> View File
                    </Link>

                    <Link
                      href={`/graph?projectId=${activeProjectId}&entityId=${item.entity_id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-xs font-semibold text-slate-300 hover:border-cyan-500/30 hover:text-cyan-200 transition-colors"
                      title="Explore Knowledge Graph"
                    >
                      <GitGraph className="size-3.5" /> Explore Graph
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
