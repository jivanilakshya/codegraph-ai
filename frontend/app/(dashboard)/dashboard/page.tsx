"use client";

import {
  Activity,
  FolderGit2,
  GitBranch,
  Network,
  RefreshCw,
  Plus,
  GitGraph,
  FolderOpen,
  Server,
  MessageSquare,
  Code2,
  Boxes,
  ArrowRight,
} from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";

import { StatCard } from "@/components/ui/StatCard";
import { useActiveProject } from "@/hooks/useActiveProject";
import { ProjectSelector } from "@/components/developer/ProjectSelector";
import type { HealthResponse, GraphStatsResponse } from "@/types/developer";
import { getSystemHealth, getProjectGraphStats } from "@/services/developer";

export default function DashboardPage() {
  const { projects, activeProjectId, activeProject, selectProject } = useActiveProject();
  const [graphStats, setGraphStats] = useState<GraphStatsResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeProjectRef = useRef<HTMLDivElement>(null);

  const handleActiveProjectMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeProjectRef.current) return;
    const rect = activeProjectRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    activeProjectRef.current.style.setProperty("--mouse-x", `${x}px`);
    activeProjectRef.current.style.setProperty("--mouse-y", `${y}px`);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const healthResponse = await getSystemHealth().catch(() => null);
      if (healthResponse) setHealth(healthResponse.data);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
    } finally {
      setIsLoading(false);
    }
  }, [activeProjectId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const totalProjects = projects.length;
  const githubCount = projects.filter((p) => p.github_url).length;
  const zipCount = projects.filter((p) => !p.github_url).length;

  return (
    <div className="relative space-y-8 text-white selection:bg-white selection:text-black">
      {/* Subtle Ambient Background Light Source */}
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(255,255,255,0.035),transparent)]"
        aria-hidden="true"
      />

      {/* Stagger Entrance Animations & Styles */}
      <style>{`
        @keyframes dashEntrance {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes statusPulse {
          0%, 100% { opacity: 0.4; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        .dash-stagger {
          opacity: 0;
          animation: dashEntrance 500ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .pulse-white-dot {
          animation: statusPulse 2.4s infinite ease-in-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .dash-stagger {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* Dashboard Top Header (Stagger 0ms) */}
      <div
        className="dash-stagger relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#202020] pb-6"
        style={{ animationDelay: "0ms" }}
      >
        <div>
          <h1 className="font-sans text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <span>Overview</span>
            <span className="inline-flex size-2.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] pulse-white-dot" />
          </h1>
          <p className="mt-1 text-sm text-[#A3A3A3]">
            Monitor knowledge graphs, project sources, and system operations in real time.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadData()}
          disabled={isLoading}
          className="group relative overflow-hidden flex h-9 items-center gap-2 rounded-lg border border-[#252525] bg-[#0A0A0A] px-4 py-1.5 font-mono text-xs font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(255,255,255,0.25)] hover:bg-[#151515] hover:shadow-[0_4px_20px_rgba(255,255,255,0.06)] disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`size-3.5 transition-transform duration-300 ${isLoading ? "animate-spin" : "group-hover:rotate-180"}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="dash-stagger rounded-xl border border-rose-900/40 bg-rose-950/20 p-4 text-sm text-rose-300" style={{ animationDelay: "40ms" }}>
          <p className="font-semibold text-rose-200">Failed to load dashboard statistics</p>
          <p className="mt-1 text-[#A3A3A3] text-xs">{error}</p>
        </div>
      )}

      {/* Project selector (Stagger 60ms) */}
      <div className="dash-stagger" style={{ animationDelay: "60ms" }}>
        <ProjectSelector
          onSelect={selectProject}
          projects={projects}
          selectedProjectId={activeProjectId}
        />
      </div>

      {/* Active Project Panel (Stagger 120ms) */}
      {activeProject && (
        <div
          ref={activeProjectRef}
          onMouseMove={handleActiveProjectMouseMove}
          style={{ animationDelay: "120ms" }}
          className="dash-stagger group relative overflow-hidden rounded-xl border border-[#292929] bg-[#080808] p-6 shadow-xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-[rgba(255,255,255,0.25)] hover:bg-[#0D0D0D] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_12px_36px_rgba(0,0,0,0.5)]"
        >
          {/* Dynamic Cursor Light Spotlight */}
          <div
            className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background: `radial-gradient(300px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255, 255, 255, 0.05), transparent 75%)`,
            }}
          />

          {/* Top-Left Ambient Highlight */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.04),transparent_40%)]" />

          {/* Light Sweep Line */}
          <div className="pointer-events-none absolute -left-full top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.05)] to-transparent opacity-0 transition-all duration-700 ease-out group-hover:left-full group-hover:opacity-100" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-white bg-[#151515] border border-[#333333] px-2.5 py-0.5 rounded flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-white pulse-white-dot" />
                  Active Workspace Project
                </span>
              </div>
              <h2 className="mt-2.5 text-2xl font-extrabold tracking-tight text-white transition-transform group-hover:translate-x-0.5">
                {activeProject.name}
              </h2>
              <p className="mt-1 font-mono text-xs text-[#A3A3A3]">
                {activeProject.github_url || "ZIP Archive Source Repository"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`/graph?projectId=${activeProjectId}`}
                className="group/btn flex items-center gap-2 rounded-lg border border-[#252525] bg-[#0A0A0A] px-4 py-2 font-mono text-xs font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:border-[#555555] hover:bg-[#151515] hover:shadow-[0_4px_16px_rgba(255,255,255,0.06)]"
              >
                <GitGraph className="size-3.5 transition-transform group-hover/btn:scale-110" />
                <span>View Graph</span>
                <ArrowRight className="size-3 opacity-0 -translate-x-1 transition-all group-hover/btn:opacity-100 group-hover/btn:translate-x-0" />
              </Link>

              <Link
                href={`/chat?projectId=${activeProjectId}`}
                className="group/btn flex items-center gap-2 rounded-lg border border-[#252525] bg-[#0A0A0A] px-4 py-2 font-mono text-xs font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:border-[#555555] hover:bg-[#151515] hover:shadow-[0_4px_16px_rgba(255,255,255,0.06)]"
              >
                <MessageSquare className="size-3.5 transition-transform group-hover/btn:scale-110" />
                <span>Ask Codebase</span>
                <ArrowRight className="size-3 opacity-0 -translate-x-1 transition-all group-hover/btn:opacity-100 group-hover/btn:translate-x-0" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards Section (Staggered 180ms - 360ms) */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Projects"
          value={isLoading ? "..." : String(totalProjects)}
          icon={FolderGit2}
          className="dash-stagger"
          style={{ animationDelay: "180ms" }}
        />
        <StatCard
          label="Scanned Repositories"
          value={isLoading ? "..." : `${githubCount} GitHub / ${zipCount} ZIP`}
          icon={GitBranch}
          className="dash-stagger"
          style={{ animationDelay: "240ms" }}
        />
        <StatCard
          label="Graph Nodes"
          value={isLoading ? "..." : graphStats ? String(graphStats.nodes) : "—"}
          icon={Network}
          className="dash-stagger"
          style={{ animationDelay: "300ms" }}
        />
        <StatCard
          label="Graph Edges"
          value={isLoading ? "..." : graphStats ? String(graphStats.edges) : "—"}
          icon={Activity}
          className="dash-stagger"
          style={{ animationDelay: "360ms" }}
        />
      </section>

      {/* Project-scoped Graph Breakdown (Staggered) */}
      {activeProjectId && graphStats && (
        <section className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Files Indexed"
            value={String(graphStats.files)}
            icon={FolderOpen}
            className="dash-stagger"
            style={{ animationDelay: "400ms" }}
          />
          <StatCard
            label="Functions"
            value={String(graphStats.functions)}
            icon={Code2}
            className="dash-stagger"
            style={{ animationDelay: "440ms" }}
          />
          <StatCard
            label="Classes"
            value={String(graphStats.classes)}
            icon={Boxes}
            className="dash-stagger"
            style={{ animationDelay: "480ms" }}
          />
        </section>
      )}

      {/* Multi-column Panels */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Recent Projects and Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Projects Panel (Stagger 400ms) */}
          <section
            className="dash-stagger group relative overflow-hidden rounded-xl border border-[#242424] bg-[#080808] p-6 transition-all duration-300 hover:border-[#333333] hover:shadow-[0_0_25px_rgba(255,255,255,0.025)]"
            style={{ animationDelay: "400ms" }}
          >
            <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-4 flex items-center justify-between">
              <span>Recent Scans</span>
              <span className="text-[11px] text-[#737373]">{projects.length} workspace entries</span>
            </h2>

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="h-14 animate-pulse rounded-xl bg-[#101010]" />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-[#252525] rounded-xl">
                <FolderGit2 className="size-8 mx-auto text-[#737373]" />
                <p className="mt-2 text-xs text-[#A3A3A3]">No scanned workspace projects yet.</p>
                <Link href="/projects" className="mt-3 inline-flex font-mono text-xs font-semibold text-white underline hover:text-[#A3A3A3]">
                  Add new project
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.slice(0, 5).map((project) => (
                  <div
                    key={project.id}
                    onClick={() => selectProject(project.id)}
                    className={`group/item flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:translate-x-0.5 ${
                      activeProjectId === project.id
                        ? "border-[#333333] bg-[#0E0E0E] shadow-[inset_4px_0_0_0_#ffffff]"
                        : "border-[#202020] bg-[#050505] hover:border-[rgba(255,255,255,0.25)] hover:bg-[#101010]"
                    }`}
                  >
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2 truncate group-hover/item:text-white">
                        <span>{project.name}</span>
                        {activeProjectId === project.id && (
                          <span className="font-mono text-[10px] font-bold text-black bg-white px-2 py-0.5 rounded uppercase flex items-center gap-1">
                            <span className="size-1 rounded-full bg-black animate-pulse" />
                            Active
                          </span>
                        )}
                      </h3>
                      <p className="mt-1 font-mono text-xs text-[#A3A3A3] truncate max-w-md">
                        {project.github_url || "ZIP Archive Upload"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/projects/${project.id}`}
                        className="p-2 rounded-lg border border-[#252525] bg-[#0A0A0A] text-[#A3A3A3] hover:text-white hover:border-[#555555] hover:bg-[#151515] transition-all"
                        title="Browse Workspace Files"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FolderOpen className="size-4" />
                      </Link>
                      <Link
                        href={`/graph?projectId=${project.id}`}
                        className="p-2 rounded-lg border border-[#252525] bg-[#0A0A0A] text-[#A3A3A3] hover:text-white hover:border-[#555555] hover:bg-[#151515] transition-all"
                        title="Visualize Knowledge Graph"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <GitGraph className="size-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Quick Navigation Panel (Stagger 450ms) */}
          <section
            className="dash-stagger group relative overflow-hidden rounded-xl border border-[#242424] bg-[#080808] p-6 transition-all duration-300 hover:border-[#333333] hover:shadow-[0_0_25px_rgba(255,255,255,0.025)]"
            style={{ animationDelay: "450ms" }}
          >
            <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-4">
              Quick Navigation
            </h2>
            <div className="grid gap-4 sm:grid-cols-4">
              <Link
                href="/projects"
                className="group/nav flex flex-col items-center justify-center p-5 rounded-xl border border-[#202020] bg-[#050505] text-[#A3A3A3] hover:text-white hover:bg-[#101010] hover:border-[rgba(255,255,255,0.25)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] text-center"
              >
                <Plus className="size-5 mb-2.5 text-white transition-all duration-300 group-hover/nav:scale-110 group-hover/nav:-translate-y-0.5 group-hover/nav:rotate-3" />
                <span className="font-mono text-xs font-semibold text-white flex items-center gap-1">
                  <span>New Project</span>
                  <ArrowRight className="size-3 opacity-0 -translate-x-1 transition-all group-hover/nav:opacity-100 group-hover/nav:translate-x-0.5" />
                </span>
              </Link>

              <Link
                href={activeProjectId ? `/graph?projectId=${activeProjectId}` : "/graph"}
                className="group/nav flex flex-col items-center justify-center p-5 rounded-xl border border-[#202020] bg-[#050505] text-[#A3A3A3] hover:text-white hover:bg-[#101010] hover:border-[rgba(255,255,255,0.25)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] text-center"
              >
                <GitGraph className="size-5 mb-2.5 text-white transition-all duration-300 group-hover/nav:scale-110 group-hover/nav:-translate-y-0.5 group-hover/nav:rotate-3" />
                <span className="font-mono text-xs font-semibold text-white flex items-center gap-1">
                  <span>Open Graph</span>
                  <ArrowRight className="size-3 opacity-0 -translate-x-1 transition-all group-hover/nav:opacity-100 group-hover/nav:translate-x-0.5" />
                </span>
              </Link>

              <Link
                href={activeProjectId ? `/repository?projectId=${activeProjectId}` : "/repository"}
                className="group/nav flex flex-col items-center justify-center p-5 rounded-xl border border-[#202020] bg-[#050505] text-[#A3A3A3] hover:text-white hover:bg-[#101010] hover:border-[rgba(255,255,255,0.25)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] text-center"
              >
                <FolderOpen className="size-5 mb-2.5 text-white transition-all duration-300 group-hover/nav:scale-110 group-hover/nav:-translate-y-0.5 group-hover/nav:rotate-3" />
                <span className="font-mono text-xs font-semibold text-white flex items-center gap-1">
                  <span>Browse Repo</span>
                  <ArrowRight className="size-3 opacity-0 -translate-x-1 transition-all group-hover/nav:opacity-100 group-hover/nav:translate-x-0.5" />
                </span>
              </Link>

              <Link
                href={activeProjectId ? `/chat?projectId=${activeProjectId}` : "/chat"}
                className="group/nav flex flex-col items-center justify-center p-5 rounded-xl border border-[#202020] bg-[#050505] text-[#A3A3A3] hover:text-white hover:bg-[#101010] hover:border-[rgba(255,255,255,0.25)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] text-center"
              >
                <MessageSquare className="size-5 mb-2.5 text-white transition-all duration-300 group-hover/nav:scale-110 group-hover/nav:-translate-y-0.5 group-hover/nav:rotate-3" />
                <span className="font-mono text-xs font-semibold text-white flex items-center gap-1">
                  <span>Ask Codebase</span>
                  <ArrowRight className="size-3 opacity-0 -translate-x-1 transition-all group-hover/nav:opacity-100 group-hover/nav:translate-x-0.5" />
                </span>
              </Link>
            </div>
          </section>
        </div>

        {/* Right Column: System Status (Stagger 500ms) */}
        <div className="space-y-6">
          <section
            className="dash-stagger group relative overflow-hidden rounded-xl border border-[#242424] bg-[#080808] p-6 h-full flex flex-col justify-between transition-all duration-300 hover:border-[#333333] hover:shadow-[0_0_25px_rgba(255,255,255,0.025)]"
            style={{ animationDelay: "500ms" }}
          >
            <div>
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-4 flex items-center gap-2">
                <Server className="size-4 text-white" /> System Services Status
              </h2>
              <div className="space-y-3.5">
                <div className="flex items-center justify-between p-4 rounded-xl border border-[#202020] bg-[#050505] transition-all hover:border-[rgba(255,255,255,0.2)] hover:bg-[#101010]">
                  <span className="font-mono text-xs font-semibold text-white">FastAPI Server</span>
                  <span className="flex items-center gap-2 text-xs font-medium text-white">
                    <span className="relative flex size-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex size-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
                    </span>
                    <span>Online</span>
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-[#202020] bg-[#050505] transition-all hover:border-[rgba(255,255,255,0.2)] hover:bg-[#101010]">
                  <span className="font-mono text-xs font-semibold text-white">PostgreSQL</span>
                  {isLoading ? (
                    <span className="font-mono text-xs text-[#737373]">Checking...</span>
                  ) : health?.postgres ? (
                    <span className="flex items-center gap-2 text-xs font-medium text-white">
                      <span className="relative flex size-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                        <span className="relative inline-flex size-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
                      </span>
                      <span>Connected</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-xs font-medium text-[#737373]">
                      <span className="size-2.5 rounded-full bg-[#333333]" />
                      <span>Offline</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-[#202020] bg-[#050505] transition-all hover:border-[rgba(255,255,255,0.2)] hover:bg-[#101010]">
                  <span className="font-mono text-xs font-semibold text-white">Neo4j Graph Database</span>
                  {isLoading ? (
                    <span className="font-mono text-xs text-[#737373]">Checking...</span>
                  ) : health?.neo4j ? (
                    <span className="flex items-center gap-2 text-xs font-medium text-white">
                      <span className="relative flex size-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                        <span className="relative inline-flex size-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
                      </span>
                      <span>Connected</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-xs font-medium text-[#737373]">
                      <span className="size-2.5 rounded-full bg-[#333333]" />
                      <span>Offline</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-[#202020] pt-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#737373] leading-relaxed">
                CodeGraph AI operates on top of PostgreSQL for file catalog metadata, and Neo4j for relationship mapping.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
