"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  Braces,
  Check,
  CheckCircle2,
  ChevronDown,
  Filter,
  FolderOpen,
  FunctionSquare,
  Gauge,
  Network,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
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
import { getProjectComplexity } from "@/services/complexity";
import type { ComplexityResponse } from "@/types/complexity";

const SEVERITY_META: Record<
  string,
  {
    badge: string;
    number: string;
    icon: React.ComponentType<{ className?: string }>;
    edge: string;
  }
> = {
  high: {
    badge: "text-rose-300 border-rose-400/25 bg-rose-400/[0.055]",
    number: "text-rose-300",
    icon: AlertTriangle,
    edge: "bg-rose-400",
  },
  medium: {
    badge: "text-amber-200 border-amber-400/25 bg-amber-400/[0.05]",
    number: "text-amber-200",
    icon: Gauge,
    edge: "bg-amber-300",
  },
  low: {
    badge: "text-sky-300 border-sky-400/20 bg-sky-400/[0.045]",
    number: "text-cyan-400",
    icon: ShieldCheck,
    edge: "bg-cyan-400",
  },
};

const DEFAULT_SEVERITY_META = {
  badge: "text-sky-300 border-sky-400/20 bg-sky-400/[0.045]",
  number: "text-cyan-400",
  icon: ShieldCheck,
  edge: "bg-cyan-400",
};

