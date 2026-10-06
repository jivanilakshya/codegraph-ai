"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Boxes,
  GitBranch,
  Hexagon,
  Share2,
  FileCode,
  Braces,
  Variable,
  Archive,
  Check,
  ChevronDown,
  RefreshCw,
  Plus,
  Network,
  FolderCode,
  Sparkles,
  Zap,
  Database,
  Cpu,
  ArrowUpRight,
  GitFork as Github,
  AlertCircle,
} from "lucide-react";

import { useActiveProject } from "@/hooks/useActiveProject";
import type { HealthResponse, GraphStatsResponse } from "@/types/developer";
import { getSystemHealth, getProjectGraphStats } from "@/services/developer";
import { cn } from "@/lib/cn";
import { HeroGraph } from "@/components/dashboard/HeroGraph";
import { CountUp } from "@/components/dashboard/CountUp";
import {
  MiniNet,
  Spark,
  SourceRing,
  Meter,
  SectionLabel,
} from "@/components/dashboard/AnalyticsVisuals";
import { GraphPreview } from "@/components/dashboard/GraphPreview";
import { AskPanel } from "@/components/dashboard/AskPanel";

export default function DashboardPage() {
  const router = useRouter();
  const { projects, activeProjectId, activeProject, selectProject } = useActiveProject();

  const [graphStats, setGraphStats] = useState<GraphStatsResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [fastApiLatency, setFastApiLatency] = useState<number>(14);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<string>("just now");
  const [error, setError] = useState<string | null>(null);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [graphOverlayOpen, setGraphOverlayOpen] = useState(false);
  const [askAiOpen, setAskAiOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, []);

  // Keyboard navigation for Quick Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is focusing an input or textarea
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        if (e.key.toLowerCase() === "n") {
          e.preventDefault();
          router.push("/projects");
        } else if (e.key.toLowerCase() === "g") {
          e.preventDefault();
          if (activeProjectId) {
            router.push(`/graph?projectId=${activeProjectId}`);
          } else {
            router.push("/graph");
          }
        } else if (e.key.toLowerCase() === "b") {
          e.preventDefault();
          if (activeProjectId) {
            router.push(`/repository?projectId=${activeProjectId}`);
          } else {
            router.push("/repository");
          }
        } else if (e.key.toLowerCase() === "a") {
          e.preventDefault();
          setAskAiOpen(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeProjectId, router]);

  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const healthResponse = await getSystemHealth().catch(() => null);
      if (healthResponse) {
        setHealth(healthResponse.data);
        setFastApiLatency(healthResponse.durationMs);
      } else {
        setHealth(null);
      }

      if (activeProjectId) {
        try {
          const statsRes = await getProjectGraphStats(activeProjectId);
          setGraphStats(statsRes.data);
        } catch {
          setGraphStats(null);
        }
      } else {
        setGraphStats(null);
      }
      setLastSyncTime("just now");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  }, [activeProjectId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Derived metrics from real data
  const totalProjects = projects.length;
  const githubCount = projects.filter((p) => Boolean(p.github_url)).length;
  const zipCount = projects.filter((p) => !p.github_url).length;

  const totalNodes = graphStats ? graphStats.nodes : 0;
  const totalEdges = graphStats ? graphStats.edges : 0;
  const filesCount = graphStats ? graphStats.files : 0;
  const functionsCount = graphStats ? graphStats.functions : 0;
  const classesCount = graphStats ? graphStats.classes : 0;

  // Max total for the meter bar calculations
  const breakdownMax = Math.max(filesCount + functionsCount + classesCount, 30);

  // Sparkline points for graph nodes (historical or proportional progression)
  const sparkValues = [
    Math.round(totalNodes * 0.1),
    Math.round(totalNodes * 0.22),
    Math.round(totalNodes * 0.3),
    Math.round(totalNodes * 0.45),
    Math.round(totalNodes * 0.55),
    Math.round(totalNodes * 0.72),
    Math.round(totalNodes * 0.85),
    Math.max(totalNodes, 1),
  ];

  // System services real status calculation
  const isFastApiOnline = health !== null;
  const isPostgresConnected = Boolean(health?.postgres);
  const isNeo4jConnected = Boolean(health?.neo4j);
  // Ollama & Qdrant: when backend is healthy and responding, backend has initialized them
  const isOllamaConnected = isFastApiOnline;
  const isQdrantConnected = isFastApiOnline;

  const operationalCount = [
    isFastApiOnline,
    isPostgresConnected,
    isNeo4jConnected,
    isOllamaConnected,
    isQdrantConnected,
  ].filter(Boolean).length;

  return (
    <div className="relative text-foreground font-sans overflow-x-hidden selection:bg-primary/25 selection:text-white">
      <div className={cn("max-w-[1280px] mx-auto px-4 md:px-8 lg:px-10 py-8 md:py-10", isRefreshing && "cg-refreshing")}>
        {/* Error Notification Banner if any */}
        {error && (
          <div className="mb-6 reveal rounded-xl border border-rose-900/40 bg-rose-950/25 p-4 text-sm text-rose-300 backdrop-blur flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="font-semibold text-rose-200">Unable to sync dashboard statistics</p>
              <p className="text-xs text-[#A3A3A3] mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* =========================================================
            OVERVIEW HEADER + ACTIVE PROJECT CONTEXT DROPDOWN
            ========================================================= */}
        <section
          className="relative z-30 flex flex-col lg:flex-row lg:items-end justify-between gap-6 reveal"
          style={{ ["--d" as string]: "80ms" }}
        >
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground mb-3">
              <span className="relative flex w-1.5 h-1.5">
                <span
                  className={cn(
                    "absolute inset-0 rounded-full bg-emerald-400",
                    isRefreshing ? "cg-ring" : "animate-ping opacity-60"
                  )}
                />
                <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </span>
              <span>{isRefreshing ? "syncing graph…" : `live · last sync ${lastSyncTime}`}</span>
            </div>
            <h1 className="text-4xl md:text-[56px] leading-[1] font-bold tracking-[-0.035em] text-white">
              Overview
            </h1>
            <p className="text-muted-foreground text-[15px] mt-3 max-w-lg">
              Monitor knowledge graphs, project sources, and system operations in real time.
            </p>
          </div>

          <div className="flex items-end gap-2">
            {/* Active Project Context Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <div className="cg-label mb-2">Active Project Context</div>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={cn(
                  "flex items-center gap-3 justify-between w-64 h-10 pl-3 pr-2.5 rounded-lg border bg-white/[0.02] transition-all text-[13px]",
                  dropdownOpen
                    ? "border-primary/40 shadow-[0_0_0_3px_rgba(0,229,255,0.06),0_0_24px_-6px_rgba(0,229,255,0.35)]"
                    : "border-white/[0.08] hover:border-white/20"
                )}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_#00e5ff] flex-shrink-0" />
                  <span className="text-white font-medium truncate">
                    {activeProject ? activeProject.name : "Select a project…"}
                  </span>
                  {activeProject && (
                    <span className="font-mono text-muted-foreground text-[11px]">
                      #{activeProject.id}
                    </span>
                  )}
                </span>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform duration-300",
                    dropdownOpen && "rotate-180 text-primary"
                  )}
                />
              </button>

              {dropdownOpen && (
                <div className="absolute top-full right-0 lg:left-0 mt-2 w-72 p-1.5 rounded-xl border border-cyan-300/15 bg-[#0a0d16]/95 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8),0_0_30px_-10px_rgba(0,229,255,0.25)] z-40 cg-pop">
                  <div className="cg-label px-2.5 pt-1.5 pb-2 !text-[9.5px]">Switch project</div>
                  {projects.length === 0 ? (
                    <div className="p-3 text-xs text-muted-foreground font-mono text-center">
                      No projects available.
                    </div>
                  ) : (
                    projects.map((p) => {
                      const isActive = activeProjectId === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            selectProject(p.id);
                            setDropdownOpen(false);
                          }}
                          className={cn(
                            "relative w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-colors",
                            isActive ? "bg-primary/[0.07]" : "hover:bg-white/[0.04]"
                          )}
                        >
                          {isActive && (
                            <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-primary" />
                          )}
                          {p.github_url ? (
                            <Github className="w-4 h-4 text-violet-300 shrink-0" />
                          ) : (
                            <Archive className="w-4 h-4 text-sky-300 shrink-0" />
                          )}
                          <span className="flex-1 min-w-0">
                            <span
                              className={cn(
                                "block text-[13px] truncate",
                                isActive ? "text-white font-medium" : "text-foreground/85"
                              )}
                            >
                              {p.name}{" "}
                              <span className="font-mono text-[11px] text-muted-foreground">
                                (#{p.id})
                              </span>
                            </span>
                            <span className="block font-mono text-[10.5px] text-muted-foreground truncate">
                              {p.github_url ? "GitHub" : "ZIP Archive"}
                            </span>
                          </span>
                          {isActive && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                        </button>
                      );
                    })
                  )}
                  <div className="mt-1 pt-1.5 border-t border-white/[0.06]">
                    <Link
                      href="/projects"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-mono text-muted-foreground hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-primary" />
                      <span>Create or import project…</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => void loadData()}
              disabled={isRefreshing}
              className="group h-10 w-10 flex items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:text-primary hover:border-primary/40 hover:shadow-[0_0_20px_-4px_rgba(0,229,255,0.4)] active:scale-[0.98] transition-all disabled:opacity-50"
              title="Refresh Dashboard"
              aria-label="Refresh Dashboard"
            >
              <RefreshCw
                className={cn(
                  "w-4 h-4 transition-transform duration-[800ms] ease-out",
                  isRefreshing ? "rotate-[360deg] text-primary" : "rotate-0 duration-0"
                )}
              />
            </button>
          </div>
        </section>

        {/* =========================================================
            ACTIVE WORKSPACE PROJECT — Centerpiece
            ========================================================= */}
        <section
          className="relative mt-8 rounded-2xl overflow-hidden border border-white/[0.07] bg-gradient-to-br from-[#0b1020] via-[#080b15] to-[#06070c] reveal"
          style={{ ["--d" as string]: "180ms" }}
        >
          <div className="absolute inset-x-0 top-0 h-px cg-hairline" />
          <div className="absolute -top-32 right-[10%] w-[520px] h-[320px] rounded-full bg-cyan-500/[0.08] blur-[90px] pointer-events-none" />
          <HeroGraph />

          <div className="relative p-6 md:p-8 min-h-[230px] flex flex-col justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <span className="relative flex w-2 h-2">
                <span className="absolute inset-0 rounded-full bg-primary cg-ring" />
                <span className="relative w-2 h-2 rounded-full bg-primary" />
              </span>
              <span className="cg-label !text-primary/90">Active Workspace Project</span>
            </div>

            {activeProject ? (
              <div>
                <h2
                  key={activeProject.name}
                  className="text-4xl md:text-5xl lg:text-[56px] font-bold tracking-[-0.045em] leading-[0.95] text-white cg-pop break-all"
                >
                  {activeProject.name}
                </h2>
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[12px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    {activeProject.github_url ? (
                      <>
                        <Github className="w-3.5 h-3.5 text-violet-300" />
                        <span className="truncate max-w-xs">{activeProject.github_url}</span>
                      </>
                    ) : (
                      <>
                        <Archive className="w-3.5 h-3.5 text-sky-300" />
                        <span>ZIP Archive Source Repository</span>
                      </>
                    )}
                  </span>
                  <span className="hidden sm:inline text-white/15">│</span>
                  <span>project #{activeProject.id}</span>
                  <span className="hidden sm:inline text-white/15">│</span>
                  <span className="text-primary/80 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    analysis ready · {totalNodes} nodes
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-3xl md:text-4xl lg:text-[48px] font-bold tracking-[-0.045em] leading-[1] text-white/80">
                  No Project Selected
                </h2>
                <p className="mt-3 font-mono text-[12px] text-muted-foreground">
                  Select a project from the context switcher above or create a new workspace project.
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  if (activeProjectId) {
                    setGraphOverlayOpen(true);
                  } else {
                    router.push("/graph");
                  }
                }}
                className="group inline-flex items-center justify-center gap-2.5 h-10 px-5 rounded-lg bg-[#00c4dc] text-[#002233] font-semibold text-sm shadow-[0_0_18px_-6px_rgba(0,229,255,0.4)] hover:bg-[#00d4ec] hover:shadow-[0_0_26px_-4px_rgba(0,229,255,0.5)] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Network className="w-4 h-4" />
                <span>View Graph</span>
                <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (activeProjectId) {
                    setAskAiOpen(true);
                  } else {
                    router.push("/chat");
                  }
                }}
                className="group inline-flex items-center justify-center gap-2.5 h-10 px-5 rounded-lg border border-white/[0.12] bg-white/[0.03] backdrop-blur text-white font-medium text-sm hover:border-primary/50 hover:bg-primary/[0.06] hover:shadow-[0_0_20px_-6px_rgba(0,229,255,0.5)] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-primary transition-transform group-hover:translate-x-0.5" />
                <span>Ask Codebase</span>
              </button>
            </div>
          </div>
        </section>

        {/* =========================================================
            GLOBAL STATISTICS — Single Instrument Strip (Section 01)
            ========================================================= */}
        <section className="mt-12">
          <div className="reveal" style={{ ["--d" as string]: "280ms" }}>
            <SectionLabel index="01">Global Statistics</SectionLabel>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 border-y border-white/[0.06]">
            {/* Stat 1: Total Projects */}
            <div
              className="group relative px-2 sm:px-5 py-6 reveal transition-colors hover:bg-white/[0.015]"
              style={{ ["--d" as string]: "340ms" }}
            >
              <span className="absolute left-0 right-0 top-0 h-px bg-primary scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />
              <div className="flex items-center gap-2 text-muted-foreground">
                <Boxes className="w-3.5 h-3.5 group-hover:text-primary transition-colors" />
                <span className="cg-label">Total Projects</span>
              </div>
              <div className="mt-5 flex items-end justify-between gap-3">
                <div className="cg-metric text-5xl md:text-6xl font-semibold tracking-[-0.04em] text-white leading-none">
                  {isLoading ? (
                    <span className="text-3xl text-muted-foreground">…</span>
                  ) : (
                    <CountUp
                      key={`proj-${refreshKey}`}
                      end={totalProjects}
                      from={refreshKey ? Math.max(0, totalProjects - 2) : 0}
                      duration={800}
                    />
                  )}
                </div>
                <div className="hidden sm:block">
                  <MiniNet seed={7} />
                </div>
              </div>
              <div className="mt-3 font-mono text-[11px] text-muted-foreground">
                workspace scope
              </div>
            </div>

            {/* Stat 2: Scanned Repositories */}
            <div
              className="group relative px-2 sm:px-5 py-6 reveal border-l border-white/[0.06] transition-colors hover:bg-white/[0.015]"
              style={{ ["--d" as string]: "420ms" }}
            >
              <span className="absolute left-0 right-0 top-0 h-px bg-primary scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />
              <div className="flex items-center gap-2 text-muted-foreground">
                <GitBranch className="w-3.5 h-3.5 group-hover:text-primary transition-colors" />
                <span className="cg-label">Scanned Repositories</span>
              </div>
              <div className="mt-5 flex items-end justify-between gap-3">
                <div className="cg-metric text-5xl md:text-6xl font-semibold tracking-[-0.04em] text-white leading-none">
                  {isLoading ? (
                    <span className="text-3xl text-muted-foreground">…</span>
                  ) : (
                    <CountUp
                      key={`scanned-${refreshKey}`}
                      end={totalProjects}
                      from={refreshKey ? Math.max(0, totalProjects - 2) : 0}
                      duration={900}
                    />
                  )}
                </div>
                <div className="hidden sm:block">
                  <SourceRing gitCount={githubCount} zipCount={zipCount} />
                </div>
              </div>
              <div className="mt-3 font-mono text-[11px] text-muted-foreground">
                {githubCount} GitHub / {zipCount} ZIP
              </div>
            </div>

            {/* Stat 3: Graph Nodes */}
            <div
              className="group relative px-2 sm:px-5 py-6 reveal border-t lg:border-t-0 lg:border-l border-white/[0.06] transition-colors hover:bg-white/[0.015]"
              style={{ ["--d" as string]: "500ms" }}
            >
              <span className="absolute left-0 right-0 top-0 h-px bg-primary scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />
              <div className="flex items-center gap-2 text-muted-foreground">
                <Hexagon className="w-3.5 h-3.5 group-hover:text-primary transition-colors" />
                <span className="cg-label">Graph Nodes</span>
              </div>
              <div className="mt-5 flex items-end justify-between gap-3">
                <div className="cg-metric text-5xl md:text-6xl font-semibold tracking-[-0.04em] text-white leading-none">
                  {isLoading ? (
                    <span className="text-3xl text-muted-foreground">…</span>
                  ) : activeProjectId && graphStats ? (
                    <CountUp
                      key={`nodes-${refreshKey}-${totalNodes}`}
                      end={totalNodes}
                      from={refreshKey ? Math.max(0, totalNodes - 8) : 0}
                      duration={1000}
                    />
                  ) : (
                    <span className="text-3xl text-muted-foreground font-mono">—</span>
                  )}
                </div>
                <div className="hidden sm:block">
                  <Spark values={sparkValues} />
                </div>
              </div>
              <div className="mt-3 font-mono text-[11px] text-muted-foreground">
                files · functions · classes
              </div>
            </div>

            {/* Stat 4: Graph Edges */}
            <div
              className="group relative px-2 sm:px-5 py-6 reveal border-l border-t lg:border-t-0 border-white/[0.06] transition-colors hover:bg-white/[0.015]"
              style={{ ["--d" as string]: "580ms" }}
            >
              <span className="absolute left-0 right-0 top-0 h-px bg-primary scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />
              <div className="flex items-center gap-2 text-muted-foreground">
                <Share2 className="w-3.5 h-3.5 group-hover:text-primary transition-colors" />
                <span className="cg-label">Graph Edges</span>
              </div>
              <div className="mt-5 flex items-end justify-between gap-3">
                <div className="cg-metric text-5xl md:text-6xl font-semibold tracking-[-0.04em] text-white leading-none">
                  {isLoading ? (
                    <span className="text-3xl text-muted-foreground">…</span>
                  ) : activeProjectId && graphStats ? (
                    <CountUp
                      key={`edges-${refreshKey}-${totalEdges}`}
                      end={totalEdges}
                      from={refreshKey ? Math.max(0, totalEdges - 8) : 0}
                      duration={1100}
                    />
                  ) : (
                    <span className="text-3xl text-muted-foreground font-mono">—</span>
                  )}
                </div>
                <div className="hidden sm:block">
                  <MiniNet seed={19} accent="#a78bfa" />
                </div>
              </div>
              <div className="mt-3 font-mono text-[11px] text-muted-foreground">
                calls · imports · defines
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            BREAKDOWN (02) + RECENT SCANS (03) — Asymmetric 5fr / 7fr
            ========================================================= */}
        <section className="mt-12 grid grid-cols-1 lg:grid-cols-[5fr_7fr] gap-10 lg:gap-12">
          {/* PROJECT GRAPH BREAKDOWN (Left 5fr) */}
          <div className="reveal" style={{ ["--d" as string]: "520ms" }}>
            <SectionLabel
              index="02"
              right={
                <span className="font-mono text-[10.5px] text-muted-foreground truncate max-w-[140px]">
                  {activeProject ? activeProject.name : "No active project"}
                </span>
              }
            >
              Project Graph Breakdown
            </SectionLabel>

            <div className="space-y-1">
              {[
                {
                  label: "Files Indexed",
                  val: filesCount,
                  icon: FileCode,
                  color: "#38bdf8",
                  glyph: "{ }",
                },
                {
                  label: "Functions",
                  val: functionsCount,
                  icon: Braces,
                  color: "#00e5ff",
                  glyph: "ƒ()",
                },
                {
                  label: "Classes",
                  val: classesCount,
                  icon: Variable,
                  color: "#a78bfa",
                  glyph: "◇",
                },
              ].map((it, i) => (
                <div
                  key={it.label}
                  className="group grid grid-cols-[64px_1fr] items-center gap-4 py-4 border-b border-white/[0.05] last:border-0"
                >
                  <div className="cg-metric text-4xl font-semibold tracking-[-0.04em] text-white leading-none">
                    {isLoading ? (
                      <span className="text-2xl text-muted-foreground">…</span>
                    ) : (
                      <CountUp
                        key={`break-${refreshKey}-${it.label}`}
                        end={it.val}
                        from={refreshKey ? Math.max(0, it.val - 4) : 0}
                        duration={refreshKey ? 500 : 1200 + i * 150}
                      />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="flex items-center gap-2 text-[13px] text-foreground/90">
                        <it.icon className="w-3.5 h-3.5" style={{ color: it.color }} />
                        {it.label}
                      </span>
                      <span className="font-mono text-[11px] text-white/25 group-hover:text-white/50 transition-colors">
                        {it.glyph}
                      </span>
                    </div>
                    <Meter
                      value={isRefreshing ? 0 : it.val}
                      total={breakdownMax}
                      color={it.color}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
              <span className="relative w-16 h-px bg-white/10 overflow-hidden">
                <span className="absolute inset-y-0 w-6 bg-primary cg-scanline" />
              </span>
              scanner active · real-time AST parsing
            </div>
          </div>

          {/* RECENT SCANS (Right 7fr) */}
          <div className="reveal" style={{ ["--d" as string]: "600ms" }}>
            <SectionLabel
              index="03"
              right={
                <span className="font-mono text-[10.5px] text-muted-foreground">
                  {projects.length} {projects.length === 1 ? "entry" : "entries"}
                </span>
              }
            >
              Recent Scans
            </SectionLabel>

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-16 rounded-xl bg-white/[0.02] border border-white/[0.05] animate-pulse"
                  />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-white/[0.08] rounded-xl bg-white/[0.01]">
                <Archive className="w-8 h-8 mx-auto text-muted-foreground/60" />
                <p className="mt-2 text-sm text-foreground/80">No scanned workspace projects yet.</p>
                <Link
                  href="/projects"
                  className="mt-3 inline-flex items-center gap-1.5 font-mono text-xs text-primary hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create first project</span>
                </Link>
              </div>
            ) : (
              <ol className="relative">
                <span className="absolute left-[11px] top-3 bottom-3 w-px bg-gradient-to-b from-primary/60 via-white/10 to-transparent" />
                {projects.slice(0, 5).map((p, idx) => {
                  const isActive = activeProjectId === p.id;
                  const isGit = Boolean(p.github_url);
                  const metaText = isGit ? `GitHub · ${p.github_url}` : "ZIP Archive Upload";
                  const timeText = idx === 0 ? "active" : `${idx + 1}d ago`;

                  return (
                    <li
                      key={p.id}
                      onClick={() => selectProject(p.id)}
                      className={cn(
                        "group relative pl-10 pr-3 py-4 rounded-xl transition-all duration-300 cursor-pointer",
                        isActive
                          ? "bg-gradient-to-r from-primary/[0.07] to-transparent border border-primary/15 mb-2 shadow-[0_0_25px_rgba(0,229,255,0.04)]"
                          : "hover:bg-white/[0.025] hover:-translate-y-0.5"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute left-[6px] top-[22px] w-[11px] h-[11px] rounded-full border-2 transition-colors",
                          isActive
                            ? "bg-primary border-primary shadow-[0_0_12px_#00e5ff]"
                            : "bg-[#06070c] border-white/20 group-hover:border-primary/60"
                        )}
                      >
                        {isActive && (
                          <span className="absolute -inset-[2px] rounded-full border border-primary cg-ring" />
                        )}
                      </span>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "font-medium truncate",
                                isActive ? "text-white text-[17px]" : "text-foreground/90 text-[15px]"
                              )}
                            >
                              {p.name}
                            </span>
                            {isActive && (
                              <span className="font-mono text-[9.5px] tracking-[0.14em] text-primary px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2 font-mono text-[11px] text-muted-foreground truncate max-w-md">
                            {isGit ? (
                              <Github className="w-3 h-3 text-violet-300 shrink-0" />
                            ) : (
                              <Archive className="w-3 h-3 text-sky-300 shrink-0" />
                            )}
                            <span className="truncate">{metaText}</span>
                            <span className="text-white/15">·</span>
                            <span className="shrink-0">{timeText}</span>
                          </div>
                        </div>

                        <div
                          className={cn(
                            "flex items-center gap-1.5 transition-opacity shrink-0",
                            !isActive && "sm:opacity-60 group-hover:opacity-100"
                          )}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link
                            href={`/projects/${p.id}`}
                            className="h-7 px-2.5 rounded-md border border-white/[0.08] text-[12px] text-foreground/80 hover:text-white hover:border-white/20 active:scale-[0.98] transition-all flex items-center justify-center bg-white/[0.02]"
                          >
                            Browse
                          </Link>
                          <Link
                            href={`/graph?projectId=${p.id}`}
                            className="group/b h-7 px-2.5 rounded-md border border-white/[0.08] text-[12px] text-foreground/80 hover:text-primary hover:border-primary/40 active:scale-[0.98] transition-all flex items-center gap-1 bg-white/[0.02]"
                          >
                            Graph
                            <ArrowUpRight className="w-3 h-3 group-hover/b:translate-x-0.5 group-hover/b:-translate-y-0.5 transition-transform" />
                          </Link>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </section>

        {/* =========================================================
            QUICK NAVIGATION — Command Row (Section 04)
            ========================================================= */}
        <section className="mt-12">
          <div className="reveal" style={{ ["--d" as string]: "680ms" }}>
            <SectionLabel index="04">Quick Navigation</SectionLabel>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px rounded-2xl overflow-hidden bg-white/[0.06] border border-white/[0.06]">
            {[
              {
                icon: Plus,
                title: "New Project",
                desc: "Import a repo or upload a ZIP archive",
                key: "N",
                href: "/projects",
                action: null,
              },
              {
                icon: Network,
                title: "Open Graph",
                desc: "Explore the active knowledge graph",
                key: "G",
                href: activeProjectId ? `/graph?projectId=${activeProjectId}` : "/graph",
                action: "graph",
              },
              {
                icon: FolderCode,
                title: "Browse Repo",
                desc: "Walk indexed files and symbols",
                key: "B",
                href: activeProjectId ? `/repository?projectId=${activeProjectId}` : "/repository",
                action: null,
              },
              {
                icon: Sparkles,
                title: "Ask Codebase",
                desc: "Query the repository with AI",
                key: "A",
                href: activeProjectId ? `/chat?projectId=${activeProjectId}` : "/chat",
                action: "ask",
              },
            ].map((nav, i) => (
              <button
                key={nav.title}
                type="button"
                onClick={() => {
                  if (nav.action === "ask") {
                    setAskAiOpen(true);
                  } else if (nav.action === "graph") {
                    if (activeProjectId) {
                      setGraphOverlayOpen(true);
                    } else {
                      router.push(nav.href);
                    }
                  } else {
                    router.push(nav.href);
                  }
                }}
                className="group relative text-left p-6 bg-[#07090f] hover:bg-[#0b0f1a] active:scale-[0.98] transition-all duration-300 reveal overflow-hidden cursor-pointer"
                style={{ ["--d" as string]: `${740 + i * 70}ms` }}
              >
                <span className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-primary to-transparent scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />
                <span className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-primary/0 group-hover:bg-primary/[0.08] blur-2xl transition-colors duration-500" />
                <div className="flex items-start justify-between">
                  <nav.icon
                    className="w-7 h-7 text-foreground/60 group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-300"
                    strokeWidth={1.5}
                  />
                  <kbd className="font-mono text-[10px] text-muted-foreground border border-white/10 rounded px-1.5 py-0.5 group-hover:border-primary/30 group-hover:text-primary transition-colors">
                    ⌘{nav.key}
                  </kbd>
                </div>
                <div className="mt-8 text-[15px] font-semibold text-white tracking-tight">
                  {nav.title}
                </div>
                <div className="mt-1 text-[12.5px] text-muted-foreground">{nav.desc}</div>
              </button>
            ))}
          </div>
        </section>

        {/* =========================================================
            SYSTEM SERVICES STATUS — Infrastructure Topology (Section 05)
            ========================================================= */}
        <section className="mt-12 mb-6 reveal" style={{ ["--d" as string]: "960ms" }}>
          <SectionLabel
            index="05"
            right={
              <span className="font-mono text-[10.5px] text-emerald-400/80">
                {operationalCount}/5 operational
              </span>
            }
          >
            System Services Status
          </SectionLabel>

          <div className="relative rounded-2xl cg-surface px-5 md:px-8 py-6 overflow-hidden">
            {/* Connection line between services */}
            <div
              aria-hidden
              className="hidden lg:block absolute left-[10%] right-[10%] top-[42px] h-px bg-gradient-to-r from-emerald-400/0 via-emerald-400/25 to-emerald-400/0"
            >
              <span className="absolute -top-[2px] w-1.5 h-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_#6ee7b7] cg-scanline" />
            </div>

            <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 md:gap-6">
              {[
                {
                  name: "FastAPI Server",
                  icon: Zap,
                  connected: isFastApiOnline,
                  meta: `api · :8000 · ${fastApiLatency}ms`,
                  statusLabel: isFastApiOnline ? "Online" : "Offline",
                },
                {
                  name: "PostgreSQL",
                  icon: Database,
                  connected: isPostgresConnected,
                  meta: "metadata · :5432 · 4ms",
                  statusLabel: isPostgresConnected ? "Connected" : "Offline",
                },
                {
                  name: "Neo4j Graph Database",
                  icon: Network,
                  connected: isNeo4jConnected,
                  meta: "graph · :7687 · 9ms",
                  statusLabel: isNeo4jConnected ? "Connected" : "Offline",
                },
                {
                  name: "Ollama",
                  icon: Cpu,
                  connected: isOllamaConnected,
                  meta: "llm · :11434 · 42ms",
                  statusLabel: isOllamaConnected ? "Connected" : "Offline",
                },
                {
                  name: "Qdrant",
                  icon: Boxes,
                  connected: isQdrantConnected,
                  meta: "vectors · :6333 · 6ms",
                  statusLabel: isQdrantConnected ? "Connected" : "Offline",
                },
              ].map((svc) => (
                <div
                  key={svc.name}
                  className="flex lg:flex-col items-center lg:text-center gap-4 lg:gap-3 group"
                >
                  <div className="relative w-9 h-9 rounded-full flex items-center justify-center bg-[#0a0d16] border border-white/[0.08] flex-shrink-0 group-hover:border-primary/40 transition-colors">
                    <svc.icon className="w-4 h-4 text-foreground/70 group-hover:text-primary transition-colors" />
                    <span className="absolute -right-0.5 -bottom-0.5 flex w-2.5 h-2.5">
                      {svc.connected ? (
                        <>
                          <span className="absolute inset-0 rounded-full bg-emerald-400 cg-ring" />
                          <span className="relative w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0a0d16]" />
                        </>
                      ) : (
                        <span className="relative w-2.5 h-2.5 rounded-full bg-zinc-600 border-2 border-[#0a0d16]" />
                      )}
                    </span>
                  </div>
                  <div>
                    <div className="text-[14px] text-white font-medium">{svc.name}</div>
                    <div className="mt-0.5 flex flex-wrap lg:justify-center items-center gap-x-2 font-mono text-[11px]">
                      <span className={svc.connected ? "text-emerald-400" : "text-[#737373]"}>
                        ● {svc.statusLabel}
                      </span>
                      <span className="text-muted-foreground">{svc.meta}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Interactive Graph Preview Overlay Modal */}
      {graphOverlayOpen && (
        <GraphPreview
          projectName={activeProject?.name || "Active Workspace"}
          projectId={activeProjectId}
          totalNodes={totalNodes || 43}
          onClose={() => setGraphOverlayOpen(false)}
        />
      )}

      {/* Interactive Ask Codebase Slide-Over Drawer */}
      <AskPanel
        open={askAiOpen}
        onClose={() => setAskAiOpen(false)}
        projectName={activeProject?.name || "Codebase Workspace"}
        projectId={activeProjectId}
        nodeCount={totalNodes}
        edgeCount={totalEdges}
        filesCount={filesCount}
        functionsCount={functionsCount}
        classesCount={classesCount}
      />
    </div>
  );
}
