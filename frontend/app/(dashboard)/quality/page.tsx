"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Box,
  Braces,
  Check,
  CheckCircle2,
  ChevronDown,
  FileCode2,
  FunctionSquare,
  Gauge,
  HeartPulse,
  RefreshCw,
  Repeat,
  ShieldCheck,
  Trash2,
  Variable,
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
import { getProjectCodeQuality } from "@/services/code_quality";
import type { CodeQualityResponse } from "@/types/code_quality";

function getGradeTheme(score: number, gradeStr?: string) {
  const g = (
    gradeStr ??
    (score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F")
  ).toUpperCase();

  switch (g) {
    case "A":
      return {
        grade: "A",
        tone: "text-emerald-300",
        border: "border-emerald-500/30",
        bg: "bg-emerald-500/[0.04]",
        badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
        bar: "from-emerald-500 to-emerald-300",
        shadow: "shadow-[0_0_18px_-8px_rgba(52,211,153,.55)]",
        glow: "bg-emerald-400",
        icon: CheckCircle2,
        message: "Excellent code health with minimal quality concerns.",
      };
    case "B":
      return {
        grade: "B",
        tone: "text-sky-300",
        border: "border-sky-500/30",
        bg: "bg-sky-500/[0.04]",
        badge: "bg-sky-500/20 text-sky-300 border-sky-500/40",
        bar: "from-sky-500 to-sky-300",
        shadow: "shadow-[0_0_18px_-8px_rgba(56,189,248,.45)]",
        glow: "bg-sky-400",
        icon: CheckCircle2,
        message: "Good code health with minor issues detected.",
      };
    case "C":
      return {
        grade: "C",
        tone: "text-amber-200",
        border: "border-amber-500/30",
        bg: "bg-amber-500/[0.04]",
        badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
        bar: "from-amber-500 to-amber-300",
        shadow: "shadow-[0_0_18px_-8px_rgba(251,191,36,.45)]",
        glow: "bg-amber-400",
        icon: Activity,
        message: "Moderate code health. Refactoring recommended.",
      };
    case "D":
      return {
        grade: "D",
        tone: "text-orange-300",
        border: "border-orange-500/30",
        bg: "bg-orange-500/[0.04]",
        badge: "bg-orange-500/20 text-orange-300 border-orange-500/40",
        bar: "from-orange-500 to-orange-300",
        shadow: "shadow-[0_0_18px_-8px_rgba(251,146,60,.45)]",
        glow: "bg-orange-400",
        icon: Activity,
        message: "Fair code health. Action required on high-severity findings.",
      };
    default:
      return {
        grade: "F",
        tone: "text-rose-300",
        border: "border-rose-500/30",
        bg: "bg-rose-500/[0.04]",
        badge: "bg-rose-500/20 text-rose-300 border-rose-500/40",
        bar: "from-rose-500 to-rose-300",
        shadow: "shadow-[0_0_18px_-8px_rgba(244,63,94,.48)]",
        glow: "bg-rose-400",
        icon: Activity,
        message: "Critical quality issues present across workspace.",
      };
  }
}

function CodeQualityPageInner() {
  const {
    projects,
    activeProjectId,
    activeProject,
    isLoadingProjects,
    selectProject,
  } = useActiveProject();

  const [data, setData] = useState<CodeQualityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  // Close project selector dropdown on outside click
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

  // Fetch quality data from API
  const loadData = useCallback(async () => {
    if (!activeProjectId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await getProjectCodeQuality(activeProjectId);
      setData(response.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load code quality analysis."
      );
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [activeProjectId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const summary = data?.summary;
  const breakdown = data?.breakdown;

  const gradeTheme = useMemo(() => {
    const score = summary?.overall_score ?? 0;
    const grade = summary?.quality_grade ?? "F";
    return getGradeTheme(score, grade);
  }, [summary]);

  const totalComplexityCount = useMemo(() => {
    if (!breakdown?.complexity) return 0;
    return (
      breakdown.complexity.high_complexity +
      breakdown.complexity.medium_complexity +
      breakdown.complexity.low_complexity
    );
  }, [breakdown]);

  return (
    <div className="max-w-[1500px] mx-auto px-3 md:px-6 lg:px-8 py-5 md:py-8 space-y-5 md:space-y-6 text-foreground">
      {/* ── 1. Page Header matching Normalized Proportions ── */}
      <section className="relative z-30 reveal" style={{ ["--d" as string]: "80ms" }}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_#00e5ff]" />
              <span className="cg-label !text-[10px]">CODEGRAPH AI / CODE QUALITY</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl md:text-[38px] leading-tight font-bold tracking-tight text-white">
                Code Quality Dashboard
              </h1>
              <HeartPulse className="hidden sm:block w-6 h-6 text-primary/70 shrink-0" strokeWidth={1.5} />
            </div>
            <p className="text-muted-foreground text-[13px] md:text-[14px] mt-1.5 max-w-2xl leading-relaxed">
              Unified health score, letter grade, and multi-domain architectural findings.
            </p>
          </div>

          {/* Right Header Actions: Project Selector & Refresh Button */}
          <div className="flex items-center gap-2.5 self-start lg:self-auto shrink-0">
            <div className="relative" ref={projectDropdownRef}>
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

            <button
              type="button"
              onClick={() => void loadData()}
              disabled={isLoading || isLoadingProjects || !activeProjectId}
              className="h-9 px-3.5 rounded-lg border border-white/[0.1] bg-white/[0.025] text-[12px] font-mono text-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/[0.045] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* ── 2. Horizontal Status & Project Context Indicator Bar ── */}
        <div className="mt-4 py-2.5 px-3 md:px-4 rounded-xl border border-white/[0.065] bg-white/[0.018] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 font-mono text-[10.5px] text-muted-foreground">
            <span
              className={cn(
                "w-6 h-6 rounded-md border flex items-center justify-center",
                gradeTheme.border,
                gradeTheme.bg
              )}
            >
              <gradeTheme.icon className={cn("w-3.5 h-3.5", gradeTheme.tone)} />
            </span>
            <span>
              <span className="text-foreground font-medium">
                {isLoading ? "Recalculating health score" : "Analysis complete"}
              </span>{" "}
              · project-wide quality signals
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[10.5px] text-muted-foreground">
            <span className="cg-label !text-[8.5px] text-[#7d8aa0]">ACTIVE CONTEXT:</span>
            <span className="text-white font-medium">{activeProject?.name ?? "No Project"}</span>
            <span className="text-white/20">·</span>
            <span>#{activeProjectId ?? "—"}</span>
          </div>
        </div>
      </section>

      {/* Error notification banner */}
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-mono text-rose-200 flex items-center gap-3">
          <AlertTriangle className="size-4 shrink-0 text-rose-400" />
          <div className="flex-1">
            <span className="font-semibold text-rose-100">Failed to analyze code quality: </span>
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

      {/* Main Content Area */}
      {!activeProjectId ? (
        <div className="min-h-72 rounded-2xl border border-white/[0.06] bg-white/[0.012] flex items-center justify-center text-center px-6 py-12">
          <div>
            <ShieldCheck className="w-9 h-9 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-[16px] font-semibold text-white">No Active Project Selected</h3>
            <p className="mt-1.5 max-w-md text-[12.5px] leading-relaxed text-muted-foreground mx-auto">
              Please select a project from the header to view its code quality score, letter grade, and architectural findings.
            </p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="space-y-5 animate-pulse">
          <div className="h-56 rounded-2xl border border-white/[0.05] bg-white/[0.02]" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-52 rounded-xl bg-white/[0.02] border border-white/[0.05]" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-60 rounded-xl bg-white/[0.02] border border-white/[0.05]" />
            ))}
          </div>
        </div>
      ) : summary && breakdown ? (
        <>
          {/* ── 3. Overall Project Health Panel (Normalized Proportions) ── */}
          <section
            className={cn(
              "rounded-2xl border bg-gradient-to-br from-[#0c111b]/95 to-[#070910]/95 overflow-hidden reveal shadow-xl",
              gradeTheme.border
            )}
            style={{ ["--d" as string]: "170ms" }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr]">
              {/* Left Side: Score & Grade */}
              <div className="relative p-5 md:p-6 lg:p-7 lg:border-r border-white/[0.06] overflow-hidden">
                <div
                  className={cn(
                    "absolute -left-16 -top-20 w-72 h-72 rounded-full blur-[90px] opacity-10 pointer-events-none",
                    gradeTheme.glow
                  )}
                />
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <span className="cg-label text-[#7d8aa0]">OVERALL PROJECT HEALTH</span>
                  </div>

                  <div className="mt-4 flex items-end gap-3 flex-wrap">
                    <span className="text-5xl sm:text-6xl md:text-[68px] leading-none font-bold tracking-tight text-white tabular-nums">
                      {summary.overall_score}
                    </span>
                    <span className="text-lg md:text-xl text-white/30 mb-0.5 font-mono">/ 100</span>
                    <span
                      className={cn(
                        "ml-auto mb-0.5 px-2.5 py-1 rounded-md border font-mono text-[11px] font-bold tracking-[0.08em] uppercase",
                        gradeTheme.tone,
                        gradeTheme.border,
                        gradeTheme.badge,
                        gradeTheme.shadow
                      )}
                    >
                      GRADE {summary.quality_grade}
                    </span>
                  </div>

                  {/* Slim progress bar */}
                  <div className="mt-5">
                    <div className="relative h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full bg-gradient-to-r transition-[width] duration-700",
                          gradeTheme.bar,
                          gradeTheme.shadow
                        )}
                        style={{ width: `${Math.min(100, Math.max(0, summary.overall_score))}%` }}
                      />
                      {[25, 50, 75].map((mark) => (
                        <span
                          key={mark}
                          className="absolute top-0 bottom-0 w-px bg-[#080a12]/70"
                          style={{ left: `${mark}%` }}
                        />
                      ))}
                    </div>
                    <div className="mt-1.5 flex justify-between font-mono text-[8.5px] text-white/30">
                      <span>0 · CRITICAL</span>
                      <span>50</span>
                      <span>100 · HEALTHY</span>
                    </div>
                  </div>

                  <p className={cn("mt-3.5 text-[13px] md:text-[14px] font-medium leading-snug", gradeTheme.tone)}>
                    {gradeTheme.message}
                  </p>
                </div>
              </div>

              {/* Right Side: Key Quality Signals */}
              <div className="p-5 md:p-6 lg:p-7 flex flex-col justify-center">
                <div className="cg-label mb-2 text-[#7d8aa0]">KEY QUALITY SIGNALS</div>
                <div className="divide-y divide-white/[0.06]">
                  {/* Dead Code Items */}
                  <div className="grid grid-cols-[26px_1fr_auto] items-center gap-3 py-3 first:pt-0">
                    <Trash2 className="w-4 h-4 text-amber-300" />
                    <div>
                      <div className="cg-label !text-[8.5px] text-[#7d8aa0]">DEAD CODE ITEMS</div>
                      <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                        <span className="text-amber-200/90 font-medium">
                          {summary.dead_code_high_confidence_count}
                        </span>{" "}
                        High Confidence
                      </div>
                    </div>
                    <div className="text-2xl md:text-[26px] font-semibold text-white tabular-nums">
                      {summary.dead_code_count}
                    </div>
                  </div>

                  {/* Dependency Cycles */}
                  <div className="grid grid-cols-[26px_1fr_auto] items-center gap-3 py-3">
                    <Repeat className="w-4 h-4 text-rose-300" />
                    <div>
                      <div className="cg-label !text-[8.5px] text-[#7d8aa0]">DEPENDENCY CYCLES</div>
                      <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                        <span className="text-rose-300/90 font-medium">
                          {summary.high_circular_dependency_count}
                        </span>{" "}
                        High Severity
                      </div>
                    </div>
                    <div className="text-2xl md:text-[26px] font-semibold text-white tabular-nums">
                      {summary.circular_dependency_count}
                    </div>
                  </div>

                  {/* High Complexity */}
                  <div className="grid grid-cols-[26px_1fr_auto] items-center gap-3 py-3 last:pb-0">
                    <Gauge className="w-4 h-4 text-primary" />
                    <div>
                      <div className="cg-label !text-[8.5px] text-[#7d8aa0]">HIGH COMPLEXITY</div>
                      <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                        Avg Score: <span className="text-white/80">{summary.average_complexity}</span>
                      </div>
                    </div>
                    <div className="text-2xl md:text-[26px] font-semibold text-white tabular-nums">
                      {summary.high_complexity_count}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── 4. Analysis Overview Cards (Normalized Proportions) ── */}
          <section className="reveal" style={{ ["--d" as string]: "240ms" }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="cg-label !text-foreground/80">ANALYSIS MODULES</span>
              <span className="flex-1 h-px bg-gradient-to-r from-white/[0.07] to-transparent" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
              {/* Card A: Dead Code Detection */}
              <Link
                href={`/dead-code?projectId=${activeProjectId}`}
                className="group relative flex flex-col justify-between rounded-xl border border-white/[0.065] bg-gradient-to-b from-white/[0.025] to-white/[0.008] p-4 sm:p-5 overflow-hidden transition-all duration-200 hover:border-amber-400/30 hover:shadow-[0_12px_36px_-20px_rgba(251,191,36,.3)]"
              >
                <span className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-amber-400/20 to-transparent group-hover:via-amber-400 transition-colors" />
                <div>
                  <div className="flex items-start justify-between">
                    <span className="w-9 h-9 rounded-lg border border-amber-400/20 bg-amber-400/[0.05] flex items-center justify-center text-amber-200">
                      <Trash2 className="w-4 h-4" />
                    </span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.08] text-muted-foreground">
                      Step 9.1
                    </span>
                  </div>

                  <h3 className="mt-3.5 text-[16px] md:text-[17px] font-semibold tracking-tight text-white group-hover:text-amber-200 transition-colors">
                    Dead Code Detection
                  </h3>
                  <p className="mt-1.5 min-h-[38px] text-[12.5px] leading-relaxed text-muted-foreground">
                    Unreachable or unused files, functions, classes, and methods identified across project nodes.
                  </p>

                  <div className="mt-3.5 pt-3.5 border-t border-white/[0.06] grid grid-cols-2">
                    <div>
                      <div className="cg-label !text-[8px] text-[#7d8aa0]">TOTAL CANDIDATES</div>
                      <div className="mt-1 text-xl md:text-2xl font-semibold text-white tabular-nums">
                        {summary.dead_code_count}
                      </div>
                    </div>
                    <div className="pl-4 border-l border-white/[0.06]">
                      <div className="cg-label !text-[8px] text-amber-200/90">HIGH CONFIDENCE</div>
                      <div className="mt-1 text-xl md:text-2xl font-semibold text-amber-300 tabular-nums">
                        {summary.dead_code_high_confidence_count}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-1.5 text-[11.5px] font-medium text-amber-300 group-hover:text-amber-200 transition-colors">
                  <span>View Dead Code Details</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>

              {/* Card B: Circular Dependencies */}
              <Link
                href={`/circular-dependencies?projectId=${activeProjectId}`}
                className="group relative flex flex-col justify-between rounded-xl border border-white/[0.065] bg-gradient-to-b from-white/[0.025] to-white/[0.008] p-4 sm:p-5 overflow-hidden transition-all duration-200 hover:border-rose-400/30 hover:shadow-[0_12px_36px_-20px_rgba(251,113,133,.3)]"
              >
                <span className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-rose-400/20 to-transparent group-hover:via-rose-400 transition-colors" />
                <div>
                  <div className="flex items-start justify-between">
                    <span className="w-9 h-9 rounded-lg border border-rose-400/20 bg-rose-400/[0.05] flex items-center justify-center text-rose-300">
                      <Repeat className="w-4 h-4" />
                    </span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.08] text-muted-foreground">
                      Step 9.2
                    </span>
                  </div>

                  <h3 className="mt-3.5 text-[16px] md:text-[17px] font-semibold tracking-tight text-white group-hover:text-rose-200 transition-colors">
                    Circular Dependencies
                  </h3>
                  <p className="mt-1.5 min-h-[38px] text-[12.5px] leading-relaxed text-muted-foreground">
                    Module and file import cycles detected via deterministic graph traversal.
                  </p>

                  <div className="mt-3.5 pt-3.5 border-t border-white/[0.06] grid grid-cols-2">
                    <div>
                      <div className="cg-label !text-[8px] text-[#7d8aa0]">TOTAL CYCLES</div>
                      <div className="mt-1 text-xl md:text-2xl font-semibold text-white tabular-nums">
                        {summary.circular_dependency_count}
                      </div>
                    </div>
                    <div className="pl-4 border-l border-white/[0.06]">
                      <div className="cg-label !text-[8px] text-rose-300/90">HIGH SEVERITY</div>
                      <div className="mt-1 text-xl md:text-2xl font-semibold text-rose-300 tabular-nums">
                        {summary.high_circular_dependency_count}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-1.5 text-[11.5px] font-medium text-rose-300 group-hover:text-rose-200 transition-colors">
                  <span>View Dependency Cycles</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>

              {/* Card C: Complexity Analysis */}
              <Link
                href={`/complexity?projectId=${activeProjectId}`}
                className="group relative flex flex-col justify-between rounded-xl border border-white/[0.065] bg-gradient-to-b from-white/[0.025] to-white/[0.008] p-4 sm:p-5 overflow-hidden transition-all duration-200 hover:border-primary/30 hover:shadow-[0_12px_36px_-20px_rgba(0,229,255,.3)]"
              >
                <span className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary/20 to-transparent group-hover:via-primary transition-colors" />
                <div>
                  <div className="flex items-start justify-between">
                    <span className="w-9 h-9 rounded-lg border border-primary/20 bg-primary/[0.05] flex items-center justify-center text-primary">
                      <Gauge className="w-4 h-4" />
                    </span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.08] text-muted-foreground">
                      Step 9.3
                    </span>
                  </div>

                  <h3 className="mt-3.5 text-[16px] md:text-[17px] font-semibold tracking-tight text-white group-hover:text-cyan-200 transition-colors">
                    Complexity Analysis
                  </h3>
                  <p className="mt-1.5 min-h-[38px] text-[12.5px] leading-relaxed text-muted-foreground">
                    Cyclomatic complexity and oversized function metrics computed from Tree-sitter AST nodes.
                  </p>

                  <div className="mt-3.5 pt-3.5 border-t border-white/[0.06] grid grid-cols-2">
                    <div>
                      <div className="cg-label !text-[8px] text-primary/90">HIGH COMPLEXITY</div>
                      <div className="mt-1 text-xl md:text-2xl font-semibold text-primary tabular-nums">
                        {summary.high_complexity_count}
                      </div>
                    </div>
                    <div className="pl-4 border-l border-white/[0.06]">
                      <div className="cg-label !text-[8px] text-[#7d8aa0]">MAX COMPLEXITY</div>
                      <div className="mt-1 text-xl md:text-2xl font-semibold text-white tabular-nums">
                        {summary.max_complexity}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-1.5 text-[11.5px] font-medium text-primary group-hover:text-cyan-200 transition-colors">
                  <span>View Complexity Metrics</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            </div>
          </section>

          {/* ── 5. Domain Breakdown Panels (Normalized Proportions) ── */}
          <section className="reveal" style={{ ["--d" as string]: "320ms" }}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
              {/* Panel 1: Dead Code Candidates by Entity Type */}
              <div className="rounded-xl border border-white/[0.065] bg-white/[0.012] p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3.5">
                  <Trash2 className="w-4 h-4 text-amber-300" />
                  <h4 className="cg-label !text-[9.5px] text-foreground/85 font-semibold">
                    Dead Code Candidates by Entity Type
                  </h4>
                </div>
                <div className="divide-y divide-white/[0.055]">
                  {[
                    { label: "Unused Files", value: breakdown.dead_code.files, icon: FileCode2, tone: "text-sky-300" },
                    { label: "Unused Classes", value: breakdown.dead_code.classes, icon: Box, tone: "text-violet-300" },
                    { label: "Unused Functions", value: breakdown.dead_code.functions, icon: FunctionSquare, tone: "text-primary" },
                    { label: "Unused Methods", value: breakdown.dead_code.methods, icon: Braces, tone: "text-emerald-300" },
                    { label: "Unused Variables", value: breakdown.dead_code.variables, icon: Variable, tone: "text-amber-200" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center gap-2.5 py-2 first:pt-0.5 last:pb-0.5">
                      <row.icon className={cn("w-3.5 h-3.5", row.tone)} />
                      <span className="text-[12px] text-muted-foreground">{row.label}</span>
                      <span className="ml-auto font-mono text-[12px] font-medium text-white tabular-nums">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Panel 2: Circular Dependencies by Severity */}
              <div className="rounded-xl border border-white/[0.065] bg-white/[0.012] p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3.5">
                  <Repeat className="w-4 h-4 text-rose-300" />
                  <h4 className="cg-label !text-[9.5px] text-foreground/85 font-semibold">
                    Circular Dependencies by Severity
                  </h4>
                </div>
                <div className="divide-y divide-white/[0.055]">
                  {[
                    { label: "High Severity (Length ≥ 4)", value: breakdown.circular_dependency.high_severity, tone: "text-rose-300", dot: "bg-rose-400" },
                    { label: "Medium Severity (Length 3)", value: breakdown.circular_dependency.medium_severity, tone: "text-amber-200", dot: "bg-amber-300" },
                    { label: "Low Severity (Length 2)", value: breakdown.circular_dependency.low_severity, tone: "text-sky-300", dot: "bg-sky-400" },
                    {
                      label: "Maximum Cycle Length",
                      value: breakdown.circular_dependency.max_cycle_length > 0 ? `${breakdown.circular_dependency.max_cycle_length} files` : "—",
                      tone: "text-white",
                      dot: "bg-violet-400",
                    },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center gap-2.5 py-2 first:pt-0.5 last:pb-0.5">
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", row.dot)} />
                      <span className="text-[12px] text-muted-foreground">{row.label}</span>
                      <span className={cn("ml-auto font-mono text-[12px] font-medium tabular-nums", row.tone)}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Panel 3: Complexity Distribution */}
              <div className="rounded-xl border border-white/[0.065] bg-white/[0.012] p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3.5">
                  <Gauge className="w-4 h-4 text-primary" />
                  <h4 className="cg-label !text-[9.5px] text-foreground/85 font-semibold">
                    Complexity Distribution
                  </h4>
                </div>
                <div className="space-y-3">
                  {[
                    {
                      label: "High Complexity (> 10)",
                      value: breakdown.complexity.high_complexity,
                      bar: "bg-rose-400",
                      tone: "text-rose-300",
                    },
                    {
                      label: "Medium Complexity (6–10)",
                      value: breakdown.complexity.medium_complexity,
                      bar: "bg-amber-300",
                      tone: "text-amber-200",
                    },
                    {
                      label: "Low Complexity (1–5)",
                      value: breakdown.complexity.low_complexity,
                      bar: "bg-primary",
                      tone: "text-sky-300",
                    },
                  ].map((tier) => {
                    const percent =
                      totalComplexityCount > 0
                        ? Math.round((tier.value / totalComplexityCount) * 100)
                        : 0;
                    return (
                      <div key={tier.label}>
                        <div className="flex justify-between font-mono text-[10.5px]">
                          <span className="text-muted-foreground">{tier.label}</span>
                          <span className={cn("font-medium", tier.tone)}>{tier.value}</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-500", tier.bar)}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
                    <span className="cg-label !text-[8.5px] text-[#7d8aa0]">AVERAGE COMPLEXITY</span>
                    <span className="font-mono text-[13px] md:text-[14px] font-semibold text-primary tabular-nums">
                      {breakdown.complexity.average_complexity}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

export default function CodeQualityPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-[1500px] mx-auto px-4 py-12 text-center text-muted-foreground font-mono text-xs">
          Loading code quality dashboard...
        </div>
      }
    >
      <CodeQualityPageInner />
    </Suspense>
  );
}
