"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiTester } from "@/components/developer/ApiTester";
import { DatabaseExplorer } from "@/components/developer/DatabaseExplorer";
import { DockerStatus } from "@/components/developer/DockerStatus";
import { GraphPreview } from "@/components/developer/GraphPreview";
import { GraphStatisticsCard } from "@/components/developer/GraphStatisticsCard";
import { HealthDashboard } from "@/components/developer/HealthDashboard";
import { ProjectSelector } from "@/components/developer/ProjectSelector";
import { QuickActions } from "@/components/developer/QuickActions";
import { ServiceStats } from "@/components/developer/ServiceStats";
import { SystemOverview } from "@/components/developer/SystemOverview";
import { PageHeader } from "@/components/ui/PageHeader";
import { DeveloperRequestError, developerRequest, getProjectGraphStats, getSystemHealth } from "@/services/developer";
import { getProjects } from "@/services/projects";
import { getRepositoryWorkspace } from "@/services/workspace";
import type { ApiEndpoint, GraphStatsResponse, HealthResponse, QuickAction } from "@/types/developer";
import type { Project } from "@/types/project";
import type { RepositoryFile, RepositoryWorkspace } from "@/types/workspace";

type ActionResult = { action: QuickAction; message: string; tone: "success" | "error" | "info" };
type ApiResult = { durationMs?: number; message?: string; payload?: unknown; status?: number; unavailable?: boolean };

