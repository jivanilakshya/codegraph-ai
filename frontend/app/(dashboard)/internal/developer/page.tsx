"use client";

import {
  Activity,
  AlertCircle,
  ArrowRight,
  Bot,
  Braces,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  Cpu,
  Database,
  FileCode2,
  FolderGit2,
  Gauge,
  GitFork,
  GitGraph,
  Globe,
  Info,
  Layers,
  Network,
  Play,
  RefreshCw,
  Search,
  Server,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Workflow,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ProjectSelector } from "@/components/developer/ProjectSelector";
import { useActiveProject } from "@/hooks/useActiveProject";
import { getProjectCircularDependencies } from "@/services/circular_dependency";
import { getProjectCodeQuality } from "@/services/code_quality";
import { getProjectComplexity } from "@/services/complexity";
import { getProjectDeadCode } from "@/services/dead_code";
import {
  DeveloperRequestError,
  developerRequest,
  getProjectGraphStats,
  getSystemHealth,
} from "@/services/developer";
import { getProjectGraph } from "@/services/graph";
import { getProjects } from "@/services/projects";
import { getProjectSettings } from "@/services/settings";
import { getFileAnalysis, getRepositoryWorkspace } from "@/services/workspace";
import type { HealthResponse } from "@/types/developer";
import type { ProjectGraph } from "@/types/graph";
import type { Project } from "@/types/project";
import type { RepositoryWorkspace } from "@/types/workspace";

// ---------------------------------------------------------------------------
// Pre-defined real API endpoints for API Tester
// ---------------------------------------------------------------------------

const AVAILABLE_ENDPOINTS = [
  { label: "GET /health (Service Health)", path: "/health", method: "GET", reqProjectId: false, reqFileId: false },
  { label: "GET /api/v1/projects (List Projects)", path: "/api/v1/projects", method: "GET", reqProjectId: false, reqFileId: false },
  { label: "GET /api/v1/projects/{project_id}/repository (File Inventory)", path: "/api/v1/projects/{project_id}/repository", method: "GET", reqProjectId: true, reqFileId: false },
  { label: "GET /api/v1/projects/{project_id}/graph (Code Graph)", path: "/api/v1/projects/{project_id}/graph", method: "GET", reqProjectId: true, reqFileId: false },
  { label: "GET /api/v1/projects/{project_id}/graph/stats (Graph Statistics)", path: "/api/v1/projects/{project_id}/graph/stats", method: "GET", reqProjectId: true, reqFileId: false },
  { label: "GET /api/v1/projects/{project_id}/quality (Code Quality)", path: "/api/v1/projects/{project_id}/quality", method: "GET", reqProjectId: true, reqFileId: false },
  { label: "GET /api/v1/projects/{project_id}/complexity (Complexity Analysis)", path: "/api/v1/projects/{project_id}/complexity", method: "GET", reqProjectId: true, reqFileId: false },
  { label: "GET /api/v1/projects/{project_id}/dead-code (Dead Code Detection)", path: "/api/v1/projects/{project_id}/dead-code", method: "GET", reqProjectId: true, reqFileId: false },
  { label: "GET /api/v1/projects/{project_id}/circular-dependencies (Cycles)", path: "/api/v1/projects/{project_id}/circular-dependencies", method: "GET", reqProjectId: true, reqFileId: false },
  { label: "GET /api/v1/projects/{project_id}/settings (Project Settings)", path: "/api/v1/projects/{project_id}/settings", method: "GET", reqProjectId: true, reqFileId: false },
  { label: "GET /api/v1/files/{file_id}/ast (File AST)", path: "/api/v1/files/{file_id}/ast", method: "GET", reqProjectId: false, reqFileId: true },
  { label: "POST /api/v1/projects/{project_id}/scan (Scan Project)", path: "/api/v1/projects/{project_id}/scan", method: "POST", reqProjectId: true, reqFileId: false },
];

// ---------------------------------------------------------------------------
// Collapsible JSON Viewer Component
// ---------------------------------------------------------------------------

