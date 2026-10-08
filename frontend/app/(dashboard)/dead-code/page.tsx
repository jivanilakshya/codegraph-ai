"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  Box,
  Braces,
  Check,
  CheckCircle2,
  ChevronDown,
  Code2,
  FileCode2,
  FunctionSquare,
  Network,
  RefreshCw,
  Search,
  ShieldAlert,
  Variable,
  X,
} from "lucide-react";
import Link from "next/link";
import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useActiveProject } from "@/hooks/useActiveProject";
import { cn } from "@/lib/cn";
import { buildSourceLocationUrl } from "@/lib/navigation";
import { getProjectDeadCode } from "@/services/dead_code";
import type { DeadCodeItem, DeadCodeResponse } from "@/types/dead_code";

const TYPE_META: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    tone: string;
    surface: string;
  }
> = {
  file: {
    icon: FileCode2,
    tone: "text-sky-300",
    surface: "border-sky-400/20 bg-sky-400/[0.05]",
  },
  function: {
    icon: FunctionSquare,
    tone: "text-primary",
    surface: "border-cyan-400/20 bg-cyan-400/[0.05]",
  },
  method: {
    icon: Braces,
    tone: "text-emerald-300",
    surface: "border-emerald-400/20 bg-emerald-400/[0.05]",
  },
  class: {
    icon: Box,
    tone: "text-violet-300",
    surface: "border-violet-400/20 bg-violet-400/[0.05]",
  },
  variable: {
    icon: Variable,
    tone: "text-amber-200",
    surface: "border-amber-400/20 bg-amber-400/[0.05]",
  },
};

const DEFAULT_TYPE_META = {
  icon: Code2,
  tone: "text-slate-300",
  surface: "border-white/10 bg-white/[0.04]",
};

const CONFIDENCE_META: Record<string, string> = {
  high: "text-rose-300 border-rose-400/25 bg-rose-400/[0.055]",
  medium: "text-amber-200 border-amber-400/25 bg-amber-400/[0.05]",
  low: "text-sky-300 border-sky-400/20 bg-sky-400/[0.045]",
};

function formatLines(start?: number | null, end?: number | null) {
  if (start == null && end == null) return null;
  if (start != null && end != null) {
    return start === end ? `L${start}` : `L${start}–${end}`;
  }
  if (start != null) return `L${start}`;
  return `L${end}`;
}

