"use client";

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  FileCode2,
  FolderOpen,
  GitFork,
  GitGraph,
  Network,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useActiveProject } from "@/hooks/useActiveProject";
import { cn } from "@/lib/cn";
import { buildSourceLocationUrl } from "@/lib/navigation";
import { getProjectCircularDependencies } from "@/services/circular_dependency";
import type {
  CircularDependencyItem,
  CircularDependencyResponse,
} from "@/types/circular_dependency";

type FilterOption = {
  value: string;
  label: string;
};

function FilterDropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: FilterOption[];
  onChange: (val: string) => void;
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
    <div ref={containerRef} className="relative">
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
        className={cn(
          "relative flex h-8 items-center justify-between gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 text-xs font-mono text-slate-200 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.05] focus:outline-none cursor-pointer",
          isOpen && "border-cyan-400/40 bg-white/[0.06] shadow-[0_0_12px_rgba(0,229,255,0.12)]"
        )}
      >
        <span className="truncate">{selectedOption.label}</span>
        <ChevronDown
          className={cn(
            "size-3 text-slate-400 transition-transform duration-200",
            isOpen && "rotate-180 text-cyan-400"
          )}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          tabIndex={-1}
          className="absolute right-0 top-full mt-1.5 min-w-[160px] w-max overflow-hidden rounded-xl p-1.5 shadow-[0_12px_35px_rgba(0,0,0,0.5),0_0_20px_rgba(0,200,255,0.06)] cg-pop"
          style={{
            backgroundColor: "#090e17",
            border: "1px solid rgba(100, 150, 180, 0.25)",
            boxShadow: "0 12px 35px rgba(0,0,0,0.45)",
            zIndex: 1000,
          }}
        >
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
                className={cn(
                  "relative flex w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-mono text-left transition-colors duration-150 cursor-pointer",
                  isSelected
                    ? "bg-[rgba(0,200,255,0.12)] border border-cyan-400/30 text-white font-medium"
                    : "text-slate-300 border border-transparent hover:bg-[rgba(0,200,255,0.08)] hover:text-white"
                )}
              >
                <span className="truncate">{option.label}</span>
                {isSelected ? (
                  <Check className="size-3 text-cyan-400 shrink-0 drop-shadow-[0_0_4px_rgba(0,229,255,0.6)]" />
                ) : (
                  <span className="size-3 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CircularDependenciesPage() {
  const {
    projects,
    activeProjectId,
    activeProject,
    isLoadingProjects,
    selectProject,
  } = useActiveProject();

  const [data, setData] = useState<CircularDependencyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Project selector dropdown state in the status bar
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  // Close project dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        projectDropdownRef.current &&
        !projectDropdownRef.current.contains(event.target as Node)
      ) {
        setProjectDropdownOpen(false);
      }
    };
    if (projectDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [projectDropdownOpen]);

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
          <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-rose-300 border border-rose-500/25">
            <AlertTriangle className="size-2.5" /> High Severity
          </span>
        );
      case "medium":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-amber-300 border border-amber-500/25">
            Medium Severity
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-sky-500/10 px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-sky-300 border border-sky-500/25">
            Low Severity
          </span>
        );
    }
  };

  return (
    <div className="max-w-[1500px] mx-auto px-3 md:px-6 lg:px-8 py-4 md:py-6 text-foreground relative z-10 space-y-6 sm:space-y-8 animate-fade-in">
      {/* ── 1. Page Header matching Figma Design ── */}
      <section className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 border-b border-white/[0.07] pb-6">
        <div>
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.85)]" />
            <span className="cg-label !text-[10px]">
              CODEGRAPH AI / CODE QUALITY
            </span>
          </div>

          {/* Title with icon beside it */}
          <h1 className="text-3xl sm:text-4xl lg:text-[44px] leading-tight sm:leading-none font-bold tracking-tight text-white flex items-center gap-3.5">
            <GitFork className="size-7 sm:size-8 text-amber-400 shrink-0 drop-shadow-[0_0_10px_rgba(251,191,36,0.4)]" />
            <span>Circular Dependency Detection</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-2.5 text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
            Detect potential circular import chains and architectural cycles across module dependencies.
          </p>
        </div>

        {/* Refresh Action Button */}
        <button
          type="button"
          onClick={() => void loadData()}
          disabled={isLoading || isLoadingProjects}
          className="h-9 px-3.5 rounded-lg border border-white/[0.1] bg-white/[0.025] hover:bg-white/[0.06] hover:border-white/20 text-xs font-mono font-medium text-slate-200 transition-all flex items-center gap-2 shrink-0 disabled:opacity-50 cursor-pointer shadow-sm self-start"
        >
          <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />
          <span>Refresh</span>
        </button>
      </section>

      {/* ── 2. Analysis Status + Active Project Horizontal Context Bar ── */}
      <section className="relative z-40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-white/[0.08] bg-black/25 backdrop-blur-md">
        {/* Left: Status */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
          <AlertTriangle className="size-3.5 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)] shrink-0" />
          <span className="font-medium text-slate-200">Analysis complete</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400">file import graph</span>
        </div>

        {/* Right: Active Project Context */}
        <div className="relative flex items-center gap-2.5 z-50" ref={projectDropdownRef}>
          <span className="cg-label !text-[9px] text-[#7d8aa0] shrink-0">
            ACTIVE PROJECT CONTEXT
          </span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setProjectDropdownOpen((prev) => !prev)}
              className={cn(
                "flex items-center gap-2.5 h-8 px-2.5 rounded-lg border text-xs transition-all cursor-pointer",
                projectDropdownOpen
                  ? "border-cyan-400/40 bg-[#0c1422] text-white shadow-[0_0_12px_rgba(0,229,255,0.18)]"
                  : "border-white/[0.1] bg-white/[0.03] hover:border-cyan-400/30 hover:bg-[#0c1422] text-slate-200"
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#00e5ff] shrink-0" />
              <span className="text-white font-medium truncate max-w-[140px] sm:max-w-[180px]">
                {activeProject?.name ?? "Select Project"}
              </span>
              <span className="font-mono text-[11px] text-[#7d8aa0] shrink-0">
                #{activeProjectId ?? "—"}
              </span>
              <ChevronDown
                className={cn(
                  "size-3 text-slate-400 transition-transform duration-200 shrink-0",
                  projectDropdownOpen && "rotate-180 text-cyan-400"
                )}
              />
            </button>

            {projectDropdownOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-72 sm:w-80 max-h-80 overflow-y-auto rounded-xl p-1.5 shadow-[0_12px_35px_rgba(0,0,0,0.45),0_0_24px_rgba(0,200,255,0.08)] cg-pop"
                style={{
                  backgroundColor: "#090e17",
                  border: "1px solid rgba(100, 150, 180, 0.25)",
                  boxShadow: "0 12px 35px rgba(0,0,0,0.45)",
                  zIndex: 1000,
                }}
              >
                <div className="cg-label px-3 pt-2 pb-1.5 !text-[9.5px] text-[#7d8aa0] select-none tracking-wider font-semibold">
                  SWITCH PROJECT
                </div>
                <div className="space-y-1">
                  {projects.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-400 italic">No projects available</div>
                  ) : (
                    projects.map((proj) => {
                      const isSelected = proj.id === activeProjectId;
                      return (
                        <button
                          key={proj.id}
                          type="button"
                          onClick={() => {
                            selectProject(proj.id);
                            setProjectDropdownOpen(false);
                          }}
                          className={cn(
                            "relative w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left transition-all duration-150 cursor-pointer",
                            isSelected
                              ? "bg-[rgba(0,200,255,0.12)] border border-cyan-400/30 text-white"
                              : "text-slate-200 border border-transparent hover:bg-[rgba(0,200,255,0.08)] hover:text-white"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00e5ff] shrink-0" />
                            <span className="text-[13px] font-medium text-white truncate">
                              {proj.name}
                            </span>
                            <span className="font-mono text-[11px] text-[#7d8aa0] shrink-0">
                              #{proj.id}
                            </span>
                          </div>
                          {isSelected && (
                            <Check className="size-3.5 text-cyan-400 shrink-0 drop-shadow-[0_0_4px_rgba(0,229,255,0.6)]" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Error notification */}
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-mono text-rose-200 flex items-center gap-3">
          <AlertTriangle className="size-4 shrink-0 text-rose-400" />
          <div className="flex-1">
            <span className="font-semibold text-rose-100">Failed to analyze circular dependencies: </span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── 3. Dependency Overview (Single Integrated Horizontal Metric Strip) ── */}
      <section className="relative rounded-xl border border-white/[0.08] bg-black/25 backdrop-blur-md overflow-hidden">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.06] animate-pulse">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="p-4 sm:p-5 h-20 bg-white/[0.02]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1fr_1.1fr] divide-y lg:divide-y-0 lg:divide-x divide-white/[0.06]">
            {/* 1. DEPENDENCY OVERVIEW (first metric with stronger visual emphasis) */}
            <div className="col-span-2 sm:col-span-1 p-4 sm:p-5 bg-gradient-to-r from-amber-500/[0.05] via-amber-500/[0.02] to-transparent relative">
              <div className="cg-label !text-[9px] text-[#7d8aa0]">DEPENDENCY OVERVIEW</div>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-4xl lg:text-5xl font-bold tracking-tight text-white tabular-nums">
                  {data?.summary.total_cycles ?? 0}
                </span>
                <span className="text-xs text-slate-400 font-medium">Total cycles</span>
              </div>
            </div>

            {/* 2. HIGH SEVERITY */}
            <div className="p-4 sm:p-5">
              <div className="cg-label !text-[9px] text-rose-400/80">HIGH SEVERITY</div>
              <div className="mt-2 text-2xl sm:text-3xl font-bold text-rose-400 tabular-nums">
                {data?.summary.high_severity ?? 0}
              </div>
            </div>

            {/* 3. MEDIUM SEVERITY */}
            <div className="p-4 sm:p-5">
              <div className="cg-label !text-[9px] text-amber-400/80">MEDIUM SEVERITY</div>
              <div className="mt-2 text-2xl sm:text-3xl font-bold text-amber-400 tabular-nums">
                {data?.summary.medium_severity ?? 0}
              </div>
            </div>

            {/* 4. LOW SEVERITY */}
            <div className="p-4 sm:p-5">
              <div className="cg-label !text-[9px] text-sky-400/80">LOW SEVERITY</div>
              <div className="mt-2 text-2xl sm:text-3xl font-bold text-sky-400 tabular-nums">
                {data?.summary.low_severity ?? 0}
              </div>
            </div>

            {/* 5. LARGEST CYCLE */}
            <div className="col-span-2 sm:col-span-1 p-4 sm:p-5">
              <div className="cg-label !text-[9px] text-[#7d8aa0]">LARGEST CYCLE</div>
              <div className="mt-2 text-2xl sm:text-3xl font-bold text-white tabular-nums">
                {data?.summary.max_cycle_length ? `${data.summary.max_cycle_length} files` : "0 files"}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── 4. Search + Severity Filter (Unified Control Container) ── */}
      <section className="relative z-20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-black/25 backdrop-blur-md p-2.5 sm:p-3">
        {/* Left: Search input */}
        <div className="flex-1 flex items-center gap-2.5 h-9 sm:h-10 px-3 rounded-lg border border-white/[0.06] bg-white/[0.02] focus-within:border-cyan-400/40 focus-within:bg-white/[0.04] transition-all">
          <Search className="size-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search cycles by file path or explanation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-slate-500 hover:text-white p-0.5"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Right: Severity Filter */}
        <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 border-white/[0.06] pt-2.5 sm:pt-0">
          <span className="cg-label !text-[9px] text-[#7d8aa0] shrink-0">SEVERITY</span>
          <FilterDropdown
            value={severityFilter}
            options={[
              { value: "all", label: "All Severities" },
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" },
            ]}
            onChange={setSeverityFilter}
          />
        </div>
      </section>

      {/* ── 5. Results Header & List Section ── */}
      <section className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, idx) => (
              <div
                key={idx}
                className="h-64 animate-pulse rounded-xl bg-white/[0.02] border border-white/[0.06]"
              />
            ))}
          </div>
        ) : !activeProjectId ? (
          <div className="text-center py-14 border border-white/[0.08] rounded-xl bg-black/25 backdrop-blur-md">
            <GitFork className="size-10 mx-auto text-amber-400/60 mb-2.5" />
            <h3 className="text-base font-bold text-slate-200">No Project Selected</h3>
            <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
              Please choose a project from the context selector above to analyze circular dependency loops.
            </p>
          </div>
        ) : filteredCycles.length === 0 ? (
          /* ── 6. Empty State matching Figma Specification ── */
          <div className="text-center py-14 border border-white/[0.08] rounded-xl bg-black/30 backdrop-blur-md relative overflow-hidden">
            <CheckCircle2 className="size-12 mx-auto text-emerald-400/80 mb-3 drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]" />
            <h3 className="text-lg font-bold text-slate-100 tracking-tight">
              No Circular Dependencies Detected
            </h3>
            <p className="mt-1.5 text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              {searchQuery || severityFilter !== "all"
                ? "No circular dependencies match your selected filter criteria."
                : "The knowledge graph analysis observed no circular import cycles in the currently indexed project."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Results count & graph annotation header */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-1 pt-1">
              <span className="font-medium text-slate-300">
                Showing {filteredCycles.length} potential circular dependenc{filteredCycles.length === 1 ? "y" : "ies"}
              </span>
              <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                <Network className="size-3.5 text-cyan-400/70" />
                File import graph analysis
              </span>
            </div>

            {/* ── 7. Cycle Result Cards matching Figma Specification ── */}
            {filteredCycles.map((item: CircularDependencyItem, idx: number) => {
              const firstFilePath = item.file_paths[0] ?? "";
              const firstFileName = firstFilePath.split("/").pop() || firstFilePath;

              return (
                <div
                  key={item.id}
                  className="relative overflow-hidden rounded-lg border border-white/[0.08] border-l-2 border-l-cyan-400 bg-[#070b14]/90 shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_20px_-6px_rgba(6,182,212,0.1)] p-5 sm:p-6 space-y-6 transition-all duration-300 hover:border-white/[0.14] hover:shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_26px_-4px_rgba(6,182,212,0.18)]"
                >
                  {/* Top Section */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getSeverityBadge(item.severity)}
                      <span className="rounded bg-white/[0.05] px-2 py-0.5 text-[10px] font-mono font-semibold tracking-wider uppercase text-slate-300 border border-white/10">
                        {item.cycle_length} FILES INVOLVED
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                      Cycle #{idx + 1} · Closed import dependency
                    </h3>

                    <p className="text-xs sm:text-[13px] text-slate-400 leading-relaxed max-w-4xl">
                      {item.explanation}
                    </p>
                  </div>

                  {/* ── 8. Open Dependency Graph Area (Direct on Cycle Card Surface) ── */}
                  <div className="py-2 sm:py-4 overflow-x-auto">
                    <div className="min-w-[560px] sm:min-w-full flex flex-col">
                      {/* Horizontal forward flow: [File A] ─── IMPORTS ───> [File B] ─── IMPORTS ───> [File C] */}
                      <div className="w-full flex items-center justify-between">
                        {item.file_paths.map((filePath, fileIdx) => {
                          const parts = filePath.split("/");
                          const fileName = parts.pop() || filePath;
                          const dirName = parts.length > 0 ? parts.join("/") : "project root";
                          const isLast = fileIdx === item.file_paths.length - 1;

                          return (
                            <React.Fragment key={fileIdx}>
                              {/* File Node: 160px x 70px compact technical graph node */}
                              <div className="w-[160px] h-[70px] shrink-0 rounded-md border border-white/[0.1] bg-[#090f1a] p-2.5 flex flex-col justify-between shadow-[0_2px_10px_rgba(0,0,0,0.4)]">
                                <div className="flex items-center gap-1.5">
                                  <FileCode2 className="size-3.5 text-cyan-400 shrink-0" />
                                </div>
                                <div className="min-w-0">
                                  <div
                                    className="text-xs font-mono font-medium text-white truncate"
                                    title={fileName}
                                  >
                                    {fileName}
                                  </div>
                                  <div
                                    className="text-[10px] font-mono text-[#7d8aa0] truncate"
                                    title={dirName}
                                  >
                                    {dirName}
                                  </div>
                                </div>
                              </div>

                              {/* Long expanding arrow between nodes */}
                              {!isLast && (
                                <div className="flex-1 mx-3 sm:mx-6 flex flex-col items-center justify-center min-w-[60px]">
                                  <span className="text-[9px] font-mono font-semibold tracking-widest text-amber-400/90 uppercase mb-1 drop-shadow-[0_0_4px_rgba(251,191,36,0.35)]">
                                    IMPORTS
                                  </span>
                                  <div className="w-full flex items-center">
                                    <div className="flex-1 h-[1px] bg-amber-400/80 shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
                                    <svg
                                      className="w-2.5 h-2.5 text-amber-400 -ml-1 shrink-0 drop-shadow-[0_0_4px_rgba(251,191,36,0.7)]"
                                      viewBox="0 0 10 10"
                                      fill="currentColor"
                                    >
                                      <polygon points="0,1.5 9,5 0,8.5 2.5,5" />
                                    </svg>
                                  </div>
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>

                      {/* Direct Curved Dashed Return Path */}
                      {item.file_paths.length > 1 && (
                        <div className="relative mt-3 mx-[80px] h-12 flex items-center justify-center">
                          <svg
                            className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
                            preserveAspectRatio="none"
                            viewBox="0 0 100 48"
                          >
                            <defs>
                              <marker
                                id={`arrow-${item.id}`}
                                viewBox="0 0 10 10"
                                refX="6"
                                refY="5"
                                markerWidth="6"
                                markerHeight="6"
                                orient="auto-start-reverse"
                              >
                                <polygon points="9,1.5 0,5 9,8.5 6.5,5" fill="#f59e0b" />
                              </marker>
                            </defs>
                            <path
                              d="M 100,0 C 100,28 95,36 85,36 L 15,36 C 5,36 0,28 0,6"
                              fill="none"
                              stroke="#f59e0b"
                              strokeWidth="1.5"
                              strokeDasharray="4 3"
                              markerEnd={`url(#arrow-${item.id})`}
                              className="drop-shadow-[0_0_4px_rgba(245,158,11,0.5)]"
                              vectorEffect="non-scaling-stroke"
                            />
                          </svg>

                          <div className="relative z-10 -mt-0.5">
                            <span className="bg-[#070b14] px-2.5 py-0.5 text-[9px] font-mono font-semibold tracking-wider text-amber-400 uppercase drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]">
                              IMPORTS · RETURNS TO {firstFileName.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── 9. File Actions Section (Clean Bottom Row) ── */}
                  <div className="pt-3 border-t border-white/[0.06] space-y-2">
                    <div className="cg-label !text-[9px] text-[#7d8aa0] tracking-wider">
                      FILE ACTIONS
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {item.file_ids.map((fileId, fileIndex) => {
                        const filePath = item.file_paths[fileIndex] ?? `file_${fileId}`;
                        const fileName = filePath.split("/").pop() || filePath;

                        return (
                          <div
                            key={fileId}
                            className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border border-white/[0.06] bg-[#090f1a] hover:bg-[#0c1424] hover:border-white/[0.12] transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileCode2 className="size-3.5 text-cyan-400 shrink-0" />
                              <span
                                className="text-xs font-mono text-slate-300 font-medium truncate"
                                title={filePath}
                              >
                                {fileName}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <Link
                                href={buildSourceLocationUrl({
                                  projectId: activeProjectId,
                                  fileId: fileId,
                                  filePath: filePath,
                                })}
                                className="p-1 rounded border border-white/[0.08] bg-white/[0.02] text-slate-400 hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition-all cursor-pointer"
                                title="View File in Repository"
                                aria-label={`View file ${fileName}`}
                              >
                                <FolderOpen className="size-3.5" />
                              </Link>
                              <Link
                                href={`/graph?projectId=${activeProjectId}&fileId=${fileId}`}
                                className="p-1 rounded border border-white/[0.08] bg-white/[0.02] text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all cursor-pointer"
                                title="Explore in Knowledge Graph"
                                aria-label={`Explore graph for ${fileName}`}
                              >
                                <GitGraph className="size-3.5" />
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
