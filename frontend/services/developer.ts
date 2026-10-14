import type { GraphStatsResponse, HealthResponse, ScanResponse, TimedResponse } from "@/types/developer";

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export class DeveloperRequestError extends Error {
  constructor(message: string, public readonly status: number, public readonly durationMs: number, public readonly payload: unknown) {
    super(message);
    this.name = "DeveloperRequestError";
  }
}

export async function developerRequest<T>(path: string, options?: RequestInit): Promise<TimedResponse<T>> {
  const startedAt = performance.now();
  const response = await fetch(`${apiBaseUrl}${path}`, options);
  const durationMs = Math.round(performance.now() - startedAt);
  const payload = (await response.json().catch(() => null)) as T | { detail?: string } | null;

  if (!response.ok) {
    const detail = payload && typeof payload === "object" && "detail" in payload ? payload.detail : undefined;
    throw new DeveloperRequestError(detail ?? `Request failed with status ${response.status}.`, response.status, durationMs, payload);
  }

  return { data: payload as T, durationMs, status: response.status };
}

import { cachedRequest, invalidateProjectCache } from "@/lib/apiCache";

export function getSystemHealth(forceRefresh = false) {
  return cachedRequest<TimedResponse<HealthResponse>>(
    "system:health",
    () => developerRequest<HealthResponse>("/health"),
    forceRefresh ? 0 : 15_000
  );
}

export async function runProjectScan(projectId: number) {
  const result = await developerRequest<ScanResponse>(`/api/v1/projects/${projectId}/scan`, { method: "POST" });
  invalidateProjectCache(projectId);
  return result;
}

export function getProjectGraphStats(projectId: number, forceRefresh = false) {
  return cachedRequest<TimedResponse<GraphStatsResponse>>(
    `project:${projectId}:graph:stats`,
    () => developerRequest<GraphStatsResponse>(`/api/v1/projects/${projectId}/graph/stats`),
    forceRefresh ? 0 : 30_000
  );
}