function DeadCodePageInner() {
  const {
    projects,
    activeProjectId,
    activeProject,
    isLoadingProjects,
    selectProject,
  } = useActiveProject();

  const [data, setData] = useState<DeadCodeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [confidenceFilter, setConfidenceFilter] = useState("all");

  // Selection & UI state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [projectOpen, setProjectOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const projectRef = useRef<HTMLDivElement>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close project dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        projectRef.current &&
        !projectRef.current.contains(event.target as Node)
      ) {
        setProjectOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch dead code analysis
  const loadData = useCallback(async () => {
    if (!activeProjectId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await getProjectDeadCode(activeProjectId);
      setData(response.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to perform dead code analysis."
      );
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [activeProjectId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Statistics calculation
  const counts = useMemo(() => {
    const items = data?.items ?? [];
    const files =
      data?.summary?.files ??
      items.filter((i) => i.entity_type.toLowerCase() === "file").length;
    const functions =
      (data?.summary?.functions ??
        items.filter((i) => i.entity_type.toLowerCase() === "function").length) +
      (data?.summary?.methods ??
        items.filter((i) => i.entity_type.toLowerCase() === "method").length);
    const classes =
      data?.summary?.classes ??
      items.filter((i) => i.entity_type.toLowerCase() === "class").length;
    const variables =
      data?.summary?.variables ??
      items.filter((i) => i.entity_type.toLowerCase() === "variable").length;
    const total = data?.total_candidates ?? items.length;

    return { total, files, functions, classes, variables };
  }, [data]);

  // Filtered candidate list
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    const q = query.trim().toLowerCase();

    return data.items.filter((item) => {
      if (
        typeFilter !== "all" &&
        item.entity_type.toLowerCase() !== typeFilter.toLowerCase()
      ) {
        return false;
      }
      if (
        confidenceFilter !== "all" &&
        item.confidence.toLowerCase() !== confidenceFilter.toLowerCase()
      ) {
        return false;
      }
      if (q) {
        const matchName = item.name.toLowerCase().includes(q);
        const matchPath = item.file_path.toLowerCase().includes(q);
        const matchReason = item.reason.toLowerCase().includes(q);
        const matchType = item.entity_type.toLowerCase().includes(q);
        if (!matchName && !matchPath && !matchReason && !matchType) return false;
      }
      return true;
    });
  }, [data?.items, query, typeFilter, confidenceFilter]);

  const clearFilters = () => {
    setQuery("");
    setTypeFilter("all");
    setConfidenceFilter("all");
  };

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast(message);
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 2500);
  };

  const projectCandidates = data?.items ?? [];

  return (
    <div className="w-full max-w-none box-border min-w-0 overflow-x-hidden space-y-6 sm:space-y-8">
      {/* ── Page Header: Fully Responsive to Viewport ── */}
      <header className="w-full flex flex-col xl:flex-row xl:items-end justify-between gap-4 sm:gap-6 border-b border-white/[0.06] pb-5 sm:pb-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,.65)]" />
            <span className="cg-label !text-[10px]">CodeGraph AI / Code Quality</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[42px] leading-tight font-bold tracking-[-0.035em] text-white">
            Dead Code Detection
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-2 max-w-2xl leading-relaxed">
            Identify potentially unreachable files, classes, functions, methods,
            and variables using knowledge-graph analysis.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2.5 shrink-0">
          {/* Active Project Context Selector */}
          <div className="relative min-w-[200px] sm:w-60" ref={projectRef}>
            <div className="cg-label mb-1.5 !text-[9.5px]">Active Project Context</div>
            <button
              type="button"
              onClick={() => setProjectOpen((open) => !open)}
              className={cn(
                "flex items-center gap-2.5 justify-between w-full h-9.5 px-3 rounded-lg border bg-white/[0.02] transition-all text-xs",
                projectOpen
                  ? "border-primary/40 shadow-[0_0_0_3px_rgba(0,229,255,0.06),0_0_24px_-6px_rgba(0,229,255,0.35)]"
                  : "border-white/[0.08] hover:border-white/20"
              )}
            >
              <span className="flex items-center gap-2 min-w-0 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_#00e5ff] shrink-0" />
                <span className="text-white font-medium truncate">
                  {activeProject?.name ?? "Select Project"}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                  #{activeProjectId ?? "—"}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0",
                  projectOpen && "rotate-180 text-primary"
                )}
              />
            </button>

            {projectOpen && (
              <div className="absolute top-full right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] max-h-80 overflow-y-auto p-1.5 rounded-xl border border-cyan-300/15 bg-[#0a0d16]/95 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] z-50 cg-pop">
                <div className="cg-label px-2.5 pt-1.5 pb-2 !text-[9.5px]">
                  Switch project
                </div>
                {projects.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      selectProject(option.id);
                      setProjectOpen(false);
                      setSelectedId(null);
                      clearFilters();
                    }}
                    className={cn(
                      "relative w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-colors",
                      option.id === activeProjectId
                        ? "bg-primary/[0.07]"
                        : "hover:bg-white/[0.04]"
                    )}
                  >
                    {option.id === activeProjectId && (
                      <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-primary" />
                    )}
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] text-white truncate font-medium">
                        {option.name}{" "}
                        <span className="font-mono text-[11px] text-muted-foreground font-normal">
                          (#{option.id})
                        </span>
                      </span>
                      <span className="block font-mono text-[10.5px] text-muted-foreground truncate">
                        {option.github_url ||
                          option.default_branch ||
                          "Local repository"}
                      </span>
                    </span>
                    {option.id === activeProjectId && (
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Refresh Action: Always Fully Visible */}
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={isLoading || isLoadingProjects}
            className="h-9.5 px-3.5 rounded-lg border border-white/[0.1] bg-white/[0.025] text-xs text-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/[0.045] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <RefreshCw
              className={cn("w-3.5 h-3.5", isLoading && "animate-spin")}
            />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* ── Responsive Statistics Section: Desktop horizontal, Tablet wraps, Mobile stacks ── */}
      <section className="w-full">
        {isLoading ? (
          <div className="border-y border-white/[0.06] py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 animate-pulse">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-16 rounded-lg bg-white/[0.035]"
              />
            ))}
          </div>
        ) : (
          <div className="w-full border-y border-white/[0.06] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.3fr_repeat(4,1fr)] divide-y sm:divide-y-0 sm:divide-x divide-white/[0.06]">
            {/* Overview Hero Column */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-500/[0.045] to-transparent flex flex-col justify-between">
              <div className="cg-label !text-[9px]">Dead Code Overview</div>
              <div className="mt-2 flex items-baseline gap-2.5">
                <span className="text-3xl sm:text-4xl font-semibold tracking-[-0.04em] leading-none text-white tabular-nums">
                  {counts.total}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  Potential dead items
                </span>
              </div>
            </div>

            {/* Metric Columns */}
            {[
              {
                label: "Files",
                value: counts.files,
                icon: FileCode2,
                tone: "text-sky-300",
              },
              {
                label: "Functions / Methods",
                value: counts.functions,
                icon: FunctionSquare,
                tone: "text-primary",
              },
              {
                label: "Classes",
                value: counts.classes,
                icon: Box,
                tone: "text-violet-300",
              },
              {
                label: "Variables",
                value: counts.variables,
                icon: Variable,
                tone: "text-amber-200",
              },
            ].map(({ label, value, icon: Icon, tone }) => (
              <div
                key={label}
                className="p-4 sm:p-5 flex flex-col justify-between min-w-0"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Icon className={cn("w-3.5 h-3.5 shrink-0", tone)} />
                  <span className="cg-label !text-[8.5px] truncate">{label}</span>
                </div>
                <div className="mt-2 text-xl sm:text-2xl font-semibold text-white tabular-nums">
                  {value}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Search + Filters Bar: Fits available width, no horizontal overflow ── */}
      <section className="w-full rounded-xl border border-white/[0.07] bg-[#080a12]/90 backdrop-blur-xl p-2.5 sm:p-3 sticky top-16 z-20">
        {isLoading ? (
          <div className="h-10 rounded-lg bg-white/[0.035] animate-pulse" />
        ) : (
          <div className="w-full flex flex-col md:flex-row items-stretch md:items-center gap-2.5 min-w-0">
            {/* Search Input: Flexible width with min-w-0 */}
            <label className="flex-1 min-w-0 flex items-center gap-2.5 h-9.5 px-3 rounded-lg border border-white/[0.08] bg-black/20 focus-within:border-primary/35 focus-within:shadow-[0_0_0_3px_rgba(0,229,255,0.05)] transition-all">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search candidates by name, path, or reason..."
                className="w-full min-w-0 bg-transparent outline-none text-xs text-white placeholder:text-muted-foreground/60"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="p-1 hover:text-white text-muted-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </label>

            {/* Filter Dropdowns: Wrap on mobile, stay inline on desktop */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
              <label className="flex-1 sm:flex-none h-9.5 px-2.5 rounded-lg border border-white/[0.08] bg-black/20 flex items-center gap-2 min-w-[120px]">
                <span className="cg-label !text-[8.5px] shrink-0">Type</span>
                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  className="bg-transparent outline-none font-mono text-[11px] text-foreground cursor-pointer w-full pr-1"
                >
                  <option value="all" className="bg-[#090c13] text-white">All Types</option>
                  <option value="file" className="bg-[#090c13] text-white">File</option>
                  <option value="function" className="bg-[#090c13] text-white">Function</option>
                  <option value="method" className="bg-[#090c13] text-white">Method</option>
                  <option value="class" className="bg-[#090c13] text-white">Class</option>
                  <option value="variable" className="bg-[#090c13] text-white">Variable</option>
                </select>
              </label>

              <label className="flex-1 sm:flex-none h-9.5 px-2.5 rounded-lg border border-white/[0.08] bg-black/20 flex items-center gap-2 min-w-[130px]">
                <span className="cg-label !text-[8.5px] shrink-0">Confidence</span>
                <select
                  value={confidenceFilter}
                  onChange={(event) => setConfidenceFilter(event.target.value)}
                  className="bg-transparent outline-none font-mono text-[11px] text-foreground cursor-pointer w-full pr-1"
                >
                  <option value="all" className="bg-[#090c13] text-white">All Confidence</option>
                  <option value="high" className="bg-[#090c13] text-white">High</option>
                  <option value="medium" className="bg-[#090c13] text-white">Medium</option>
                  <option value="low" className="bg-[#090c13] text-white">Low</option>
                </select>
              </label>
            </div>
          </div>
        )}
      </section>

      {/* ── Candidate Results List ── */}
      <section className="w-full space-y-3 pb-8">
        {!isLoading && !error && projectCandidates.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-1">
            <span className="font-mono text-[11px] text-muted-foreground">
              Showing{" "}
              <strong className="text-white font-medium">
                {filteredItems.length}
              </strong>{" "}
              candidate{filteredItems.length === 1 ? "" : "s"}
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[9.5px] text-muted-foreground">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-300/75 shrink-0" />
              Conservative deterministic analysis
            </span>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-2.5 w-full">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-28 rounded-xl border border-white/[0.05] bg-white/[0.025] animate-pulse p-4"
              >
                <div className="w-1/3 h-4 rounded bg-white/[0.05]" />
                <div className="mt-3 w-2/3 h-3 rounded bg-white/[0.035]" />
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error State */
          <div className="min-h-64 rounded-2xl border border-rose-500/20 bg-rose-500/[0.03] flex items-center justify-center text-center p-6">
            <div>
              <span className="mx-auto w-12 h-12 rounded-xl border border-rose-500/25 bg-rose-500/[0.06] flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-300" />
              </span>
              <h2 className="mt-4 text-base font-medium text-white">
                Failed to analyze dead code
              </h2>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
                {error}
              </p>
              <button
                type="button"
                onClick={() => void loadData()}
                className="mt-4 h-8.5 px-4 rounded-lg border border-rose-400/25 bg-rose-400/[0.08] text-rose-200 text-xs hover:bg-rose-400/[0.15] transition-colors"
              >
                Retry Analysis
              </button>
            </div>
          </div>
        ) : !activeProjectId ? (
          /* No Active Project Selected */
          <div className="min-h-64 rounded-2xl border border-white/[0.06] bg-white/[0.012] flex items-center justify-center text-center p-6">
            <div>
              <span className="mx-auto w-12 h-12 rounded-xl border border-primary/20 bg-primary/[0.05] flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-primary" />
              </span>
              <h2 className="mt-4 text-base font-medium text-white">
                No active project selected
              </h2>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
                Please select a project from the context selector above to begin
                dead code analysis.
              </p>
              <button
                type="button"
                onClick={() => setProjectOpen(true)}
                className="mt-4 h-8.5 px-4 rounded-lg border border-primary/25 bg-primary/[0.05] text-primary text-xs hover:bg-primary/[0.1] transition-colors"
              >
                Select Project
              </button>
            </div>
          </div>
        ) : projectCandidates.length === 0 ? (
          /* Empty State: No dead code found */
          <div className="min-h-64 rounded-2xl border border-white/[0.06] bg-white/[0.012] flex items-center justify-center text-center p-6">
            <div>
              <span className="mx-auto w-12 h-12 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-300" />
              </span>
              <h2 className="mt-4 text-base font-medium text-white">
                No potential dead code found
              </h2>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
                The current project does not contain any candidates based on
                the available relationship analysis.
              </p>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          /* Empty State: Filters returned 0 */
          <div className="min-h-64 rounded-2xl border border-white/[0.06] bg-white/[0.012] flex items-center justify-center text-center p-6">
            <div>
              <Search className="w-6 h-6 mx-auto text-muted-foreground" />
              <h2 className="mt-3 text-base font-medium text-white">
                No matching candidates
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Try adjusting your search query or filter options.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-3.5 h-8.5 px-4 rounded-lg border border-primary/25 bg-primary/[0.05] text-primary text-xs hover:bg-primary/[0.1] transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        ) : (
          /* Candidate Cards List: Fully constrained inside container */
          <div className="space-y-2.5 w-full">
            {filteredItems.map((item: DeadCodeItem, index: number) => {
              const typeKey = item.entity_type.toLowerCase();
              const meta = TYPE_META[typeKey] || DEFAULT_TYPE_META;
              const Icon = meta.icon;
              const selected = selectedId === item.id;
              const lines = formatLines(item.start_line, item.end_line);
              const confKey = item.confidence.toLowerCase();
              const confStyle =
                CONFIDENCE_META[confKey] || CONFIDENCE_META.low;

              return (
                <article
                  key={item.id}
                  onClick={() =>
                    setSelectedId(selected ? null : item.id)
                  }
                  className={cn(
                    "group relative rounded-xl border p-3.5 sm:p-4 transition-all duration-200 cursor-pointer w-full min-w-0 box-border overflow-hidden",
                    selected
                      ? "border-primary/35 bg-gradient-to-r from-primary/[0.065] to-transparent shadow-[0_0_24px_-15px_rgba(0,229,255,.65)]"
                      : "border-white/[0.065] bg-gradient-to-r from-white/[0.022] to-white/[0.008] hover:border-primary/20 hover:bg-white/[0.032]"
                  )}
                  style={{ ["--d" as string]: `${Math.min(index, 10) * 30}ms` }}
                >
                  {selected && (
                    <span className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full bg-primary shadow-[0_0_8px_#00e5ff]" />
                  )}
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-3.5 w-full min-w-0">
                    <span
                      className={cn(
                        "w-9 h-9 sm:w-10 sm:h-10 rounded-lg border flex items-center justify-center shrink-0",
                        meta.surface
                      )}
                    >
                      <Icon className={cn("w-4 h-4 sm:w-[18px] sm:h-[18px]", meta.tone)} />
                    </span>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
                        <h3 className="font-mono text-xs sm:text-sm font-medium text-white break-all">
                          {item.name}
                        </h3>
                        <span
                          className={cn(
                            "font-mono text-[8.5px] tracking-[0.12em] px-1.5 py-0.5 rounded border shrink-0",
                            meta.surface,
                            meta.tone
                          )}
                        >
                          {item.entity_type.toUpperCase()}
                        </span>
                        <span
                          className={cn(
                            "font-mono text-[8.5px] tracking-[0.1em] px-1.5 py-0.5 rounded border shrink-0",
                            confStyle
                          )}
                        >
                          {item.confidence.toUpperCase()} CONFIDENCE
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10.5px] text-muted-foreground min-w-0">
                        <span className="text-sky-200/80 break-all">{item.file_path}</span>
                        {lines && (
                          <>
                            <span className="text-white/15">·</span>
                            <span className="shrink-0">{lines}</span>
                          </>
                        )}
                      </div>

                      <p className="pt-1 text-xs leading-relaxed text-muted-foreground break-words max-w-3xl">
                        {item.reason}
                      </p>
                    </div>

                    <div
                      className="flex flex-wrap sm:flex-col lg:flex-row gap-1.5 shrink-0 pt-2 sm:pt-0"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Link
                        href={buildSourceLocationUrl({
                          projectId: activeProjectId,
                          fileId: item.file_id,
                          filePath: item.file_path,
                          startLine: item.start_line,
                          endLine: item.end_line,
                        })}
                        onClick={() =>
                          showToast(
                            `Opening ${item.file_path}${lines ? ` · ${lines}` : ""}`
                          )
                        }
                        className="h-8 px-2.5 sm:px-3 rounded-md border border-white/[0.09] text-[11px] text-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/[0.04] transition-all flex items-center justify-center gap-1.5 shrink-0"
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        <span>View File</span>
                      </Link>
                      <Link
                        href={
                          item.entity_type.toLowerCase() === "file"
                            ? `/graph?projectId=${activeProjectId}&fileId=${item.file_id}`
                            : `/graph?projectId=${activeProjectId}&entityId=${item.id.replace(
                                "entity_",
                                ""
                              )}`
                        }
                        onClick={() =>
                          showToast(`Exploring graph for ${item.name}`)
                        }
                        className="h-8 px-2.5 sm:px-3 rounded-md border border-white/[0.09] text-[11px] text-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/[0.04] transition-all flex items-center justify-center gap-1.5 shrink-0"
                      >
                        <Network className="w-3.5 h-3.5" />
                        <span>Explore Graph</span>
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Floating Action Toast: Clamped to viewport width */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3.5 py-2 rounded-full border border-primary/20 bg-[#0a0d16]/95 backdrop-blur-xl shadow-[0_0_30px_-10px_rgba(0,229,255,0.4)] font-mono text-xs text-foreground pointer-events-none max-w-[90vw] truncate cg-pop">
          <ArrowUpRight className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="truncate">{toast}</span>
        </div>
      )}
    </div>
  );
}

function DeadCodeSkeleton() {
  return (
    <div className="w-full max-w-none box-border min-w-0 overflow-x-hidden space-y-6 sm:space-y-8 animate-pulse">
      <div className="h-16 w-1/3 rounded-lg bg-white/[0.04]" />
      <div className="border-y border-white/[0.06] py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-white/[0.035]" />
        ))}
      </div>
      <div className="h-10 rounded-xl bg-white/[0.035]" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-white/[0.025]" />
        ))}
      </div>
    </div>
  );
}

export default function DeadCodePage() {
  return (
    <Suspense fallback={<DeadCodeSkeleton />}>
      <DeadCodePageInner />
    </Suspense>
  );
}