export default function DeveloperPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [graphStats, setGraphStats] = useState<GraphStatsResponse | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<RepositoryWorkspace | null>(null);
  const [filesLoading, setFilesLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<RepositoryFile | null>(null);
  const [pendingAction, setPendingAction] = useState<QuickAction | null>(null);
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const response = await getSystemHealth();
      setHealth(response.data);
      setLatencyMs(response.durationMs);
      setLastUpdated(new Date());
    } catch {
      setHealth(null);
      setLatencyMs(null);
      setLastUpdated(new Date());
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const response = await getProjects();
      setProjects(response.projects);
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  const loadWorkspace = useCallback(async (projectId: number) => {
    setFilesLoading(true);
    setSelectedFile(null);
    try {
      setWorkspace(await getRepositoryWorkspace(projectId));
    } catch {
      setWorkspace(null);
    } finally {
      setFilesLoading(false);
    }
  }, []);

  const loadGraphStats = useCallback(async (projectId: number) => {
    setGraphLoading(true);
    setGraphError(null);
    try {
      const response = await getProjectGraphStats(projectId);
      setGraphStats(response.data);
      return true;
    } catch (error) {
      setGraphStats(null);
      setGraphError(error instanceof Error ? error.message : "Could not load graph statistics.");
      return false;
    } finally {
      setGraphLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHealth();
    void loadProjects();
  }, [loadHealth, loadProjects]);

  const handleProjectSelect = useCallback((projectId: number) => {
    setSelectedProjectId(projectId);
    void loadWorkspace(projectId);
    void loadGraphStats(projectId);
  }, [loadGraphStats, loadWorkspace]);

  useEffect(() => {
    const selectedProjectExists = projects.some((project) => project.id === selectedProjectId);
    if (projects.length && !selectedProjectExists) handleProjectSelect(projects[0].id);
  }, [handleProjectSelect, projects, selectedProjectId]);

  const handleRefresh = () => {
    void loadProjects();
    if (selectedProjectId) {
      void loadWorkspace(selectedProjectId);
      void loadGraphStats(selectedProjectId);
    }
  };

  const handleQuickAction = async (action: QuickAction) => {
    setPendingAction(action);
    setActionResult(null);
    try {
      if (action === "refresh-graph" && selectedProjectId) {
        const refreshed = await loadGraphStats(selectedProjectId);
        setActionResult(refreshed
          ? { action, message: "Graph statistics refreshed.", tone: "success" }
          : { action, message: "Could not refresh graph statistics.", tone: "error" });
      } else if (action === "refresh-repository" && selectedProjectId) {
        await loadWorkspace(selectedProjectId);
        setActionResult({ action, message: "Repository inventory reloaded.", tone: "success" });
      } else if (action === "refresh-health") {
        await loadHealth();
        setActionResult({ action, message: "Service health refreshed.", tone: "success" });
      } else {
        setActionResult({ action, message: "This backend operation is not implemented yet.", tone: "info" });
      }
    } catch (error) {
      setActionResult({ action, message: error instanceof Error ? error.message : "Could not complete the action.", tone: "error" });
    } finally {
      setPendingAction(null);
    }
  };

  const runEndpoint = async (endpoint: ApiEndpoint): Promise<ApiResult> => {
    const unavailable = new Set<ApiEndpoint>(["symbols", "relationships"]);
    if (unavailable.has(endpoint)) return { unavailable: true, message: "This backend endpoint is not implemented." };

    const path = endpoint === "health"
      ? "/health"
      : endpoint === "projects"
        ? "/api/v1/projects"
        : endpoint === "repository" && selectedProjectId
          ? `/api/v1/projects/${selectedProjectId}/repository`
          : endpoint === "graph" && selectedProjectId
            ? `/api/v1/projects/${selectedProjectId}/graph`
            : endpoint === "graph-stats" && selectedProjectId
              ? `/api/v1/projects/${selectedProjectId}/graph/stats`
          : endpoint === "ast" && selectedFile
            ? `/api/v1/files/${selectedFile.id}/ast`
            : endpoint === "scanner" && selectedProjectId
              ? `/api/v1/projects/${selectedProjectId}/scan`
              : null;

    if (!path) return { message: "Select the required project or file first.", unavailable: true };

    try {
      const response = await developerRequest<unknown>(path, endpoint === "scanner" ? { method: "POST" } : undefined);
      if (endpoint === "health") {
        setHealth(response.data as HealthResponse);
        setLatencyMs(response.durationMs);
        setLastUpdated(new Date());
      }
      if (endpoint === "graph-stats") {
        setGraphStats(response.data as GraphStatsResponse);
        setGraphError(null);
      }
      return { durationMs: response.durationMs, payload: response.data, status: response.status };
    } catch (error) {
      if (error instanceof DeveloperRequestError) {
        return { durationMs: error.durationMs, message: error.message, payload: error.payload, status: error.status };
      }
      return { message: error instanceof Error ? error.message : "Request failed." };
    }
  };

  return (
    <main className="mx-auto w-full max-w-screen-2xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Developer" description="Internal Developer Toolkit." />
      <SystemOverview health={health} isLoading={healthLoading} lastUpdated={lastUpdated} latencyMs={latencyMs} />
      <ProjectSelector onSelect={handleProjectSelect} projects={projects} selectedProjectId={selectedProjectId} />
      <ServiceStats graphStats={graphStats} health={health} projectCount={projects.length} selectedFileCount={workspace?.files.length ?? null} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <GraphStatisticsCard error={graphError} isLoading={graphLoading} onRefresh={() => { if (selectedProjectId) void loadGraphStats(selectedProjectId); }} projectName={projects.find((project) => project.id === selectedProjectId)?.name ?? null} stats={graphStats} />
        <GraphPreview projectName={projects.find((project) => project.id === selectedProjectId)?.name ?? null} stats={graphStats} />
      </div>
      <QuickActions onAction={(action) => void handleQuickAction(action)} pendingAction={pendingAction} projectId={selectedProjectId} result={actionResult} />
      <DatabaseExplorer isLoadingFiles={filesLoading} isLoadingProjects={projectsLoading} onProjectSelect={handleProjectSelect} onRefresh={handleRefresh} onSelectFile={setSelectedFile} projects={projects} selectedProjectId={selectedProjectId} workspace={workspace} />
      <ApiTester fileId={selectedFile?.id ?? null} onRun={runEndpoint} projectId={selectedProjectId} />
      <DockerStatus />
      <HealthDashboard health={health} />
    </main>
  );
}
