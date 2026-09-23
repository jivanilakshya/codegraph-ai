"use client";

import { Activity, FolderGit2, GitBranch, Network, RefreshCw, Plus, GitGraph, FolderOpen, Server, CheckCircle2, XCircle, MessageSquare, Code2, Boxes } from "lucide-react";
import { useEffect, useState, useCallback } from "react";

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
    <div className="space-y-8 animate-fade-in">
      {/* CSS Animation helper */}
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
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Overview</h1>
          <p className="mt-1 text-sm text-slate-400">
            Monitor knowledge graphs, project sources, and system operations.
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

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          <p className="font-semibold text-rose-100">Failed to load dashboard statistics</p>
          <p className="mt-1 text-slate-400">{error}</p>
        </div>
      )}

      {/* Project selector */}
      <ProjectSelector
        onSelect={selectProject}
        projects={projects}
        selectedProjectId={activeProjectId}
      />

      {/* Active Project Banner */}
      {activeProject && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Active Project</p>
              <h2 className="mt-1 text-lg font-bold text-slate-100">{activeProject.name}</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {activeProject.github_url || "ZIP Archive Upload"}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/graph?projectId=${activeProjectId}`}
                className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-cyan-500/30 hover:text-cyan-100 transition-colors"
              >
                <GitGraph className="size-3.5" /> View Graph
              </Link>
              <Link
                href={`/chat?projectId=${activeProjectId}`}
                className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-cyan-500/30 hover:text-cyan-100 transition-colors"
              >
                <MessageSquare className="size-3.5" /> Ask Codebase
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards Section */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Projects"
          value={isLoading ? "..." : String(totalProjects)}
          icon={FolderGit2}
        />
        <StatCard
          label="Scanned Repositories"
          value={isLoading ? "..." : `${githubCount} GitHub / ${zipCount} ZIP`}
          icon={GitBranch}
        />
        <StatCard
          label="Graph Nodes"
          value={isLoading ? "..." : graphStats ? String(graphStats.nodes) : "—"}
          icon={Network}
        />
        <StatCard
          label="Graph Edges"
          value={isLoading ? "..." : graphStats ? String(graphStats.edges) : "—"}
          icon={Activity}
        />
      </section>

      {/* Project-scoped Graph Breakdown */}
      {activeProjectId && graphStats && (
        <section className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Files Indexed"
            value={String(graphStats.files)}
            icon={FolderOpen}
          />
          <StatCard
            label="Functions"
            value={String(graphStats.functions)}
            icon={Code2}
          />
          <StatCard
            label="Classes"
            value={String(graphStats.classes)}
            icon={Boxes}
          />
        </section>
      )}

      {/* Multi-column Panels */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Recent Projects and Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Projects Panel */}
          <section className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 backdrop-blur-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Recent Scans</h2>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="h-14 animate-pulse rounded-lg bg-slate-900/60" />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-800 rounded-lg">
                <FolderGit2 className="size-8 mx-auto text-slate-700" />
                <p className="mt-2 text-xs text-slate-500">No scanned workspace projects yet.</p>
                <Link href="/projects" className="mt-3 inline-flex text-xs font-semibold text-cyan-400 hover:underline">
                  Add new project
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.slice(0, 5).map((project) => (
                  <div
                    key={project.id}
                    onClick={() => selectProject(project.id)}
                    className={`group flex items-center justify-between p-3.5 rounded-lg border cursor-pointer transition-colors ${
                      activeProjectId === project.id
                        ? "border-cyan-500/30 bg-cyan-500/5"
                        : "border-slate-800/80 bg-slate-950/65 hover:border-slate-700 hover:bg-slate-950"
                    }`}
                  >
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-200 group-hover:text-slate-100 truncate">
                        {project.name}
                        {activeProjectId === project.id && (
                          <span className="ml-2 text-[10px] font-medium text-cyan-400 uppercase">Active</span>
                        )}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500 truncate max-w-md">
                        {project.github_url || "ZIP Archive Upload"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/projects/${project.id}`}
                        className="p-1.5 rounded text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-colors"
                        title="Browse Workspace Files"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FolderOpen className="size-4" />
                      </Link>
                      <Link
                        href={`/graph?projectId=${project.id}`}
                        className="p-1.5 rounded text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-colors"
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

          {/* Quick Actions Panel */}
          <section className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 backdrop-blur-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Quick Navigation</h2>
            <div className="grid gap-4 sm:grid-cols-4">
              <Link
                href="/projects"
                className="flex flex-col items-center justify-center p-4 rounded-lg border border-slate-800 bg-slate-950/50 text-slate-300 hover:border-cyan-500/20 hover:text-cyan-300 hover:bg-slate-900/40 transition-all text-center"
              >
                <Plus className="size-5 mb-2" />
                <span className="text-xs font-semibold">New Project</span>
              </Link>
              <Link
                href={activeProjectId ? `/graph?projectId=${activeProjectId}` : "/graph"}
                className="flex flex-col items-center justify-center p-4 rounded-lg border border-slate-800 bg-slate-950/50 text-slate-300 hover:border-cyan-500/20 hover:text-cyan-300 hover:bg-slate-900/40 transition-all text-center"
              >
                <GitGraph className="size-5 mb-2" />
                <span className="text-xs font-semibold">Open Graph</span>
              </Link>
              <Link
                href={activeProjectId ? `/repository?projectId=${activeProjectId}` : "/repository"}
                className="flex flex-col items-center justify-center p-4 rounded-lg border border-slate-800 bg-slate-950/50 text-slate-300 hover:border-cyan-500/20 hover:text-cyan-300 hover:bg-slate-900/40 transition-all text-center"
              >
                <FolderOpen className="size-5 mb-2" />
                <span className="text-xs font-semibold">Browse Repository</span>
              </Link>
              <Link
                href={activeProjectId ? `/chat?projectId=${activeProjectId}` : "/chat"}
                className="flex flex-col items-center justify-center p-4 rounded-lg border border-slate-800 bg-slate-950/50 text-slate-300 hover:border-cyan-500/20 hover:text-cyan-300 hover:bg-slate-900/40 transition-all text-center"
              >
                <MessageSquare className="size-5 mb-2" />
                <span className="text-xs font-semibold">Ask Codebase</span>
              </Link>
            </div>
          </section>
        </div>

        {/* Right Column: System Status */}
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 backdrop-blur-sm h-full">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <Server className="size-4" /> System Services Status
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-800 bg-slate-950/65">
                <span className="text-xs font-semibold tracking-wide text-slate-300">FastAPI Server</span>
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <CheckCircle2 className="size-4 shrink-0" /> Online
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-800 bg-slate-950/65">
                <span className="text-xs font-semibold tracking-wide text-slate-300">PostgreSQL</span>
                {isLoading ? (
                  <span className="text-xs text-slate-500">Checking...</span>
                ) : health?.postgres ? (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <CheckCircle2 className="size-4 shrink-0" /> Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
                    <XCircle className="size-4 shrink-0" /> Offline
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-800 bg-slate-950/65">
                <span className="text-xs font-semibold tracking-wide text-slate-300">Neo4j Graph Database</span>
                {isLoading ? (
                  <span className="text-xs text-slate-500">Checking...</span>
                ) : health?.neo4j ? (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <CheckCircle2 className="size-4 shrink-0" /> Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
                    <XCircle className="size-4 shrink-0" /> Offline
                  </span>
                )}
              </div>
            </div>

            <div className="mt-8 border-t border-slate-800/80 pt-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 leading-relaxed">
                CodeGraph AI operates on top of PostgreSQL for file catalog metadata, and Neo4j for relationship mapping.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