function ComplexityPageInner() {
  const {
    projects,
    activeProjectId,
    activeProject,
    isLoadingProjects,
    selectProject,
  } = useActiveProject();

  const [data, setData] = useState<ComplexityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  // Selection & UI state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Load complexity data
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
      setError(
        err instanceof Error
          ? err.message
          : "Failed to analyze code complexity."
      );
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [activeProjectId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Calculate metrics for the horizontal strip
  const summary = useMemo(() => {
    const items = data?.items ?? [];
    const total = data?.summary?.total_items ?? items.length;
    const high =
      data?.summary?.high_complexity ??
      items.filter((i) => i.severity.toLowerCase() === "high").length;
    const medium =
      data?.summary?.medium_complexity ??
      items.filter((i) => i.severity.toLowerCase() === "medium").length;
    const low =
      data?.summary?.low_complexity ??
      items.filter((i) => i.severity.toLowerCase() === "low").length;
    const max =
      data?.summary?.max_complexity ??
      (items.length ? Math.max(...items.map((i) => i.complexity)) : 0);

    return { total, high, medium, low, max };
  }, [data]);

  const maxTone = useMemo(() => {
    if (summary.max >= 13) return "text-rose-300";
    if (summary.max >= 7) return "text-amber-200";
    if (summary.max > 0) return "text-cyan-400";
    return "text-muted-foreground";
  }, [summary.max]);

  // Filter items based on search and selected filters
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    const q = searchQuery.trim().toLowerCase();

    return data.items.filter((item) => {
      if (
        typeFilter !== "all" &&
        item.entity_type.toLowerCase() !== typeFilter.toLowerCase()
      ) {
        return false;
      }
      if (
        severityFilter !== "all" &&
        item.severity.toLowerCase() !== severityFilter.toLowerCase()
      ) {
        return false;
      }
      if (q) {
        const matchName = item.name.toLowerCase().includes(q);
        const matchPath = item.file_path.toLowerCase().includes(q);
        if (!matchName && !matchPath) return false;
      }
      return true;
    });
  }, [data?.items, searchQuery, typeFilter, severityFilter]);

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setSeverityFilter("all");
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

  return (
    <div className="max-w-[1500px] mx-auto px-3 md:px-6 lg:px-8 py-7 md:py-10 space-y-6 md:space-y-7">
      {/* ── 1. Page Header matching Figma Design ── */}
      <section className="relative z-30 reveal" style={{ ["--d" as string]: "80ms" }}>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_#00e5ff]" />
              <span className="cg-label">CODEGRAPH AI / CODE QUALITY</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl md:text-[54px] leading-none font-bold tracking-[-0.035em] text-white">
                Complexity Analysis
              </h1>
              <Gauge className="hidden md:block w-7 h-7 text-primary/70" strokeWidth={1.5} />
            </div>
            <p className="text-muted-foreground text-[14px] md:text-[15px] mt-3 max-w-3xl">
              Identify potentially complex functions and methods using cyclomatic complexity metrics and size warnings.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={isLoading || isLoadingProjects}
            className="h-10 px-3.5 rounded-lg border border-white/[0.1] bg-white/[0.025] text-[12px] font-mono text-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/[0.045] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer self-start lg:self-auto"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
            <span>Refresh</span>
          </button>
        </div>

        {/* ── 2. Active Project Context Bar matching Figma ── */}
        <div className="mt-6 py-3 px-3 md:px-4 rounded-xl border border-white/[0.065] bg-white/[0.018] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 font-mono text-[10.5px] text-muted-foreground">
            <span
              className={cn(
                "w-7 h-7 rounded-md border flex items-center justify-center",
                (data?.items?.length ?? 0) > 0
                  ? "border-primary/20 bg-primary/[0.05]"
                  : "border-emerald-400/20 bg-emerald-400/[0.05]"
              )}
            >
              {(data?.items?.length ?? 0) > 0 ? (
                <Gauge className="w-3.5 h-3.5 text-primary" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              )}
            </span>
            <span>
              <span className="text-foreground font-medium">
                {(data?.items?.length ?? 0) > 0 ? "Analysis complete" : "No issues detected"}
              </span>{" "}
              · cyclomatic control-flow analysis
            </span>
          </div>

          <div className="relative flex items-center gap-3" ref={projectDropdownRef}>
            <span className="cg-label !text-[8.5px] text-[#7d8aa0] hidden sm:inline">
              ACTIVE PROJECT CONTEXT
            </span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setProjectDropdownOpen((open) => !open)}
                className={cn(
                  "flex items-center gap-2.5 h-9 pl-3 pr-2.5 rounded-lg border bg-black/25 transition-all text-[12px] cursor-pointer",
                  projectDropdownOpen
                    ? "border-primary/40 shadow-[0_0_0_3px_rgba(0,229,255,0.06),0_0_20px_-5px_rgba(0,229,255,0.3)]"
                    : "border-white/[0.08] hover:border-white/20"
                )}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_5px_#00e5ff] shrink-0" />
                  <span className="text-white font-medium truncate max-w-[140px] sm:max-w-[180px]">
                    {activeProject?.name ?? "Select Project"}
                  </span>
                  <span className="font-mono text-[10.5px] text-muted-foreground shrink-0">
                    #{activeProjectId ?? "—"}
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 shrink-0",
                    projectDropdownOpen && "rotate-180 text-primary"
                  )}
                />
              </button>

              {projectDropdownOpen && (
                <div
                  className="absolute top-full right-0 mt-2 w-72 sm:w-80 max-h-80 overflow-y-auto p-1.5 rounded-xl border border-cyan-300/15 bg-[#0a0d16]/95 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] z-50 cg-pop"
                  style={{
                    backgroundColor: "#090e17",
                    border: "1px solid rgba(100, 150, 180, 0.25)",
                    boxShadow: "0 12px 35px rgba(0,0,0,0.45)",
                    zIndex: 1000,
                  }}
                >
                  <div className="cg-label px-2.5 pt-1.5 pb-2 !text-[9px] text-[#7d8aa0]">
                    SWITCH PROJECT
                  </div>
                  <div className="space-y-1">
                    {projects.length === 0 ? (
                      <div className="px-2.5 py-2 text-xs text-muted-foreground italic">
                        No projects available
                      </div>
                    ) : (
                      projects.map((option) => {
                        const isSelected = option.id === activeProjectId;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                              selectProject(option.id);
                              setProjectDropdownOpen(false);
                              setSelectedId(null);
                              clearFilters();
                            }}
                            className={cn(
                              "relative w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer",
                              isSelected
                                ? "bg-primary/[0.08] text-white border border-primary/20"
                                : "hover:bg-white/[0.04] text-slate-300 border border-transparent"
                            )}
                          >
                            {isSelected && (
                              <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-primary" />
                            )}
                            <span className="flex-1 min-w-0">
                              <span className="block text-[12px] text-white truncate font-medium">
                                {option.name}{" "}
                                <span className="font-mono text-[10px] text-muted-foreground font-normal">
                                  (#{option.id})
                                </span>
                              </span>
                              <span className="block font-mono text-[9.5px] text-muted-foreground truncate">
                                {option.github_url ||
                                  option.default_branch ||
                                  "Local repository"}
                              </span>
                            </span>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-primary shrink-0" />
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
        </div>
      </section>

      {/* Error notification banner */}
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-mono text-rose-200 flex items-center gap-3">
          <AlertTriangle className="size-4 shrink-0 text-rose-400" />
          <div className="flex-1">
            <span className="font-semibold text-rose-100">Failed to analyze code complexity: </span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── 3. Complexity Overview Metrics Strip (Single Unified Horizontal Strip) ── */}
      <section
        className="relative rounded-xl border border-white/[0.08] bg-black/25 backdrop-blur-md overflow-hidden reveal"
        style={{ ["--d" as string]: "170ms" }}
      >
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-white/[0.06] animate-pulse">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="p-4 sm:p-5 h-20 bg-white/[0.02]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-[1.35fr_repeat(4,1fr)] divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
            {/* 1. TOTAL COMPLEX FUNCTIONS */}
            <div className="col-span-2 md:col-span-1 p-4 sm:p-5 bg-gradient-to-r from-cyan-500/[0.04] to-transparent relative">
              <div className="flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-primary" />
                <span className="cg-label !text-[9px] text-[#7d8aa0]">TOTAL COMPLEX FUNCTIONS</span>
              </div>
              <div className="mt-2 flex items-baseline gap-2.5">
                <span className="text-3xl md:text-5xl font-semibold tracking-[-0.045em] leading-none text-white tabular-nums">
                  {summary.total}
                </span>
                <span className="text-[12px] text-muted-foreground font-mono">functions / methods</span>
              </div>
            </div>

            {/* 2. HIGH COMPLEXITY */}
            <div className="p-4 sm:p-5">
              <div className="flex items-center gap-1.5 text-rose-300">
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                <span className="cg-label !text-[8.5px] text-rose-300">HIGH COMPLEXITY</span>
              </div>
              <div className="mt-2 text-2xl font-semibold tabular-nums text-rose-300">
                {summary.high}
              </div>
            </div>

            {/* 3. MEDIUM COMPLEXITY */}
            <div className="p-4 sm:p-5">
              <div className="flex items-center gap-1.5 text-amber-200">
                <Gauge className="w-3 h-3 text-amber-300" />
                <span className="cg-label !text-[8.5px] text-amber-200">MEDIUM COMPLEXITY</span>
              </div>
              <div className="mt-2 text-2xl font-semibold tabular-nums text-amber-200">
                {summary.medium}
              </div>
            </div>

            {/* 4. LOW COMPLEXITY */}
            <div className="p-4 sm:p-5">
              <div className="flex items-center gap-1.5 text-sky-300">
                <ShieldCheck className="w-3 h-3 text-cyan-400" />
                <span className="cg-label !text-[8.5px] text-sky-300">LOW COMPLEXITY</span>
              </div>
              <div className="mt-2 text-2xl font-semibold tabular-nums text-sky-300">
                {summary.low}
              </div>
            </div>

            {/* 5. MAXIMUM COMPLEXITY */}
            <div className="p-4 sm:p-5">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3 text-primary" />
                <span className="cg-label !text-[8.5px] text-[#7d8aa0]">MAXIMUM COMPLEXITY</span>
              </div>
              <div className={cn("mt-2 text-2xl font-semibold tabular-nums", maxTone)}>
                {summary.max > 0 ? summary.max : "—"}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── 4. Search and Filters Bar ── */}
      <section
        className="sticky top-14 z-20 rounded-xl border border-white/[0.08] bg-[#080a12]/90 backdrop-blur-xl p-2.5 sm:p-3 reveal"
        style={{ ["--d" as string]: "250ms" }}
      >
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Left: Search input */}
          <label className="flex-1 flex items-center gap-2.5 h-10 px-3 rounded-lg border border-white/[0.08] bg-black/20 focus-within:border-cyan-400/40 focus-within:shadow-[0_0_0_3px_rgba(0,229,255,0.06)] transition-all cursor-text">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search functions by name or file path..."
              className="w-full min-w-0 bg-transparent outline-none text-[13px] text-white placeholder:text-muted-foreground/60 font-mono"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="text-muted-foreground hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </label>

          {/* Right: Type & Severity filters */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <label className="h-10 px-3 rounded-lg border border-white/[0.08] bg-black/20 flex items-center gap-2 text-xs focus-within:border-cyan-400/40 transition-all">
              <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="cg-label !text-[8.5px] text-[#7d8aa0]">TYPE</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-[#090c13] text-foreground text-[11px] font-mono outline-none cursor-pointer pr-1"
              >
                <option value="all">All Types</option>
                <option value="function">Functions</option>
                <option value="method">Methods</option>
              </select>
            </label>

            <label className="h-10 px-3 rounded-lg border border-white/[0.08] bg-black/20 flex items-center gap-2 text-xs focus-within:border-cyan-400/40 transition-all">
              <Gauge className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="cg-label !text-[8.5px] text-[#7d8aa0]">SEVERITY</span>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-[#090c13] text-foreground text-[11px] font-mono outline-none cursor-pointer pr-1"
              >
                <option value="all">All Severities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      {/* ── 5. Results Section ── */}
      <section className="space-y-3">
        {!isLoading && (data?.items?.length ?? 0) > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 text-muted-foreground">
            <span className="font-mono text-[11px]">
              Showing <strong className="text-white font-medium">{filteredItems.length}</strong> analyzed {filteredItems.length === 1 ? "function / method" : "functions / methods"}
            </span>
            <span className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
              <Gauge className="w-3.5 h-3.5 text-primary/70" />
              Cyclomatic control-flow analysis
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={idx}
                className="h-24 rounded-xl border border-white/[0.05] bg-white/[0.02] animate-pulse p-4 flex items-center justify-between"
              >
                <div className="space-y-2.5 w-1/2">
                  <div className="h-4 w-48 rounded bg-white/[0.05]" />
                  <div className="h-3 w-72 rounded bg-white/[0.03]" />
                </div>
                <div className="h-8 w-32 rounded bg-white/[0.04]" />
              </div>
            ))}
          </div>
        ) : !activeProjectId ? (
          <div className="min-h-72 rounded-2xl border border-white/[0.06] bg-white/[0.012] flex items-center justify-center text-center px-6 py-12">
            <div>
              <Gauge className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-[17px] font-medium text-white">Select a Project</h3>
              <p className="mt-1.5 max-w-md text-[12.5px] leading-relaxed text-muted-foreground mx-auto">
                Choose an active project context to inspect cyclomatic complexity metrics and size warnings.
              </p>
            </div>
          </div>
        ) : (data?.items?.length ?? 0) === 0 ? (
          <div className="min-h-72 rounded-2xl border border-white/[0.06] bg-white/[0.012] flex items-center justify-center text-center px-6 py-12">
            <div>
              <span className="mx-auto w-12 h-12 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6 text-emerald-300" />
              </span>
              <h3 className="text-[17px] font-medium text-white">No Complexity Issues Detected</h3>
              <p className="mt-1.5 max-w-md text-[12.5px] leading-relaxed text-muted-foreground mx-auto">
                All analyzed functions and methods are below the configured complexity threshold.
              </p>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="min-h-64 rounded-2xl border border-white/[0.06] bg-white/[0.012] flex items-center justify-center text-center px-6 py-10">
            <div>
              <Search className="w-7 h-7 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-[16px] font-medium text-white">No matching functions</h3>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Try adjusting your search, type, or severity filter.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 h-8 px-3.5 rounded-lg border border-primary/30 bg-primary/[0.06] text-primary text-[11px] font-mono hover:bg-primary/[0.12] transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item, index) => {
              const severityKey = item.severity.toLowerCase();
              const meta = SEVERITY_META[severityKey] ?? DEFAULT_SEVERITY_META;
              const isMethod = item.entity_type.toLowerCase() === "method";
              const Icon = isMethod ? Braces : FunctionSquare;
              const SeverityIcon = meta.icon;
              const selected = selectedId === String(item.entity_id);
              const isVeryLarge = item.size_warning === "very_large" || item.line_count > 100;
              const isLarge = !isVeryLarge && (item.size_warning === "large" || item.line_count > 50);

              return (
                <article
                  key={item.entity_id}
                  onClick={() => setSelectedId(String(item.entity_id))}
                  className={cn(
                    "group relative rounded-xl border px-4 py-3.5 md:px-5 transition-all duration-200 cursor-pointer reveal",
                    selected
                      ? "border-primary/40 bg-gradient-to-r from-primary/[0.08] via-white/[0.02] to-transparent shadow-[0_0_24px_-12px_rgba(0,229,255,.5)]"
                      : "border-white/[0.065] bg-gradient-to-r from-white/[0.022] to-white/[0.008] hover:border-primary/25 hover:bg-white/[0.035]"
                  )}
                  style={{ ["--d" as string]: `${Math.min(index, 10) * 28}ms` }}
                >
                  {/* Left severity accent edge */}
                  <span
                    className={cn(
                      "absolute left-0 top-3 bottom-3 w-[2.5px] rounded-full transition-opacity",
                      meta.edge,
                      selected ? "opacity-100 shadow-[0_0_8px_currentColor]" : "opacity-40 group-hover:opacity-80"
                    )}
                  />

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left section: Icon, Name, Badges, File & Lines */}
                    <div className="flex items-start md:items-center gap-3.5 min-w-0 flex-1">
                      <span className="w-9 h-9 rounded-lg border border-white/[0.08] bg-black/20 flex items-center justify-center shrink-0 mt-0.5 md:mt-0">
                        <Icon className={cn("w-4 h-4", isMethod ? "text-emerald-300" : "text-primary")} />
                      </span>

                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-mono text-[14px] md:text-[15px] font-semibold text-white truncate max-w-full">
                            {item.name}
                          </h3>
                          <span className="font-mono text-[8.5px] tracking-[0.11em] px-2 py-0.5 rounded border border-white/[0.08] text-muted-foreground bg-white/[0.02] uppercase">
                            {item.entity_type}
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 font-mono text-[8.5px] tracking-[0.1em] px-2 py-0.5 rounded border font-semibold uppercase",
                              meta.badge
                            )}
                          >
                            <SeverityIcon className="w-2.5 h-2.5" />
                            {item.severity} SEVERITY
                          </span>
                          {isVeryLarge ? (
                            <span className="font-mono text-[8.5px] tracking-[0.08em] px-2 py-0.5 rounded border border-purple-400/25 bg-purple-400/[0.05] text-purple-200">
                              VERY LARGE (&gt; 100 LINES)
                            </span>
                          ) : isLarge ? (
                            <span className="font-mono text-[8.5px] tracking-[0.08em] px-2 py-0.5 rounded border border-amber-400/25 bg-amber-400/[0.05] text-amber-200">
                              LARGE (&gt; 50 LINES)
                            </span>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
                          <span className="text-sky-200/80 truncate max-w-sm sm:max-w-md">{item.file_path}</span>
                          <span className="text-white/20">·</span>
                          <span>
                            L{item.start_line}–{item.end_line}
                          </span>
                          <span className="text-white/20">·</span>
                          <span>{item.line_count} lines</span>
                        </div>
                      </div>
                    </div>

                    {/* Right section: Complexity score and Action buttons */}
                    <div className="flex items-center md:justify-end gap-5 shrink-0 self-end md:self-center">
                      <div className="min-w-[72px] text-center">
                        <span className="cg-label !text-[8px] text-[#7d8aa0] block">COMPLEXITY</span>
                        <span
                          className={cn(
                            "mt-0.5 text-2xl md:text-3xl font-bold tracking-tight block tabular-nums transition-all group-hover:brightness-125",
                            meta.number
                          )}
                        >
                          {item.complexity}
                        </span>
                      </div>

                      <div
                        className="flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link
                          href={buildSourceLocationUrl({
                            projectId: activeProjectId,
                            fileId: item.file_id,
                            filePath: item.file_path,
                            startLine: item.start_line,
                            endLine: item.end_line,
                          })}
                          title="View file"
                          onClick={() => showToast(`Opening ${item.file_path} · L${item.start_line}–${item.end_line}`)}
                          className="h-8 px-2.5 rounded-lg border border-white/[0.09] bg-white/[0.02] text-[11px] font-mono text-foreground hover:text-cyan-300 hover:border-cyan-400/30 hover:bg-cyan-500/[0.06] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <FolderOpen className="w-3.5 h-3.5 text-muted-foreground group-hover:text-cyan-400" />
                          <span className="hidden sm:inline">View File</span>
                        </Link>

                        <Link
                          href={`/graph?projectId=${activeProjectId}&entityId=${item.entity_id}`}
                          title="Explore graph"
                          onClick={() => showToast(`Exploring graph for ${item.name}`)}
                          className="h-8 px-2.5 rounded-lg border border-white/[0.09] bg-white/[0.02] text-[11px] font-mono text-foreground hover:text-cyan-300 hover:border-cyan-400/30 hover:bg-cyan-500/[0.06] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Network className="w-3.5 h-3.5 text-muted-foreground group-hover:text-cyan-400" />
                          <span className="hidden sm:inline">Explore Graph</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Floating feedback toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-full border border-primary/20 bg-[#0a0d16]/90 backdrop-blur-xl shadow-[0_0_30px_-10px_rgba(0,229,255,0.4)] font-mono text-[12px] text-foreground cg-pop">
          <ArrowUpRight className="w-3.5 h-3.5 text-primary" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

export default function ComplexityPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-[1500px] mx-auto px-4 py-12 text-center text-muted-foreground font-mono text-xs">
          Loading complexity analysis...
        </div>
      }
    >
      <ComplexityPageInner />
    </Suspense>
  );
}
