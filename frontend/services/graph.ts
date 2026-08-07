import type { GraphStats, ProjectGraph } from "@/types/graph";

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, { signal });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(payload?.detail ?? "Could not load graph data.");
  }
  return response.json() as Promise<T>;
}

export function getProjectGraph(projectId: number, signal?: AbortSignal) {
  return request<ProjectGraph>(`/api/v1/projects/${projectId}/graph`, signal);
}

export function getProjectGraphStats(projectId: number, signal?: AbortSignal) {
  return request<GraphStats>(`/api/v1/projects/${projectId}/graph/stats`, signal);
}
