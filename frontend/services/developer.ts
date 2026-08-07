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

export function getSystemHealth() {
  return developerRequest<HealthResponse>("/health");
}

export function runProjectScan(projectId: number) {
  return developerRequest<ScanResponse>(`/api/v1/projects/${projectId}/scan`, { method: "POST" });
}

export function getProjectGraphStats(projectId: number) {
  return developerRequest<GraphStatsResponse>(`/api/v1/projects/${projectId}/graph/stats`);
}