function JsonViewer({ data }: { data: unknown }) {
  const [copied, setCopied] = useState(false);
  const jsonString = useMemo(() => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }, [data]);

  const handleCopy = () => {
    void navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative rounded-lg border border-slate-800 bg-[#060a10] p-3 font-mono text-xs text-cyan-200/90 overflow-x-auto">
      <div className="absolute right-2 top-2 z-10">
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded border border-slate-800 bg-slate-900/90 px-2 py-1 text-[11px] font-sans font-medium text-slate-300 transition-colors hover:border-cyan-500/40 hover:text-cyan-200"
        >
          <Copy className="size-3" />
          {copied ? "Copied!" : "Copy JSON"}
        </button>
      </div>
      <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap break-all pr-20">
        {jsonString}
      </pre>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status Badge Component
// ---------------------------------------------------------------------------

function StatusBadge({
  status,
  statusCode,
  durationMs,
}: {
  status: "healthy" | "unhealthy" | "loading";
  statusCode?: number;
  durationMs?: number;
}) {
  if (status === "loading") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-xs text-slate-400">
        <RefreshCw className="size-3 animate-spin text-cyan-400" />
        probing…
      </span>
    );
  }

  if (status === "healthy") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-xs font-semibold text-emerald-400">
        <CheckCircle2 className="size-3.5 text-emerald-400" />
        {statusCode ? `${statusCode} OK` : "ONLINE"}
        {durationMs !== undefined && <span className="text-slate-500 font-normal">({durationMs}ms)</span>}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 font-mono text-xs font-semibold text-rose-400">
      <XCircle className="size-3.5 text-rose-400" />
      {statusCode ? `${statusCode} ERROR` : "UNAVAILABLE"}
      {durationMs !== undefined && <span className="text-slate-500 font-normal">({durationMs}ms)</span>}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Console Card Container
// ---------------------------------------------------------------------------

function ConsoleSection({
  title,
  subtitle,
  icon: Icon,
  iconColor = "text-cyan-400",
  children,
  headerAction,
}: {
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  iconColor?: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-800 bg-[#0a0f18] p-5 shadow-lg">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="rounded-lg border border-slate-800 bg-slate-900/80 p-1.5 text-cyan-400">
            <Icon className={`size-4 ${iconColor}`} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono">
              {title}
            </h2>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {headerAction}
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main Developer Console Page Component
// ---------------------------------------------------------------------------

export default function InternalDeveloperConsolePage() {
  const {
    projects,
    activeProject,
    activeProjectId,
    isLoadingProjects,
    errorLoadingProjects,
    selectProject,
  } = useActiveProject();

  // 1. System Health State
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthLatencyMs, setHealthLatencyMs] = useState<number | null>(null);
  const [healthStatusCode, setHealthStatusCode] = useState<number | null>(null);

  const [ollamaStatus, setOllamaStatus] = useState<"healthy" | "unhealthy" | "loading">("loading");
  const [ollamaLatencyMs, setOllamaLatencyMs] = useState<number | null>(null);

  // 2. API Tester State
  const [selectedEndpointIndex, setSelectedEndpointIndex] = useState(0);
  const [testerMethod, setTesterMethod] = useState("GET");
  const [testerProjectId, setTesterProjectId] = useState<string>("");
  const [testerFileId, setTesterFileId] = useState<string>("");
  const [testerQueryParams, setTesterQueryParams] = useState("");
  const [testerLoading, setTesterLoading] = useState(false);

  // 3. Inspector State
  const [inspectorProjectId, setInspectorProjectId] = useState<string>("");
  const [inspectorFileId, setInspectorFileId] = useState<string>("");
  const [inspectorOutput, setInspectorOutput] = useState<unknown>(null);
  const [inspectorLoading, setInspectorLoading] = useState(false);

  // 4. Database / Inventory Explorer State
  const [explorerTab, setExplorerTab] = useState<"projects" | "files" | "metadata" | "file_rels" | "entities" | "entity_rels">("projects");
  const [workspace, setWorkspace] = useState<RepositoryWorkspace | null>(null);
  const [graphData, setGraphData] = useState<ProjectGraph | null>(null);
  const [explorerLoading, setExplorerLoading] = useState(false);

  // 5. Request / Response Log State
  const [lastLog, setLastLog] = useState<{
    method: string;
    endpoint: string;
    status: number | string;
    durationMs: number;
    timestamp: string;
    payload: unknown;
  } | null>(null);

  // Auto-sync input IDs with active project
  useEffect(() => {
    if (activeProjectId) {
      setTesterProjectId(String(activeProjectId));
      setInspectorProjectId(String(activeProjectId));
    }
  }, [activeProjectId]);

  // Load System Health Probes
  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    setOllamaStatus("loading");
    try {
      const started = performance.now();
      const res = await getSystemHealth();
      setHealth(res.data);
      setHealthLatencyMs(res.durationMs);
      setHealthStatusCode(res.status);

      // Probe Ollama local service directly
      const ollamaStart = performance.now();
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 2500);
        const oRes = await fetch("http://localhost:11434/api/tags", {
          method: "GET",
          signal: controller.signal,
        }).catch(() => null);
        clearTimeout(t);
        const oDuration = Math.round(performance.now() - ollamaStart);
        setOllamaLatencyMs(oDuration);
        setOllamaStatus(oRes && oRes.ok ? "healthy" : "unhealthy");
      } catch {
        setOllamaStatus("unhealthy");
      }
    } catch (err) {
      setHealth(null);
      setHealthStatusCode(err instanceof DeveloperRequestError ? err.status : 500);
      setHealthLatencyMs(err instanceof DeveloperRequestError ? err.durationMs : null);
      setOllamaStatus("unhealthy");
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

  // Load Explorer Data when tab changes
  useEffect(() => {
    if (!activeProjectId) return;
    setExplorerLoading(true);
    if (explorerTab === "files" && !workspace) {
      getRepositoryWorkspace(activeProjectId)
        .then((w) => setWorkspace(w))
        .catch(() => setWorkspace(null))
        .finally(() => setExplorerLoading(false));
    } else if (
      (explorerTab === "file_rels" || explorerTab === "entities" || explorerTab === "entity_rels") &&
      !graphData
    ) {
      getProjectGraph(activeProjectId)
        .then((g) => setGraphData(g))
        .catch(() => setGraphData(null))
        .finally(() => setExplorerLoading(false));
    } else {
      setExplorerLoading(false);
    }
  }, [activeProjectId, explorerTab, workspace, graphData]);

  // Handle API Tester Execution
  const executeApiTester = async () => {
    const endpointConfig = AVAILABLE_ENDPOINTS[selectedEndpointIndex];
    if (!endpointConfig) return;

    let path = endpointConfig.path;
    if (endpointConfig.reqProjectId) {
      if (!testerProjectId) {
        alert("Please enter a Project ID for this endpoint.");
        return;
      }
      path = path.replace("{project_id}", testerProjectId);
    }
    if (endpointConfig.reqFileId) {
      if (!testerFileId) {
        alert("Please enter a File ID for this endpoint.");
        return;
      }
      path = path.replace("{file_id}", testerFileId);
    }
    if (testerQueryParams.trim()) {
      path += (path.includes("?") ? "&" : "?") + testerQueryParams.trim().replace(/^\?/, "");
    }

    setTesterLoading(true);
    try {
      const response = await developerRequest<unknown>(path, {
        method: testerMethod,
      });

      const logEntry = {
        method: testerMethod,
        endpoint: path,
        status: response.status,
        durationMs: response.durationMs,
        timestamp: new Date().toLocaleTimeString(),
        payload: response.data,
      };
      setLastLog(logEntry);
    } catch (err) {
      if (err instanceof DeveloperRequestError) {
        setLastLog({
          method: testerMethod,
          endpoint: path,
          status: err.status,
          durationMs: err.durationMs,
          timestamp: new Date().toLocaleTimeString(),
          payload: err.payload ?? { error: err.message },
        });
      } else {
        setLastLog({
          method: testerMethod,
          endpoint: path,
          status: 500,
          durationMs: 0,
          timestamp: new Date().toLocaleTimeString(),
          payload: { error: err instanceof Error ? err.message : "Request failed." },
        });
      }
    } finally {
      setTesterLoading(false);
    }
  };

  // Handle Inspector Actions
  const runInspectorAction = async (action: string) => {
    const pId = Number(inspectorProjectId || activeProjectId);
    const fId = Number(inspectorFileId);

    setInspectorLoading(true);
    try {
      let result: unknown = null;
      let path = "";

      if (action === "project") {
        path = "/api/v1/projects";
        result = (await developerRequest(path)).data;
      } else if (action === "files") {
        if (!pId) throw new Error("Project ID is required");
        path = `/api/v1/projects/${pId}/repository`;
        result = await getRepositoryWorkspace(pId);
      } else if (action === "graph") {
        if (!pId) throw new Error("Project ID is required");
        path = `/api/v1/projects/${pId}/graph`;
        result = await getProjectGraph(pId);
      } else if (action === "stats") {
        if (!pId) throw new Error("Project ID is required");
        path = `/api/v1/projects/${pId}/graph/stats`;
        result = (await getProjectGraphStats(pId)).data;
      } else if (action === "quality") {
        if (!pId) throw new Error("Project ID is required");
        path = `/api/v1/projects/${pId}/quality`;
        result = (await getProjectCodeQuality(pId)).data;
      } else if (action === "settings") {
        if (!pId) throw new Error("Project ID is required");
        path = `/api/v1/projects/${pId}/settings`;
        result = await getProjectSettings(pId);
      } else if (action === "ast") {
        if (!fId) throw new Error("File ID is required");
        path = `/api/v1/files/${fId}/ast`;
        result = await getFileAnalysis(fId);
      }

      setInspectorOutput(result);
      setLastLog({
        method: "GET",
        endpoint: path,
        status: 200,
        durationMs: 0,
        timestamp: new Date().toLocaleTimeString(),
        payload: result,
      });
    } catch (err) {
      setInspectorOutput({ error: err instanceof Error ? err.message : "Inspection failed." });
    } finally {
      setInspectorLoading(false);
    }
  };

  // Filtered explorer rows
  const explorerData = useMemo(() => {
    if (explorerTab === "projects") return projects;
    if (explorerTab === "files") return workspace?.files ?? [];
    if (explorerTab === "metadata")
      return {
        graph_stats: graphData ? { nodes: graphData.nodes.length, edges: graphData.edges.length } : "Load graph first",
        active_project: activeProject,
      };
    if (explorerTab === "file_rels")
      return graphData?.edges.filter((e) => e.type === "IMPORTS" || e.type === "CONTAINS") ?? [];
    if (explorerTab === "entities")
      return graphData?.nodes.filter((n) => ["function", "class", "method"].includes(n.type)) ?? [];
    if (explorerTab === "entity_rels")
      return graphData?.edges.filter((e) => ["CALLS", "DECLARES", "EXTENDS", "HAS_METHOD"].includes(e.type)) ?? [];
    return [];
  }, [explorerTab, projects, workspace, graphData, activeProject]);

  return (
    <div className="space-y-6 pb-16 animate-fade-in font-sans">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 200ms ease-out forwards; }
      `}</style>

      {/* ------------------------------------------------------------------ */}
      {/* Header Banner                                                      */}
      {/* ------------------------------------------------------------------ */}
      <header className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-950/20 via-slate-950 to-cyan-950/20 p-5 shadow-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300">
                INTERNAL / DEVELOPMENT
              </span>
              <span className="font-mono text-xs text-slate-500">route: /internal/developer</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-100 font-mono">
              Developer Console
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Internal diagnostics, API testing, and project data inspection.
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
              onClick={() => void loadHealth()}
              disabled={healthLoading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 text-xs font-mono font-medium text-cyan-300 transition-colors hover:border-cyan-500/40 hover:text-cyan-100"
            >
              <RefreshCw className={`size-3.5 ${healthLoading ? "animate-spin" : ""}`} />
              Refresh Health
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* 1. System Health Probes                                            */}
      {/* ------------------------------------------------------------------ */}
      <ConsoleSection
        title="System Health & Probes"
        subtitle="Real-time connectivity probes for core backend microservices"
        icon={Server}
        headerAction={
          <span className="font-mono text-[11px] text-slate-500">
            {healthLatencyMs !== null ? `Probe latency: ${healthLatencyMs}ms` : "Probing…"}
          </span>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {/* FastAPI */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">FastAPI Backend</span>
              <Globe className="size-4 text-cyan-400" />
            </div>
            <p className="mt-1 font-mono text-[11px] text-slate-500">http://localhost:8000</p>
            <div className="mt-3">
              <StatusBadge
                status={healthLoading ? "loading" : health ? "healthy" : "unhealthy"}
                statusCode={healthStatusCode ?? undefined}
                durationMs={healthLatencyMs ?? undefined}
              />
            </div>
          </div>

          {/* PostgreSQL */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">PostgreSQL DB</span>
              <Database className="size-4 text-blue-400" />
            </div>
            <p className="mt-1 font-mono text-[11px] text-slate-500">Relational & Metadata</p>
            <div className="mt-3">
              <StatusBadge
                status={healthLoading ? "loading" : health?.postgres ? "healthy" : "unhealthy"}
              />
            </div>
          </div>

          {/* Neo4j */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">Neo4j Graph DB</span>
              <Network className="size-4 text-violet-400" />
            </div>
            <p className="mt-1 font-mono text-[11px] text-slate-500">Graph Projection</p>
            <div className="mt-3">
              <StatusBadge
                status={healthLoading ? "loading" : health?.neo4j ? "healthy" : "unhealthy"}
              />
            </div>
          </div>

          {/* Ollama */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">Ollama LLM</span>
              <Terminal className="size-4 text-amber-400" />
            </div>
            <p className="mt-1 font-mono text-[11px] text-slate-500">http://localhost:11434</p>
            <div className="mt-3">
              <StatusBadge status={ollamaStatus} durationMs={ollamaLatencyMs ?? undefined} />
            </div>
          </div>
        </div>
      </ConsoleSection>

      {/* ------------------------------------------------------------------ */}
      {/* 2. API Tester & 3. Project/ID Inspector (Grid)                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* 2. API Tester */}
        <ConsoleSection
          title="API Tester"
          subtitle="Execute live requests against existing FastAPI endpoints"
          icon={Play}
          iconColor="text-emerald-400"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-medium text-slate-400 mb-1">
                Select API Endpoint
              </label>
              <select
                value={selectedEndpointIndex}
                onChange={(e) => {
                  const idx = Number(e.target.value);
                  setSelectedEndpointIndex(idx);
                  setTesterMethod(AVAILABLE_ENDPOINTS[idx].method);
                }}
                className="h-9 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 text-xs font-mono text-cyan-200 outline-none focus:border-cyan-500"
              >
                {AVAILABLE_ENDPOINTS.map((ep, i) => (
                  <option key={ep.path} value={i} className="bg-slate-950">
                    {ep.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Method</label>
                <select
                  value={testerMethod}
                  onChange={(e) => setTesterMethod(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 text-xs font-mono text-slate-200 outline-none"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Project ID</label>
                <input
                  type="number"
                  placeholder="e.g. 1"
                  value={testerProjectId}
                  onChange={(e) => setTesterProjectId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 text-xs font-mono text-slate-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">File ID</label>
                <input
                  type="number"
                  placeholder="e.g. 10"
                  value={testerFileId}
                  onChange={(e) => setTesterFileId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 text-xs font-mono text-slate-200 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Query Params (optional)
              </label>
              <input
                type="text"
                placeholder="depth=2&limit=10"
                value={testerQueryParams}
                onChange={(e) => setTesterQueryParams(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 text-xs font-mono text-slate-200 outline-none placeholder:text-slate-600"
              />
            </div>

            <button
              type="button"
              onClick={() => void executeApiTester()}
              disabled={testerLoading}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-4 text-xs font-mono font-semibold text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-50"
            >
              {testerLoading ? (
                <RefreshCw className="size-3.5 animate-spin" />
              ) : (
                <Play className="size-3.5" />
              )}
              {testerLoading ? "Executing Request…" : "Execute Request"}
            </button>
          </div>
        </ConsoleSection>

        {/* 3. Project / ID Inspector */}
        <ConsoleSection
          title="Project & ID Inspector"
          subtitle="Quick diagnostic fetches for specific project and file entity IDs"
          icon={Braces}
          iconColor="text-violet-400"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Inspect Project ID
                </label>
                <input
                  type="number"
                  placeholder="e.g. 1"
                  value={inspectorProjectId}
                  onChange={(e) => setInspectorProjectId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 text-xs font-mono text-slate-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Inspect File ID
                </label>
                <input
                  type="number"
                  placeholder="e.g. 5"
                  value={inspectorFileId}
                  onChange={(e) => setInspectorFileId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 text-xs font-mono text-slate-200 outline-none"
                />
              </div>
            </div>

            <div>
              <p className="text-[11px] font-mono text-slate-400 mb-2">Quick Diagnostics</p>
              <div className="flex flex-wrap gap-2">
                {[
                  ["Fetch Project", "project"],
                  ["Fetch Files", "files"],
                  ["Fetch Graph", "graph"],
                  ["Fetch Graph Stats", "stats"],
                  ["Fetch Quality", "quality"],
                  ["Fetch Settings", "settings"],
                  ["Fetch File AST", "ast"],
                ].map(([label, action]) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => void runInspectorAction(action)}
                    disabled={inspectorLoading}
                    className="rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-slate-300 transition-colors hover:border-cyan-500/40 hover:text-cyan-200 disabled:opacity-50"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {inspectorOutput !== null && (
              <div className="mt-3">
                <p className="text-[11px] font-mono text-slate-400 mb-1">Inspector Output:</p>
                <JsonViewer data={inspectorOutput} />
              </div>
            )}
          </div>
        </ConsoleSection>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 4. Database / Inventory Explorer                                   */}
      {/* ------------------------------------------------------------------ */}
      <ConsoleSection
        title="Inventory & Entity Explorer"
        subtitle="Inspect backend database entities via API projections (No direct DB connection)"
        icon={Layers}
        iconColor="text-blue-400"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5 border-b border-slate-800 pb-3">
            {[
              ["Projects", "projects"],
              ["Files Inventory", "files"],
              ["Graph Metadata", "metadata"],
              ["File Relationships", "file_rels"],
              ["Code Entities", "entities"],
              ["Entity Relationships", "entity_rels"],
            ].map(([label, tab]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setExplorerTab(tab as typeof explorerTab)}
                className={`rounded-lg px-3 py-1.5 font-mono text-xs font-medium transition-colors ${
                  explorerTab === tab
                    ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {explorerLoading ? (
            <div className="flex h-32 items-center justify-center gap-2 text-xs font-mono text-slate-400">
              <RefreshCw className="size-4 animate-spin text-cyan-400" />
              Loading explorer data…
            </div>
          ) : (
            <JsonViewer data={explorerData} />
          )}
        </div>
      </ConsoleSection>

      {/* ------------------------------------------------------------------ */}
      {/* 5. Request / Response Viewer                                       */}
      {/* ------------------------------------------------------------------ */}
      <ConsoleSection
        title="Latest API Request / Response Viewer"
        subtitle="Live telemetry for the most recent API execution"
        icon={Activity}
        iconColor="text-amber-400"
      >
        {!lastLog ? (
          <div className="rounded-lg border border-dashed border-slate-800 p-8 text-center text-xs font-mono text-slate-500">
            No API request executed yet. Use the API Tester or Inspector above to run requests.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3 font-mono text-xs">
              <div className="flex items-center gap-3">
                <span className="rounded bg-cyan-950/80 border border-cyan-800 px-2 py-0.5 font-bold text-cyan-300">
                  {lastLog.method}
                </span>
                <span className="text-slate-200 font-semibold">{lastLog.endpoint}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-500">Time: {lastLog.timestamp}</span>
                <span className="text-slate-400">Duration: {lastLog.durationMs}ms</span>
                <span
                  className={`rounded px-2 py-0.5 font-bold ${
                    Number(lastLog.status) < 400
                      ? "bg-emerald-950/80 border border-emerald-800 text-emerald-300"
                      : "bg-rose-950/80 border border-rose-800 text-rose-300"
                  }`}
                >
                  {lastLog.status}
                </span>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-mono text-slate-400 mb-1">Response Payload:</p>
              <JsonViewer data={lastLog.payload} />
            </div>
          </div>
        )}
      </ConsoleSection>
    </div>
  );
}
