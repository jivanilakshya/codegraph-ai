"use client";

import { GitFork, RefreshCw, Filter, Search, FolderOpen, GitGraph, AlertTriangle, CheckCircle2, ArrowRight, ShieldAlert, Layers, ChevronDown, Check } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { StatCard } from "@/components/ui/StatCard";
import { useActiveProject } from "@/hooks/useActiveProject";
import { ProjectSelector } from "@/components/developer/ProjectSelector";
import { getProjectCircularDependencies } from "@/services/circular_dependency";
import { buildSourceLocationUrl } from "@/lib/navigation";
import type { CircularDependencyItem, CircularDependencyResponse } from "@/types/circular_dependency";

type FilterOption = {
  value: string;
  label: string;
};

function FilterDropdown({
  label,
  value,
  options,
  onChange,
  icon: Icon,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (val: string) => void;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      return () => document.removeEventListener("mousedown", handleOutsideClick);
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value) ?? options[0];

  return (
    <div ref={containerRef} className="relative flex items-center gap-1.5">
      {Icon && <Icon className="size-3.5 text-slate-400" />}
      <span className="text-xs font-medium text-slate-400 select-none">{label}</span>
      <div className="relative">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setIsOpen(false);
            } else if (e.key === "ArrowDown" && !isOpen) {
              setIsOpen(true);
            }
          }}
          className={`relative overflow-hidden flex h-8 items-center justify-between gap-2 rounded-lg border border-[#242424] bg-[#080808] px-2.5 text-xs font-medium text-slate-100 transition-all duration-200 hover:border-[rgba(255,255,255,0.25)] hover:bg-[#0D0D0D] focus:border-[rgba(255,255,255,0.3)] focus:outline-none ${
            isOpen ? "border-[rgba(255,255,255,0.3)] bg-[#0D0D0D] shadow-[0_0_12px_rgba(255,255,255,0.06)]" : ""
          }`}
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.04),transparent_50%)]"
            aria-hidden="true"
          />
          <span className="relative z-10 truncate">{selectedOption.label}</span>
          <ChevronDown
            className={`relative z-10 size-3 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-white" : ""
            }`}
          />
        </button>

        {isOpen && (
          <div
            role="listbox"
            tabIndex={-1}
            className="absolute right-0 top-full z-50 mt-1 min-w-[140px] w-max overflow-hidden rounded-xl border border-[#242424] bg-[#0A0A0A] p-1 shadow-[0_12px_36px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)] transition-all duration-150"
          >
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.04),transparent_40%)]"
              aria-hidden="true"
            />
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`relative z-10 flex w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors duration-150 ${
                    isSelected
                      ? "bg-[#141414] text-white font-medium border border-[#2A2A2A]"
                      : "text-slate-300 hover:bg-[#121212] hover:text-white"
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected ? (
                    <Check className="size-3 text-cyan-400 shrink-0" />
                  ) : (
                    <span className="size-3 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

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
    <div className="space-y-8 animate-fade-in bg-[#000000] text-slate-100 min-h-full">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 250ms ease-out forwards;
        }
      `}</style>

      {/* Header section */}
      <div className="flex items-center justify-between gap-4 border-b border-[#242424] pb-6">
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
          className="relative overflow-hidden flex h-9 items-center gap-2 rounded-lg border border-[#242424] bg-[#080808] px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:border-[rgba(255,255,255,0.25)] hover:bg-[#0D0D0D] hover:text-white transition-all duration-200 disabled:opacity-50 shadow-sm"
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.04),transparent_50%)]"
            aria-hidden="true"
          />
          <RefreshCw className={`relative z-10 size-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span className="relative z-10">Refresh</span>
        </button>
      </div>

      {/* Project Selector */}
      <ProjectSelector
        onSelect={selectProject}
        projects={projects}
        selectedProjectId={activeProjectId}
      />

      {error && (
        <div className="rounded-xl border border-rose-900/50 bg-rose-950/20 p-4 text-sm text-rose-200">
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

      {/* Filters Bar with StatCard-matched ambient shading */}
      <div className="relative z-20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-xl border border-[#242424] bg-[#080808] p-4 shadow-xl">
        <div
          className="pointer-events-none absolute inset-0 rounded-xl overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.035),transparent_40%)]"
          aria-hidden="true"
        />

        <div className="relative z-10 flex items-center gap-2.5 min-w-0 flex-1 rounded-lg border border-[#242424] bg-[#0D0D0D] px-3 py-1.5 focus-within:border-[rgba(255,255,255,0.25)] focus-within:bg-[#121212] transition-colors">
          <Search className="size-3.5 text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder="Search cycles by file path or explanation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
          />
        </div>

        <div className="relative z-10 flex items-center gap-3 shrink-0 border-t sm:border-t-0 border-[#242424] pt-3 sm:pt-0">
          <FilterDropdown
            label="Severity:"
            value={severityFilter}
            options={[
              { value: "all", label: "All Severities" },
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" },
            ]}
            onChange={setSeverityFilter}
            icon={Filter}
          />
        </div>
      </div>

      {/* Cycles List */}
      <section className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="h-28 animate-pulse rounded-xl bg-[#080808] border border-[#242424]" />
            ))}
          </div>
        ) : filteredCycles.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[#242424] rounded-xl bg-[#080808]/60">
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
                className="group relative overflow-hidden flex flex-col p-5 rounded-xl border border-[#242424] bg-[#080808] hover:border-[rgba(255,255,255,0.22)] hover:bg-[#0D0D0D] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_12px_36px_rgba(0,0,0,0.5)] transition-all duration-300 gap-4"
              >
                {/* Subtle Top-Left Ambient Highlight matching StatCard */}
                <div
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.04),transparent_45%)]"
                  aria-hidden="true"
                />

                <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    {getSeverityBadge(item.severity)}
                    <span className="rounded bg-[#151515] px-2 py-0.5 text-[10px] font-semibold text-slate-300 border border-[#242424]">
                      {item.cycle_length} files involved
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    {item.explanation}
                  </span>
                </div>

                {/* Dependency Path Flow Diagram */}
                <div className="relative z-10 rounded-lg border border-[#242424] bg-[#0A0A0A] p-3 overflow-x-auto">
                  <div className="flex items-center gap-2 min-w-max">
                    {item.cycle.map((filePath, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="rounded bg-[#111111] px-2.5 py-1 text-xs font-mono font-semibold text-cyan-300 border border-[#242424]">
                          {filePath}
                        </span>
                        {idx < item.cycle.length - 1 && (
                          <div className="flex items-center gap-1 text-slate-500 text-[10px] font-mono">
                            <ArrowRight className="size-3.5 text-slate-400" />
                            <span>IMPORTS</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Links for Involved Files */}
                <div className="relative z-10 flex items-center gap-2 flex-wrap pt-1 border-t border-[#242424]/50">
                  <span className="text-[11px] font-medium text-slate-500 mr-2">File Actions:</span>
                  {item.file_ids.map((fileId, idx) => (
                    <div key={fileId} className="flex items-center gap-1.5 mr-3">
                      <span className="text-xs font-mono text-slate-400">{item.file_paths[idx]}</span>
                      <Link
                        href={buildSourceLocationUrl({
                          projectId: activeProjectId,
                          fileId: fileId,
                          filePath: item.file_paths[idx],
                        })}
                        className="p-1 rounded text-slate-400 hover:bg-[#181818] hover:text-white transition-colors duration-200"
                        title="View File"
                      >
                        <FolderOpen className="size-3.5" />
                      </Link>
                      <Link
                        href={`/graph?projectId=${activeProjectId}&fileId=${fileId}`}
                        className="p-1 rounded text-slate-400 hover:bg-[#181818] hover:text-white transition-colors duration-200"
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
