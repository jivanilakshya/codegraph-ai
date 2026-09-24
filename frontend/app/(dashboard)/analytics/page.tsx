"use client";

import {
  AlertCircle,
  BarChart3,
  Code2,
  FileCode2,
  GitFork,
  GitMerge,
  Info,
  Layers3,
  Network,
  RefreshCw,
  ShieldAlert,
  Sigma,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ProjectSelector } from "@/components/developer/ProjectSelector";
import { StatCard } from "@/components/ui/StatCard";
import { useActiveProject } from "@/hooks/useActiveProject";
import { getProjectCircularDependencies } from "@/services/circular_dependency";
import { getProjectCodeQuality } from "@/services/code_quality";
import { getProjectComplexity } from "@/services/complexity";
import { getProjectDeadCode } from "@/services/dead_code";
import { getProjectGraphStats } from "@/services/developer";
import { getProjectGraph } from "@/services/graph";
import { getRepositoryWorkspace } from "@/services/workspace";
import type { CircularDependencyResponse } from "@/types/circular_dependency";
import type { CodeQualityResponse } from "@/types/code_quality";
import type { ComplexityResponse } from "@/types/complexity";
import type { DeadCodeResponse } from "@/types/dead_code";
import type { GraphStatsResponse } from "@/types/developer";
import type { ProjectGraph } from "@/types/graph";
import type { RepositoryWorkspace } from "@/types/workspace";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Resource<T> = { data: T | null; error: string | null; loading: boolean };

