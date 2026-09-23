"use client";

import Link from "next/link";
import {
  ArrowRight, Bot, Braces, CircleDot, Code2, FileCode2,
  FolderOpen, Gauge, GitBranch, GitFork, GitGraph, Layers3, MessageSquare,
  Network, RefreshCw, SearchCode, ShieldAlert, Sparkles, Workflow,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ProjectSelector } from "@/components/developer/ProjectSelector";
import { ApiTester } from "@/components/developer/ApiTester";
import { DatabaseExplorer } from "@/components/developer/DatabaseExplorer";
import { DockerStatus } from "@/components/developer/DockerStatus";
import { HealthDashboard } from "@/components/developer/HealthDashboard";
import { QuickActions } from "@/components/developer/QuickActions";
import { SystemOverview } from "@/components/developer/SystemOverview";
import { StatCard } from "@/components/ui/StatCard";
import { useActiveProject } from "@/hooks/useActiveProject";
import { buildSourceLocationUrl } from "@/lib/navigation";
import { getProjectCircularDependencies } from "@/services/circular_dependency";
import { getProjectComplexity } from "@/services/complexity";
import { getProjectDeadCode } from "@/services/dead_code";
import { DeveloperRequestError, developerRequest, getProjectGraphStats, getSystemHealth } from "@/services/developer";
import { getRepositoryWorkspace } from "@/services/workspace";
import type { CircularDependencyResponse } from "@/types/circular_dependency";
import type { ComplexityResponse } from "@/types/complexity";
import type { DeadCodeResponse } from "@/types/dead_code";
import type { ApiEndpoint, GraphStatsResponse, HealthResponse, QuickAction } from "@/types/developer";
import type { RepositoryFile, RepositoryWorkspace } from "@/types/workspace";

type Resource<T> = { data: T | null; error: string | null; loading: boolean };
type ActionResult = { action: QuickAction; message: string; tone: "success" | "error" | "info" };
type ApiResult = { durationMs?: number; message?: string; payload?: unknown; status?: number; unavailable?: boolean };
type Finding = {
  id: string;
  kind: "Dead code" | "Complexity" | "Circular dependency";
  name: string;
  description: string;
  severity: string;
  fileId?: number;
  filePath?: string;
  startLine?: number | null;
  endLine?: number | null;
};

const pending = <T,>(): Resource<T> => ({ data: null, error: null, loading: true });
const idle = <T,>(): Resource<T> => ({ data: null, error: null, loading: false });

