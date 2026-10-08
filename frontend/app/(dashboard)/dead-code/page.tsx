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
    <div className="max-w-[1500px] mx-auto px-3 md:px-6 lg:px-8 py-4 md:py-6 text-foreground">
      {/* ── 1. Page Header matching Figma Design ── */}
      <section
        className="relative z-30 flex flex-col lg:flex-row lg:items-end justify-between gap-6 reveal"
        style={{ ["--d" as string]: "80ms" }}
      >
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,.65)]" />
            <span className="cg-label">CodeGraph AI / Code Quality</span>
          </div>
          <h1 className="text-4xl md:text-[54px] leading-none font-bold tracking-[-0.035em] text-white">
            Dead Code Detection
          </h1>
          <p className="text-muted-foreground text-[14px] md:text-[15px] mt-3 max-w-3xl">
            Identify potentially unreachable files, classes, functions, methods,
            and variables using knowledge-graph analysis.
          </p>
        </div>

        {/* ── Active Project Context & Refresh ── */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-2.5">
          <div className="relative" ref={projectRef}>
            <div className="cg-label mb-2">Active Project Context</div>
            <button
              type="button"
              onClick={() => setProjectOpen((open) => !open)}
              className={cn(
                "flex items-center gap-3 justify-between w-full sm:w-64 h-10 pl-3 pr-2.5 rounded-lg border bg-white/[0.02] transition-all text-[13px]",
                projectOpen
                  ? "border-primary/40 shadow-[0_0_0_3px_rgba(0,229,255,0.06),0_0_24px_-6px_rgba(0,229,255,0.35)]"
                  : "border-white/[0.08] hover:border-white/20"
              )}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_#00e5ff]" />
                <span className="text-white font-medium truncate">
                  {activeProject?.name ?? "Select Project"}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  #{activeProjectId ?? "—"}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform",
                  projectOpen && "rotate-180 text-primary"
                )}
              />
            </button>
            {projectOpen && (
              <div className="absolute top-full right-0 mt-2 w-full sm:w-72 max-h-80 overflow-y-auto p-1.5 rounded-xl border border-cyan-300/15 bg-[#0a0d16]/95 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] z-50 cg-pop">
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
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={isLoading || isLoadingProjects}
            className="h-10 px-3.5 rounded-lg border border-white/[0.1] bg-white/[0.025] text-[12px] text-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/[0.045] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <RefreshCw
              className={cn("w-3.5 h-3.5", isLoading && "animate-spin")}
            />
            <span>Refresh</span>
          </button>
        </div>
      </section>

      {/* ── 2. Dead Code Overview (Single Integrated Horizontal Strip) ── */}
      <section className="mt-8 reveal" style={{ ["--d" as string]: "170ms" }}>
        {isLoading ? (
          <div className="border-y border-white/[0.06] py-5 grid grid-cols-2 md:grid-cols-5 gap-4 animate-pulse">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-16 rounded-lg bg-white/[0.035]" />
            ))}
          </div>
        ) : (
          <div className="relative border-y border-white/[0.06] grid grid-cols-2 md:grid-cols-[1.45fr_repeat(4,1fr)]">
            <div className="relative col-span-2 md:col-span-1 px-3 md:px-5 py-5 border-b md:border-b-0 md:border-r border-white/[0.06] bg-gradient-to-r from-rose-500/[0.045] to-transparent">
              <div className="cg-label !text-[9px]">Dead Code Overview</div>
              <div className="mt-2 flex items-end gap-3">
                <span className="text-5xl font-semibold tracking-[-0.045em] leading-none text-white tabular-nums">
                  {counts.total}
                </span>
                <span className="pb-1 text-[12px] text-muted-foreground">
                  Potential dead items
                </span>
              </div>
            </div>
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
            ].map(({ label, value, icon: Icon, tone }, index) => (
              <div
                key={label}
                className={cn(
                  "px-3 md:px-5 py-5",
                  index % 2 === 1 && "border-l md:border-l-0",
                  index > 0 && "md:border-l",
                  "border-white/[0.06]"
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn("w-3.5 h-3.5", tone)} />
                  <span className="cg-label !text-[8.5px]">{label}</span>
                </div>
                <div className="mt-2 text-2xl font-semibold text-white tabular-nums">
                  {value}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 3. Search + Filters Row (Frosted Glass Control Area) ── */}
      <section
        className="mt-6 sticky top-14 z-20 rounded-xl border border-white/[0.07] bg-[#080a12]/90 backdrop-blur-xl p-3 reveal"
        style={{ ["--d" as string]: "260ms" }}
      >
        {isLoading ? (
          <div className="h-10 rounded-lg bg-white/[0.035] animate-pulse" />
        ) : (
          <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
            <label className="flex-1 flex items-center gap-2.5 h-10 px-3 rounded-lg border border-white/[0.08] bg-black/15 focus-within:border-primary/35 focus-within:shadow-[0_0_0_3px_rgba(0,229,255,0.05)] transition-all">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search candidates by name, path, or reason..."
                className="w-full min-w-0 bg-transparent outline-none text-[13px] text-white placeholder:text-muted-foreground/60"
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

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
              <label className="h-10 px-3 rounded-lg border border-white/[0.08] bg-black/15 flex items-center gap-2">
                <span className="cg-label !text-[8.5px] shrink-0">Type</span>
                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  className="bg-[#090c13] outline-none font-mono text-[10.5px] text-foreground cursor-pointer pr-1"
                >
                  <option value="all">All Types</option>
                  <option value="file">File</option>
                  <option value="function">Function</option>
                  <option value="method">Method</option>
                  <option value="class">Class</option>
                  <option value="variable">Variable</option>
                </select>
              </label>

              <label className="h-10 px-3 rounded-lg border border-white/[0.08] bg-black/15 flex items-center gap-2">
                <span className="cg-label !text-[8.5px] shrink-0">Confidence</span>
                <select
                  value={confidenceFilter}
                  onChange={(event) => setConfidenceFilter(event.target.value)}
                  className="bg-[#090c13] outline-none font-mono text-[10.5px] text-foreground cursor-pointer pr-1"
                >
                  <option value="all">All Confidence</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>
            </div>
          </div>
        )}
      </section>

      {/* ── 4. Analysis Status Row & Candidate List ── */}
      <section className="mt-5 mb-8">
        {!isLoading && !error && projectCandidates.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 px-1">
            <span className="font-mono text-[11px] text-muted-foreground">
              Showing{" "}
              <strong className="text-white font-medium">
                {filteredItems.length}
              </strong>{" "}
              candidate{filteredItems.length === 1 ? "" : "s"}
            </span>
            <span className="flex items-center gap-2 font-mono text-[9.5px] text-muted-foreground">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-300/75 shrink-0" />
              Conservative deterministic analysis
            </span>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-32 rounded-xl border border-white/[0.05] bg-white/[0.025] animate-pulse p-4"
              >
                <div className="w-1/3 h-4 rounded bg-white/[0.05]" />
                <div className="mt-4 w-2/3 h-3 rounded bg-white/[0.035]" />
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error State */
          <div className="min-h-72 rounded-2xl border border-rose-500/20 bg-rose-500/[0.03] flex items-center justify-center text-center px-6 py-12">
            <div>
              <span className="mx-auto w-14 h-14 rounded-2xl border border-rose-500/25 bg-rose-500/[0.06] flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-rose-300" />
              </span>
              <h2 className="mt-5 text-[17px] font-medium text-white">
                Failed to analyze dead code
              </h2>
              <p className="mt-1.5 max-w-md text-[12.5px] leading-relaxed text-muted-foreground">
                {error}
              </p>
              <button
                type="button"
                onClick={() => void loadData()}
                className="mt-4 h-9 px-4 rounded-lg border border-rose-400/25 bg-rose-400/[0.08] text-rose-200 text-[12px] hover:bg-rose-400/[0.15] transition-colors"
              >
                Retry Analysis
              </button>
            </div>
          </div>
        ) : !activeProjectId ? (
          /* No Active Project Selected */
          <div className="min-h-80 rounded-2xl border border-white/[0.06] bg-white/[0.012] flex items-center justify-center text-center px-6 py-12">
            <div>
              <span className="mx-auto w-14 h-14 rounded-2xl border border-primary/20 bg-primary/[0.05] flex items-center justify-center">
                <ShieldAlert className="w-6 h-6 text-primary" />
              </span>
              <h2 className="mt-5 text-[17px] font-medium text-white">
                No active project selected
              </h2>
              <p className="mt-1.5 max-w-md text-[12.5px] leading-relaxed text-muted-foreground">
                Please select a project from the context selector above to begin
                dead code analysis.
              </p>
              <button
                type="button"
                onClick={() => setProjectOpen(true)}
                className="mt-4 h-9 px-4 rounded-lg border border-primary/25 bg-primary/[0.05] text-primary text-[12px] hover:bg-primary/[0.1] transition-colors"
              >
                Select Project
              </button>
            </div>
          </div>
        ) : projectCandidates.length === 0 ? (
          /* Empty State: No dead code found */
          <div className="min-h-80 rounded-2xl border border-white/[0.06] bg-white/[0.012] flex items-center justify-center text-center px-6 py-12">
            <div>
              <span className="mx-auto w-14 h-14 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-300" />
              </span>
              <h2 className="mt-5 text-[17px] font-medium text-white">
                No potential dead code found
              </h2>
              <p className="mt-1.5 max-w-md text-[12.5px] leading-relaxed text-muted-foreground">
                The current project does not contain any candidates based on
                the available relationship analysis.
              </p>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          /* Empty State: Filters returned 0 */
          <div className="min-h-72 rounded-2xl border border-white/[0.06] bg-white/[0.012] flex items-center justify-center text-center px-6 py-12">
            <div>
              <Search className="w-7 h-7 mx-auto text-muted-foreground" />
              <h2 className="mt-4 text-[16px] font-medium text-white">
                No matching candidates
              </h2>
              <p className="mt-1.5 text-[12px] text-muted-foreground">
                Try adjusting your search or filters.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 h-9 px-4 rounded-lg border border-primary/25 bg-primary/[0.05] text-primary text-[12px] hover:bg-primary/[0.1] transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        ) : (
          /* Candidate Rows List matching Figma Design */
          <div className="space-y-2.5">
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
                  onClick={() => setSelectedId(selected ? null : item.id)}
                  className={cn(
                    "group relative rounded-xl border px-4 py-4 md:px-5 transition-all duration-200 cursor-pointer reveal",
                    selected
                      ? "border-primary/35 bg-gradient-to-r from-primary/[0.065] to-transparent shadow-[0_0_24px_-15px_rgba(0,229,255,.65)]"
                      : "border-white/[0.065] bg-gradient-to-r from-white/[0.022] to-white/[0.008] hover:border-primary/20 hover:bg-white/[0.032] hover:shadow-[0_14px_35px_-28px_rgba(0,229,255,.5)]"
                  )}
                  style={{ ["--d" as string]: `${Math.min(index, 10) * 30}ms` }}
                >
                  {selected && (
                    <span className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full bg-primary shadow-[0_0_8px_#00e5ff]" />
                  )}
                  <div className="flex flex-col md:flex-row md:items-start gap-3.5">
                    <span
                      className={cn(
                        "w-10 h-10 rounded-lg border flex items-center justify-center shrink-0",
                        meta.surface
                      )}
                    >
                      <Icon className={cn("w-[18px] h-[18px]", meta.tone)} />
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-mono text-[14px] md:text-[15px] font-medium text-white break-all">
                          {item.name}
                        </h3>
                        <span
                          className={cn(
                            "font-mono text-[8.5px] tracking-[0.12em] px-2 py-0.5 rounded border shrink-0",
                            meta.surface,
                            meta.tone
                          )}
                        >
                          {item.entity_type.toUpperCase()}
                        </span>
                        <span
                          className={cn(
                            "font-mono text-[8.5px] tracking-[0.1em] px-2 py-0.5 rounded border shrink-0",
                            confStyle
                          )}
                        >
                          {item.confidence.toUpperCase()} CONFIDENCE
                        </span>
                      </div>

                      <div className="mt-1.5 flex items-center gap-2 font-mono text-[10.5px] text-muted-foreground">
                        <span className="text-sky-200/80 break-all">{item.file_path}</span>
                        {lines && (
                          <>
                            <span className="text-white/15">·</span>
                            <span className="shrink-0">{lines}</span>
                          </>
                        )}
                      </div>

                      <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted-foreground max-w-3xl">
                        {item.reason}
                      </p>
                    </div>

                    <div
                      className="flex md:flex-col xl:flex-row gap-1.5 md:opacity-70 group-hover:opacity-100 transition-opacity shrink-0 pt-2 md:pt-0"
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
                        className="h-8 px-3 rounded-md border border-white/[0.09] text-[11px] text-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/[0.04] transition-all flex items-center justify-center gap-1.5 shrink-0"
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
                        className="h-8 px-3 rounded-md border border-white/[0.09] text-[11px] text-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/[0.04] transition-all flex items-center justify-center gap-1.5 shrink-0"
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

      {/* ── 5. Floating Action Toast ── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-full border border-primary/20 bg-[#0a0d16]/90 backdrop-blur-xl shadow-[0_0_30px_-10px_rgba(0,229,255,0.4)] font-mono text-[12px] text-foreground cg-pop pointer-events-none">
          <ArrowUpRight className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

function DeadCodeSkeleton() {
  return (
    <div className="max-w-[1500px] mx-auto px-3 md:px-6 lg:px-8 py-4 md:py-6 space-y-8 animate-pulse">
      <div className="h-16 w-1/3 rounded-lg bg-white/[0.04]" />
      <div className="border-y border-white/[0.06] py-5 grid grid-cols-2 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-white/[0.035]" />
        ))}
      </div>
      <div className="h-12 rounded-xl bg-white/[0.035]" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-white/[0.025]" />
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