const pending = <T,>(): Resource<T> => ({ data: null, error: null, loading: true });
const idle = <T,>(): Resource<T> => ({ data: null, error: null, loading: false });

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function formatBytes(value: number) {
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function gradeColor(grade: string) {
  if (grade === "A") return "text-emerald-400";
  if (grade === "B") return "text-cyan-400";
  if (grade === "C") return "text-amber-400";
  if (grade === "D") return "text-orange-400";
  return "text-rose-400";
}

// ---------------------------------------------------------------------------
// Skeleton / state components
// ---------------------------------------------------------------------------

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-800/60 ${className}`}
      aria-hidden="true"
    />
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-rose-500/25 bg-rose-500/8 p-4 text-sm text-rose-200">
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-400" aria-hidden="true" />
      <div>
        <p className="font-semibold">Unable to load this section</p>
        <p className="mt-0.5 text-rose-200/70">{message}</p>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  iconColor = "text-cyan-400",
  children,
  right,
}: {
  title: string;
  icon: React.ElementType;
  iconColor?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/45 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className={`size-4 ${iconColor}`} aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Language distribution bar
// ---------------------------------------------------------------------------

function LanguageBar({
  language,
  count,
  max,
  bytes,
}: {
  language: string;
  count: number;
  max: number;
  bytes: number;
}) {
  const pct = Math.max(3, (count / max) * 100);
  const colors: Record<string, string> = {
    Python: "from-blue-500 to-cyan-400",
    TypeScript: "from-cyan-500 to-blue-400",
    JavaScript: "from-yellow-500 to-amber-400",
    Java: "from-orange-500 to-red-400",
    Go: "from-sky-500 to-cyan-400",
    Rust: "from-orange-600 to-amber-500",
    "C++": "from-violet-500 to-purple-400",
    C: "from-slate-500 to-slate-400",
    Ruby: "from-red-500 to-rose-400",
    PHP: "from-indigo-500 to-violet-400",
    Swift: "from-orange-400 to-amber-300",
    Kotlin: "from-violet-600 to-purple-500",
    Unknown: "from-slate-600 to-slate-500",
  };
  const gradient = colors[language] ?? "from-cyan-500 to-blue-500";
  return (
    <div className="grid grid-cols-[minmax(0,8rem)_1fr_auto_auto] items-center gap-3 text-xs">
      <span className="truncate font-mono text-slate-200">{language}</span>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="tabular-nums text-slate-400">{count} files</span>
      <span className="tabular-nums text-slate-600">{formatBytes(bytes)}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Metric row (for code structure / quality lists)
// ---------------------------------------------------------------------------

function MetricRow({
  label,
  value,
  tone = "text-slate-200",
}: {
  label: string;
  value: React.ReactNode;
  tone?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className={`font-semibold tabular-nums ${tone}`}>{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Relationship type breakdown row
// ---------------------------------------------------------------------------

function RelRow({
  type,
  count,
  total,
  description,
  color,
}: {
  type: string;
  count: number;
  total: number;
  description: string;
  color: string;
}) {
  const pct = total > 0 ? Math.max(2, (count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono font-semibold text-slate-200">{type}</span>
        <div className="flex items-center gap-3">
          <span className="text-slate-500">{description}</span>
          <span className="tabular-nums text-slate-300">{count.toLocaleString()}</span>
        </div>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyProjectState({
  projects,
  activeProjectId,
  selectProject,
}: {
  projects: import("@/types/project").Project[];
  activeProjectId: number | null;
  selectProject: (id: number) => void;
}) {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-800 pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-400">
            CodeGraph AI
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-50">Analytics</h1>
        </div>
        <ProjectSelector
          projects={projects}
          selectedProjectId={activeProjectId}
          onSelect={selectProject}
        />
      </header>
      <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/30 p-14 text-center">
        <BarChart3 className="mx-auto mb-3 size-8 text-slate-600" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-400">Select a project to view analytics</p>
        <p className="mt-1 text-xs text-slate-600">
          Real-time statistics will load from your indexed repository.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AnalyticsPage() {
  const {
    projects,
    activeProject,
    activeProjectId,
    isLoadingProjects,
    errorLoadingProjects,
    selectProject,
  } = useActiveProject();

  const [workspace, setWorkspace] = useState<Resource<RepositoryWorkspace>>(idle());
  const [graphStats, setGraphStats] = useState<Resource<GraphStatsResponse>>(idle());
  const [graph, setGraph] = useState<Resource<ProjectGraph>>(idle());
  const [quality, setQuality] = useState<Resource<CodeQualityResponse>>(idle());
  const [complexity, setComplexity] = useState<Resource<ComplexityResponse>>(idle());
  const [deadCode, setDeadCode] = useState<Resource<DeadCodeResponse>>(idle());
  const [cycles, setCycles] = useState<Resource<CircularDependencyResponse>>(idle());

  const isAnyLoading =
    workspace.loading ||
    graphStats.loading ||
    graph.loading ||
    quality.loading ||
    complexity.loading ||
    deadCode.loading ||
    cycles.loading;

  const loadAll = useCallback(async () => {
    if (!activeProjectId) {
      setWorkspace(idle());
      setGraphStats(idle());
      setGraph(idle());
      setQuality(idle());
      setComplexity(idle());
      setDeadCode(idle());
      setCycles(idle());
      return;
    }

    setWorkspace(pending());
    setGraphStats(pending());
    setGraph(pending());
    setQuality(pending());
    setComplexity(pending());
    setDeadCode(pending());
    setCycles(pending());

    const loadOne = async <T,>(
      request: () => Promise<T>,
      set: (v: Resource<T>) => void,
    ) => {
      try {
        set({ data: await request(), error: null, loading: false });
      } catch (err) {
        set({
          data: null,
          error: err instanceof Error ? err.message : "Request failed.",
          loading: false,
        });
      }
    };

    await Promise.all([
      loadOne(() => getRepositoryWorkspace(activeProjectId), setWorkspace),
      loadOne(async () => (await getProjectGraphStats(activeProjectId)).data, setGraphStats),
      loadOne(() => getProjectGraph(activeProjectId), setGraph),
      loadOne(async () => (await getProjectCodeQuality(activeProjectId)).data, setQuality),
      loadOne(async () => (await getProjectComplexity(activeProjectId)).data, setComplexity),
      loadOne(async () => (await getProjectDeadCode(activeProjectId)).data, setDeadCode),
      loadOne(
        async () => (await getProjectCircularDependencies(activeProjectId)).data,
        setCycles,
      ),
    ]);
  }, [activeProjectId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------

  const languages = useMemo(() => {
    const counts = new Map<string, { count: number; bytes: number }>();
    workspace.data?.files.forEach((file) => {
      const lang = file.language ?? "Unknown";
      const existing = counts.get(lang) ?? { count: 0, bytes: 0 };
      counts.set(lang, { count: existing.count + 1, bytes: existing.bytes + file.size });
    });
    return [...counts.entries()]
      .map(([lang, stats]) => ({ lang, ...stats }))
      .sort((a, b) => b.count - a.count);
  }, [workspace.data]);

  const totalRepoBytes = useMemo(
    () => workspace.data?.files.reduce((acc, f) => acc + f.size, 0) ?? 0,
    [workspace.data],
  );

  const relCounts = useMemo(() => {
    if (!graph.data) return null;
    const counts: Record<string, number> = {};
    for (const edge of graph.data.edges) {
      counts[edge.type] = (counts[edge.type] ?? 0) + 1;
    }
    return counts;
  }, [graph.data]);

  const totalRelationships = useMemo(() => {
    if (!relCounts) return graphStats.data?.edges ?? 0;
    return Object.values(relCounts).reduce((a, b) => a + b, 0);
  }, [relCounts, graphStats.data]);

  const maxLangCount = languages[0]?.count ?? 1;

  // -------------------------------------------------------------------------
  // Loading / error states
  // -------------------------------------------------------------------------

  if (isLoadingProjects) {
    return (
      <div className="flex h-48 items-center justify-center gap-2 text-sm text-slate-400">
        <RefreshCw className="size-4 animate-spin text-cyan-400" />
        Loading projects…
      </div>
    );
  }

  if (errorLoadingProjects) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-200">
        <p className="font-semibold">Failed to load projects</p>
        <p className="mt-1 text-rose-200/70">{errorLoadingProjects}</p>
      </div>
    );
  }

  if (!activeProjectId || !activeProject) {
    return (
      <EmptyProjectState
        projects={projects}
        activeProjectId={activeProjectId}
        selectProject={selectProject}
      />
    );
  }

  // -------------------------------------------------------------------------
  // Full dashboard render
  // -------------------------------------------------------------------------

  const qualitySummary = quality.data?.summary;

  const relTypes: {
    type: string;
    description: string;
    color: string;
  }[] = [
    { type: "IMPORTS", description: "File-level import dependencies", color: "bg-cyan-500" },
    { type: "CALLS", description: "Function / method call chains", color: "bg-blue-500" },
    { type: "DECLARES", description: "File → entity declarations", color: "bg-violet-500" },
    { type: "EXTENDS", description: "Class inheritance edges", color: "bg-amber-500" },
    { type: "HAS_METHOD", description: "Class → method membership", color: "bg-emerald-500" },
    { type: "CONTAINS", description: "Module/project containment", color: "bg-slate-500" },
    { type: "HANDLES", description: "API route → handler entity", color: "bg-rose-500" },
  ];

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 220ms ease-out forwards; }
      `}</style>

      {/* ------------------------------------------------------------------ */}
      {/* Page header                                                         */}
      {/* ------------------------------------------------------------------ */}
      <header className="border-b border-slate-800 pb-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-400">
              CodeGraph AI
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-50">Analytics</h1>
              <span className="rounded-md border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 font-mono text-xs text-cyan-200">
                {activeProject.name}
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              Real-time statistics from the indexed project graph and static analysis.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto xl:shrink-0">
            <ProjectSelector
              projects={projects}
              selectedProjectId={activeProjectId}
              onSelect={selectProject}
            />
            <button
              type="button"
              onClick={() => void loadAll()}
              disabled={isAnyLoading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-medium text-slate-200 transition-colors hover:border-cyan-500/40 hover:text-cyan-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`size-4 ${isAnyLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* 1. Overview cards                                                   */}
      {/* ------------------------------------------------------------------ */}
      <section aria-labelledby="overview-heading">
        <div className="mb-3 flex items-center gap-2">
          <Network className="size-4 text-cyan-400" aria-hidden="true" />
          <h2 id="overview-heading" className="text-sm font-semibold text-slate-200">
            Project overview
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Indexed files"
            value={
              workspace.loading
                ? "…"
                : workspace.error
                  ? "—"
                  : String(workspace.data?.files.length ?? 0)
            }
            icon={FileCode2}
          />
          <StatCard
            label="Languages"
            value={
              workspace.loading ? "…" : workspace.error ? "—" : String(languages.length)
            }
            icon={Code2}
          />
          <StatCard
            label="Graph entities"
            value={
              graphStats.loading
                ? "…"
                : graphStats.error
                  ? "—"
                  : String(graphStats.data?.nodes ?? 0)
            }
            icon={Network}
          />
          <StatCard
            label="Relationships"
            value={
              graph.loading && graphStats.loading
                ? "…"
                : graph.error && graphStats.error
                  ? "—"
                  : String(totalRelationships)
            }
            icon={GitFork}
          />
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Language distribution + Code structure                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid gap-5 xl:grid-cols-2">
        {/* Language distribution */}
        <SectionCard
          title="Language distribution"
          icon={Code2}
          right={
            !workspace.loading && !workspace.error && totalRepoBytes > 0 ? (
              <span className="font-mono text-xs text-slate-500">{formatBytes(totalRepoBytes)}</span>
            ) : undefined
          }
        >
          {workspace.loading ? (
            <div className="space-y-3 pt-1">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          ) : workspace.error ? (
            <ErrorBanner message={workspace.error} />
          ) : languages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
              No files are indexed yet. Run a project scan first.
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {languages.map(({ lang, count, bytes }) => (
                <LanguageBar
                  key={lang}
                  language={lang}
                  count={count}
                  max={maxLangCount}
                  bytes={bytes}
                />
              ))}
            </div>
          )}
        </SectionCard>

        {/* Code structure */}
        <SectionCard title="Code structure" icon={Layers3} iconColor="text-violet-400">
          {graphStats.loading ? (
            <div className="space-y-2 pt-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : graphStats.error ? (
            <ErrorBanner message={graphStats.error} />
          ) : !graphStats.data ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
              No graph data available. Run a project scan first.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              <MetricRow label="Files (graph nodes)" value={graphStats.data.files} />
              <MetricRow
                label="Functions"
                value={graphStats.data.functions}
                tone="text-cyan-300"
              />
              <MetricRow
                label="Classes"
                value={graphStats.data.classes}
                tone="text-violet-300"
              />
              <MetricRow
                label="Methods"
                value={
                  graphStats.data.nodes -
                  graphStats.data.files -
                  graphStats.data.functions -
                  graphStats.data.classes
                }
                tone="text-blue-300"
              />
              <MetricRow
                label="Total entities"
                value={graphStats.data.nodes}
                tone="text-slate-100"
              />
              <MetricRow
                label="Total relationships"
                value={totalRelationships}
                tone="text-slate-100"
              />
              {workspace.data && (
                <MetricRow
                  label="Repository size"
                  value={formatBytes(totalRepoBytes)}
                  tone="text-slate-400"
                />
              )}
            </div>
          )}
        </SectionCard>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Dependency / relationship analysis                               */}
      {/* ------------------------------------------------------------------ */}
      <SectionCard
        title="Dependency & relationship analysis"
        icon={GitMerge}
        iconColor="text-blue-400"
        right={
          graph.data && !graph.data.truncated ? undefined : graph.data?.truncated ? (
            <span className="flex items-center gap-1 text-xs text-amber-400/80">
              <Info className="size-3" />
              Graph truncated — counts may be partial
            </span>
          ) : undefined
        }
      >
        {graph.loading ? (
          <div className="space-y-4 pt-1">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : graph.error ? (
          <ErrorBanner message={graph.error} />
        ) : !relCounts || Object.keys(relCounts).length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
            No relationship data available. Scan the project to populate the graph.
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {relTypes
              .filter(({ type }) => (relCounts[type] ?? 0) > 0)
              .map(({ type, description, color }) => (
                <RelRow
                  key={type}
                  type={type}
                  count={relCounts[type] ?? 0}
                  total={totalRelationships}
                  description={description}
                  color={color}
                />
              ))}
            {/* Show any unexpected types not in the known list */}
            {Object.entries(relCounts)
              .filter(([type]) => !relTypes.find((r) => r.type === type))
              .map(([type, count]) => (
                <RelRow
                  key={type}
                  type={type}
                  count={count}
                  total={totalRelationships}
                  description="Relationship"
                  color="bg-slate-400"
                />
              ))}
            <div className="flex justify-end border-t border-slate-800 pt-2 text-xs text-slate-500">
              Total:{" "}
              <span className="ml-1 font-semibold text-slate-300">
                {totalRelationships.toLocaleString()} relationships
              </span>
            </div>
          </div>
        )}
      </SectionCard>

      {/* ------------------------------------------------------------------ */}
      {/* 4. Code quality                                                     */}
      {/* ------------------------------------------------------------------ */}
      <section aria-labelledby="quality-heading">
        <div className="mb-3 flex items-center gap-2">
          <ShieldAlert className="size-4 text-amber-400" aria-hidden="true" />
          <h2 id="quality-heading" className="text-sm font-semibold text-slate-200">
            Code quality
          </h2>
        </div>

        {quality.loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : quality.error ? (
          <ErrorBanner message={quality.error} />
        ) : !qualitySummary ? (
          <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
            Quality metrics not available. Scan the project to generate analysis.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {/* Overall score */}
            <article className="rounded-xl border border-slate-800 bg-slate-950/45 p-5">
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-amber-400" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-slate-100">Overall health</h3>
              </div>
              <div className="mt-4 flex items-end gap-4">
                <span
                  className={`text-5xl font-bold tabular-nums ${gradeColor(qualitySummary.quality_grade)}`}
                >
                  {qualitySummary.quality_grade}
                </span>
                <span className="mb-1 text-2xl font-semibold text-slate-300">
                  {qualitySummary.overall_score}
                  <span className="text-base font-normal text-slate-500">/100</span>
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    qualitySummary.overall_score >= 80
                      ? "bg-emerald-400"
                      : qualitySummary.overall_score >= 60
                        ? "bg-amber-400"
                        : "bg-rose-400"
                  }`}
                  style={{ width: `${qualitySummary.overall_score}%` }}
                />
              </div>
            </article>

            {/* Complexity */}
            <article className="rounded-xl border border-slate-800 bg-slate-950/45 p-5">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-violet-400" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-slate-100">Cyclomatic complexity</h3>
              </div>
              {complexity.loading ? (
                <div className="mt-4 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-5" />
                  ))}
                </div>
              ) : complexity.error ? (
                <p className="mt-3 text-xs text-rose-300">{complexity.error}</p>
              ) : (
                <div className="mt-4 divide-y divide-slate-800/60">
                  <MetricRow
                    label="Avg. complexity"
                    value={complexity.data?.summary.average_complexity.toFixed(1) ?? "—"}
                    tone="text-slate-200"
                  />
                  <MetricRow
                    label="Max complexity"
                    value={complexity.data?.summary.max_complexity ?? "—"}
                    tone={
                      (complexity.data?.summary.max_complexity ?? 0) > 10
                        ? "text-rose-300"
                        : "text-slate-200"
                    }
                  />
                  <MetricRow
                    label="High (>10)"
                    value={qualitySummary.high_complexity_count}
                    tone={qualitySummary.high_complexity_count > 0 ? "text-rose-300" : "text-emerald-400"}
                  />
                  <MetricRow
                    label="Medium (6–10)"
                    value={qualitySummary.medium_complexity_count}
                    tone={qualitySummary.medium_complexity_count > 0 ? "text-amber-300" : "text-slate-200"}
                  />
                  <MetricRow
                    label="Low (1–5)"
                    value={qualitySummary.low_complexity_count}
                    tone="text-emerald-400"
                  />
                </div>
              )}
            </article>

            {/* Dead code & cycles */}
            <article className="rounded-xl border border-slate-800 bg-slate-950/45 p-5">
              <div className="flex items-center gap-2">
                <Sigma className="size-4 text-rose-400" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-slate-100">Static analysis</h3>
              </div>
              <div className="mt-4 divide-y divide-slate-800/60">
                {/* Dead code */}
                {deadCode.loading ? (
                  <Skeleton className="mb-2 h-5 w-full" />
                ) : (
                  <>
                    <MetricRow
                      label="Dead code candidates"
                      value={deadCode.data?.total_candidates ?? (deadCode.error ? "—" : "N/A")}
                      tone={
                        deadCode.error
                          ? "text-slate-500"
                          : (deadCode.data?.total_candidates ?? 0) > 0
                            ? "text-amber-300"
                            : "text-emerald-400"
                      }
                    />
                    <MetricRow
                      label="High-confidence dead code"
                      value={
                        deadCode.data
                          ? qualitySummary.dead_code_high_confidence_count
                          : deadCode.error
                            ? "—"
                            : "N/A"
                      }
                      tone={
                        deadCode.error
                          ? "text-slate-500"
                          : qualitySummary.dead_code_high_confidence_count > 0
                            ? "text-rose-300"
                            : "text-emerald-400"
                      }
                    />
                  </>
                )}

                {/* Circular dependencies */}
                {cycles.loading ? (
                  <Skeleton className="mt-2 h-5 w-full" />
                ) : (
                  <>
                    <MetricRow
                      label="Circular dependencies"
                      value={
                        cycles.data?.summary.total_cycles ??
                        (cycles.error ? "—" : "N/A")
                      }
                      tone={
                        cycles.error
                          ? "text-slate-500"
                          : (cycles.data?.summary.total_cycles ?? 0) > 0
                            ? "text-amber-300"
                            : "text-emerald-400"
                      }
                    />
                    <MetricRow
                      label="High-severity cycles"
                      value={
                        cycles.data
                          ? qualitySummary.high_circular_dependency_count
                          : cycles.error
                            ? "—"
                            : "N/A"
                      }
                      tone={
                        cycles.error
                          ? "text-slate-500"
                          : qualitySummary.high_circular_dependency_count > 0
                            ? "text-rose-300"
                            : "text-emerald-400"
                      }
                    />
                  </>
                )}
              </div>
            </article>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 5. Dead code type breakdown                                         */}
      {/* ------------------------------------------------------------------ */}
      <SectionCard
        title="Dead code breakdown"
        icon={BarChart3}
        iconColor="text-amber-400"
        right={
          deadCode.data ? (
            <span className="font-mono text-xs text-slate-500">
              {deadCode.data.total_candidates} candidate{deadCode.data.total_candidates !== 1 ? "s" : ""}
            </span>
          ) : undefined
        }
      >
        {deadCode.loading ? (
          <div className="grid gap-3 sm:grid-cols-3 pt-1">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : deadCode.error ? (
          <ErrorBanner message={deadCode.error} />
        ) : !deadCode.data || deadCode.data.total_candidates === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
            {deadCode.data
              ? "No dead code candidates detected. "
              : "No dead code analysis available. "}
            {!deadCode.data && "Run a project scan to analyse."}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5 pt-1">
            {(
              [
                ["Files", deadCode.data.summary.files],
                ["Classes", deadCode.data.summary.classes],
                ["Functions", deadCode.data.summary.functions],
                ["Methods", deadCode.data.summary.methods],
                ["Variables", deadCode.data.summary.variables],
              ] as [string, number][]
            ).map(([label, count]) => (
              <div
                key={label}
                className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-center"
              >
                <p className="text-xs text-slate-500">{label}</p>
                <p
                  className={`mt-2 text-2xl font-semibold tabular-nums ${
                    count > 0 ? "text-amber-300" : "text-slate-600"
                  }`}
                >
                  {count}
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