function formatBytes(value: number) {
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function sourceRoute(projectId: number, path: string) {
  return `${path}?projectId=${projectId}`;
}

function SectionState({ resource, empty, children }: { resource: Resource<unknown>; empty?: string; children: React.ReactNode }) {
  if (resource.loading) return <div className="h-28 animate-pulse rounded-xl border border-slate-800 bg-slate-900/40" aria-label="Loading section" />;
  if (resource.error) return <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-200"><p className="font-semibold">Unable to load this analysis</p><p className="mt-1 text-rose-200/75">{resource.error}</p></div>;
  if (!resource.data && empty) return <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/30 p-5 text-sm text-slate-500">{empty}</div>;
  return <>{children}</>;
}

export default function DeveloperPage() {
  const { projects, activeProject, activeProjectId, isLoadingProjects, errorLoadingProjects, selectProject } = useActiveProject();
  const [workspace, setWorkspace] = useState<Resource<RepositoryWorkspace>>(idle);
  const [graph, setGraph] = useState<Resource<GraphStatsResponse>>(idle);
  const [deadCode, setDeadCode] = useState<Resource<DeadCodeResponse>>(idle);
  const [complexity, setComplexity] = useState<Resource<ComplexityResponse>>(idle);
  const [cycles, setCycles] = useState<Resource<CircularDependencyResponse>>(idle);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [lastHealthUpdate, setLastHealthUpdate] = useState<Date | null>(null);
  const [healthLatencyMs, setHealthLatencyMs] = useState<number | null>(null);
  const [selectedDiagnosticFile, setSelectedDiagnosticFile] = useState<RepositoryFile | null>(null);
  const [pendingAction, setPendingAction] = useState<QuickAction | null>(null);
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const response = await getSystemHealth();
      setHealth(response.data);
      setHealthLatencyMs(response.durationMs);
    } catch {
      setHealth(null);
      setHealthLatencyMs(null);
    } finally {
      setLastHealthUpdate(new Date());
      setHealthLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    if (!activeProjectId) {
      setWorkspace(idle()); setGraph(idle()); setDeadCode(idle()); setComplexity(idle()); setCycles(idle());
      return;
    }
    setWorkspace(pending()); setGraph(pending()); setDeadCode(pending()); setComplexity(pending()); setCycles(pending());
    const loadOne = async <T,>(request: () => Promise<T>, set: (value: Resource<T>) => void) => {
      try { set({ data: await request(), error: null, loading: false }); }
      catch (error) { set({ data: null, error: error instanceof Error ? error.message : "Request failed.", loading: false }); }
    };
    await Promise.all([
      loadOne(() => getRepositoryWorkspace(activeProjectId), setWorkspace),
      loadOne(async () => (await getProjectGraphStats(activeProjectId)).data, setGraph),
      loadOne(async () => (await getProjectDeadCode(activeProjectId)).data, setDeadCode),
      loadOne(async () => (await getProjectComplexity(activeProjectId)).data, setComplexity),
      loadOne(async () => (await getProjectCircularDependencies(activeProjectId)).data, setCycles),
    ]);
  }, [activeProjectId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadHealth(); }, [loadHealth]);

  const handleDiagnosticAction = useCallback(async (action: QuickAction) => {
    setPendingAction(action);
    setActionResult(null);
    try {
      if (action === "refresh-health") {
        await loadHealth();
        setActionResult({ action, message: "Service health refreshed.", tone: "success" });
      } else {
        await load();
        setActionResult({ action, message: action === "refresh-graph" ? "Graph statistics refreshed." : "Repository inventory reloaded.", tone: "success" });
      }
    } catch (error) {
      setActionResult({ action, message: error instanceof Error ? error.message : "Could not complete the action.", tone: "error" });
    } finally {
      setPendingAction(null);
    }
  }, [load, loadHealth]);

  const runDiagnosticEndpoint = useCallback(async (endpoint: ApiEndpoint): Promise<ApiResult> => {
    const unavailable = new Set<ApiEndpoint>(["symbols", "relationships"]);
    if (unavailable.has(endpoint)) return { unavailable: true, message: "This backend endpoint is not implemented." };
    const path = endpoint === "health" ? "/health"
      : endpoint === "projects" ? "/api/v1/projects"
        : endpoint === "repository" && activeProjectId ? `/api/v1/projects/${activeProjectId}/repository`
          : endpoint === "graph" && activeProjectId ? `/api/v1/projects/${activeProjectId}/graph`
            : endpoint === "graph-stats" && activeProjectId ? `/api/v1/projects/${activeProjectId}/graph/stats`
              : endpoint === "ast" && selectedDiagnosticFile ? `/api/v1/files/${selectedDiagnosticFile.id}/ast`
                : endpoint === "scanner" && activeProjectId ? `/api/v1/projects/${activeProjectId}/scan`
                  : null;
    if (!path) return { unavailable: true, message: "Select the required project or file first." };
    try {
      const response = await developerRequest<unknown>(path, endpoint === "scanner" ? { method: "POST" } : undefined);
      if (endpoint === "health") {
        setHealth(response.data as HealthResponse);
        setHealthLatencyMs(response.durationMs);
        setLastHealthUpdate(new Date());
      }
      return { durationMs: response.durationMs, payload: response.data, status: response.status };
    } catch (error) {
      if (error instanceof DeveloperRequestError) return { durationMs: error.durationMs, message: error.message, payload: error.payload, status: error.status };
      return { message: error instanceof Error ? error.message : "Request failed." };
    }
  }, [activeProjectId, selectedDiagnosticFile]);

  const languages = useMemo(() => {
    const counts = new Map<string, number>();
    workspace.data?.files.forEach((file) => counts.set(file.language || "Unknown", (counts.get(file.language || "Unknown") || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [workspace.data]);
  const repositorySize = useMemo(() => workspace.data?.files.reduce((total, file) => total + file.size, 0) ?? 0, [workspace.data]);
  const findings = useMemo<Finding[]>(() => {
    const dead = (deadCode.data?.items ?? []).slice().sort((a, b) => (a.confidence === "high" ? -1 : 1) - (b.confidence === "high" ? -1 : 1)).slice(0, 3).map((item) => ({
      id: `dead-${item.id}`, kind: "Dead code" as const, name: item.name, description: item.reason, severity: `${item.confidence} confidence`, fileId: item.file_id, filePath: item.file_path, startLine: item.start_line, endLine: item.end_line,
    }));
    const complex = (complexity.data?.items ?? []).slice().sort((a, b) => b.complexity - a.complexity).slice(0, 3).map((item) => ({
      id: `complexity-${item.entity_id}`, kind: "Complexity" as const, name: item.name, description: `Cyclomatic complexity ${item.complexity}${item.size_warning ? ` · ${item.size_warning.replace("_", " ")}` : ""}`, severity: item.severity, fileId: item.file_id, filePath: item.file_path, startLine: item.start_line, endLine: item.end_line,
    }));
    const circular = (cycles.data?.cycles ?? []).slice().sort((a, b) => (a.severity === "high" ? -1 : 1) - (b.severity === "high" ? -1 : 1)).slice(0, 2).map((item) => ({
      id: `cycle-${item.id}`, kind: "Circular dependency" as const, name: `${item.cycle_length} file import cycle`, description: item.explanation, severity: item.severity, fileId: item.file_ids[0], filePath: item.file_paths[0],
    }));
    return [...complex, ...circular, ...dead].slice(0, 6);
  }, [complexity.data, cycles.data, deadCode.data]);

  if (isLoadingProjects) return <div className="flex h-64 items-center justify-center gap-2 text-sm text-slate-400"><RefreshCw className="size-5 animate-spin text-cyan-400" />Loading projects…</div>;
  if (errorLoadingProjects) return <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-200"><p className="font-semibold">Failed to load projects</p><p className="mt-1 text-slate-400">{errorLoadingProjects}</p></div>;
  if (!activeProjectId || !activeProject) return <div className="space-y-6"><div className="flex flex-col gap-4 border-b border-slate-800 pb-6 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-400">Code intelligence</p><h1 className="mt-2 text-3xl font-semibold text-slate-50">Developer overview</h1></div><ProjectSelector projects={projects} selectedProjectId={activeProjectId} onSelect={selectProject} /></div><div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/30 p-12 text-center text-slate-400">Select a project to inspect its code intelligence.</div></div>;

  const maxLanguageCount = languages[0]?.[1] ?? 1;
  const healthCards = [
    { label: "Dead code", value: deadCode.data?.total_candidates, route: "/dead-code", tone: "text-amber-300", detail: "Unused files and symbols" },
    { label: "High complexity", value: complexity.data?.summary.high_complexity, route: "/complexity", tone: "text-rose-300", detail: "Functions needing review" },
    { label: "Dependency cycles", value: cycles.data?.summary.total_cycles, route: "/circular-dependencies", tone: "text-violet-300", detail: "Import cycles detected" },
  ];
  const actions = [
    ["Repository", "/repository", FolderOpen], ["Code Graph", "/graph", GitGraph], ["AST Explorer", "/ast", Braces], ["Symbols", "/symbols", Bot], ["Relationships", "/relationships", Workflow], ["Code Quality", "/quality", ShieldAlert], ["Chat with code", "/chat", MessageSquare],
  ] as const;

  return (
    <div className="space-y-7 pb-8">
      <header className="border-b border-slate-800 pb-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-400">Code intelligence workspace</p><div className="mt-2 flex flex-wrap items-center gap-3"><h1 className="truncate text-3xl font-semibold tracking-tight text-slate-50">{activeProject.name}</h1><span className="rounded-md border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 font-mono text-xs text-cyan-200">project #{activeProject.id}</span></div><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-400">{activeProject.github_url && <a href={activeProject.github_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-cyan-300 hover:text-cyan-200"><GitBranch className="size-3.5" />Repository</a>}{activeProject.default_branch && <span className="inline-flex items-center gap-1.5"><GitBranch className="size-3.5 text-slate-500" />{activeProject.default_branch}</span>}<span>Project created {new Date(activeProject.created_at).toLocaleDateString()}</span></div></div>
          <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto"><ProjectSelector projects={projects} selectedProjectId={activeProjectId} onSelect={selectProject} /><button type="button" onClick={() => void load()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-medium text-slate-200 transition-colors hover:border-cyan-500/40 hover:text-cyan-100"><RefreshCw className={workspace.loading ? "size-4 animate-spin" : "size-4"} />Refresh</button></div>
        </div>
      </header>

      <section aria-labelledby="overview-heading"><div className="mb-3 flex items-center gap-2"><CircleDot className="size-4 text-cyan-400" /><h2 id="overview-heading" className="text-sm font-semibold text-slate-200">Project overview</h2></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Indexed files" value={workspace.loading ? "…" : workspace.error ? "—" : String(workspace.data?.files.length ?? 0)} icon={FileCode2} /><StatCard label="Languages" value={workspace.loading ? "…" : workspace.error ? "—" : String(languages.length)} icon={Code2} /><StatCard label="Graph entities" value={graph.loading ? "…" : graph.error ? "—" : String(graph.data?.nodes ?? 0)} icon={Network} /><StatCard label="Relationships" value={graph.loading ? "…" : graph.error ? "—" : String(graph.data?.edges ?? 0)} icon={GitFork} /></div></section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(19rem,.9fr)]">
        <section className="rounded-xl border border-slate-800 bg-slate-950/45 p-5" aria-labelledby="statistics-heading"><div className="flex items-center justify-between"><div><h2 id="statistics-heading" className="text-sm font-semibold text-slate-100">Code statistics</h2><p className="mt-1 text-xs text-slate-500">Inventory and graph values from the current project index.</p></div><span className="font-mono text-xs text-slate-500">{workspace.error ? "Unavailable" : formatBytes(repositorySize)}</span></div><SectionState resource={workspace} empty="No repository files are indexed yet."><div className="mt-5 space-y-3">{languages.slice(0, 6).map(([language, count]) => <div key={language} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-xs"><span className="truncate font-mono text-slate-300">{language}</span><div className="h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${Math.max(4, count / maxLanguageCount * 100)}%` }} /></div><span className="text-slate-400">{count} files</span></div>)}</div></SectionState><div className="mt-5 grid grid-cols-3 gap-3 border-t border-slate-800 pt-4 text-center"><div><p className="text-xs text-slate-500">Functions</p><p className="mt-1 font-semibold text-slate-200">{graph.loading ? "…" : graph.error ? "—" : graph.data?.functions ?? 0}</p></div><div><p className="text-xs text-slate-500">Classes</p><p className="mt-1 font-semibold text-slate-200">{graph.loading ? "…" : graph.error ? "—" : graph.data?.classes ?? 0}</p></div><div><p className="text-xs text-slate-500">Graph files</p><p className="mt-1 font-semibold text-slate-200">{graph.loading ? "…" : graph.error ? "—" : graph.data?.files ?? 0}</p></div></div>{graph.error && <p className="mt-3 text-xs text-rose-300">Unable to load graph statistics: {graph.error}</p>}</section>
        <section className="rounded-xl border border-slate-800 bg-slate-950/45 p-5" aria-labelledby="architecture-heading"><div className="flex items-center gap-2"><Layers3 className="size-4 text-violet-400" /><h2 id="architecture-heading" className="text-sm font-semibold text-slate-100">Architecture insights</h2></div><p className="mt-1 text-xs text-slate-500">Observed from indexed graph and dependency analysis.</p><SectionState resource={cycles} empty="Dependency analysis has no cycle data yet."><div className="mt-4 space-y-2">{(cycles.data?.cycles ?? []).slice(0, 3).map((cycle) => <div key={cycle.id} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-slate-200">{cycle.cycle_length} file cycle</span><span className="text-[11px] capitalize text-rose-300">{cycle.severity}</span></div>{cycle.file_paths[0] && <Link href={buildSourceLocationUrl({ projectId: activeProjectId, fileId: cycle.file_ids[0], filePath: cycle.file_paths[0] })} className="mt-2 block truncate font-mono text-xs text-cyan-300 hover:text-cyan-100">{cycle.file_paths[0]}</Link>}</div>)}</div></SectionState></section>
      </div>

      <section aria-labelledby="health-heading"><div className="mb-3 flex items-center gap-2"><ShieldAlert className="size-4 text-amber-400" /><h2 id="health-heading" className="text-sm font-semibold text-slate-200">Code health / analysis summary</h2></div><div className="grid gap-3 md:grid-cols-3">{healthCards.map((card) => { const resource = card.route === "/dead-code" ? deadCode : card.route === "/complexity" ? complexity : cycles; return <Link key={card.label} href={sourceRoute(activeProjectId, card.route)} className="group rounded-xl border border-slate-800 bg-slate-950/45 p-5 transition-colors hover:border-slate-700 hover:bg-slate-900/50"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-slate-200">{card.label}</p><p className="mt-1 text-xs text-slate-500">{resource.error ? "Unable to load data" : card.detail}</p></div><ArrowRight className="size-4 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-300" /></div><p className={`mt-5 text-3xl font-semibold ${resource.error ? "text-rose-300" : card.tone}`}>{resource.loading ? "…" : resource.error ? "—" : card.value ?? 0}</p></Link>; })}</div></section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,.8fr)]">
        <section className="rounded-xl border border-slate-800 bg-slate-950/45 p-5" aria-labelledby="findings-heading"><div className="flex items-center justify-between"><div><h2 id="findings-heading" className="text-sm font-semibold text-slate-100">Top findings</h2><p className="mt-1 text-xs text-slate-500">Prioritized from available static analysis results.</p></div><SearchCode className="size-4 text-cyan-400" /></div>{deadCode.loading || complexity.loading || cycles.loading ? <div className="mt-4 space-y-2">{[1,2,3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-900/50" />)}</div> : findings.length === 0 ? <div className="mt-5 rounded-lg border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">No analysis findings are available for this project.</div> : <div className="mt-4 divide-y divide-slate-800">{findings.map((finding) => <article key={finding.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">{finding.kind}</span><span className="text-[11px] capitalize text-amber-300">{finding.severity}</span></div><p className="mt-1 truncate font-mono text-sm font-medium text-slate-100">{finding.name}</p><p className="mt-1 truncate text-xs text-slate-400">{finding.filePath}{finding.startLine ? ` · L${finding.startLine}${finding.endLine && finding.endLine !== finding.startLine ? `–${finding.endLine}` : ""}` : ""} · {finding.description}</p></div>{finding.filePath && <Link href={buildSourceLocationUrl({ projectId: activeProjectId, fileId: finding.fileId, filePath: finding.filePath, startLine: finding.startLine, endLine: finding.endLine })} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-cyan-500/40 hover:text-cyan-200"><FolderOpen className="size-3.5" />View file</Link>}</article>)}</div>}</section>
        <section className="rounded-xl border border-slate-800 bg-slate-950/45 p-5" aria-labelledby="actions-heading"><div className="flex items-center gap-2"><Sparkles className="size-4 text-cyan-400" /><h2 id="actions-heading" className="text-sm font-semibold text-slate-100">Quick developer actions</h2></div><div className="mt-4 grid gap-2">{actions.map(([label, href, Icon]) => <Link key={href} href={sourceRoute(activeProjectId, href)} className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/35 px-3 py-2.5 text-sm text-slate-300 transition-colors hover:border-cyan-500/30 hover:text-cyan-100"><Icon className="size-4 text-cyan-400" /><span>{label}</span><ArrowRight className="ml-auto size-3.5 text-slate-600" /></Link>)}</div></section>
      </div>

      <details className="group rounded-xl border border-slate-800 bg-slate-950/35">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-sm font-semibold text-slate-200 marker:hidden">
          <span className="inline-flex items-center gap-2"><Gauge className="size-4 text-cyan-400" />Developer diagnostics</span>
          <span className="text-xs font-normal text-slate-500 group-open:hidden">System health, API inspection, and inventory tools</span>
          <span className="hidden text-xs font-normal text-slate-500 group-open:inline">Collapse diagnostics</span>
        </summary>
        <div className="space-y-6 border-t border-slate-800 p-5">
          <SystemOverview health={health} isLoading={healthLoading} lastUpdated={lastHealthUpdate} latencyMs={healthLatencyMs} />
          <QuickActions onAction={(action) => void handleDiagnosticAction(action)} pendingAction={pendingAction} projectId={activeProjectId} result={actionResult} />
          <div className="grid gap-6 2xl:grid-cols-2">
            <HealthDashboard health={health} />
            <DockerStatus />
          </div>
          <DatabaseExplorer
            isLoadingFiles={workspace.loading}
            isLoadingProjects={isLoadingProjects}
            onProjectSelect={selectProject}
            onRefresh={() => void load()}
            onSelectFile={setSelectedDiagnosticFile}
            projects={projects}
            selectedProjectId={activeProjectId}
            workspace={workspace.data}
          />
          <ApiTester fileId={selectedDiagnosticFile?.id ?? null} onRun={runDiagnosticEndpoint} projectId={activeProjectId} />
        </div>
      </details>
    </div>
  );
}
