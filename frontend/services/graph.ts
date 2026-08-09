import type { ProjectGraph } from "@/types/graph";

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

/** Return the small graph neighborhood used by the interactive graph canvas. */
export function getFocusedProjectGraph(
  projectId: number,
  focus: { fileId?: number; entityId?: number; depth?: number },
  signal?: AbortSignal,
) {
  const parameters = new URLSearchParams();
  if (focus.fileId !== undefined) parameters.set("file_id", String(focus.fileId));
  if (focus.entityId !== undefined) parameters.set("entity_id", String(focus.entityId));
  if (focus.depth !== undefined) parameters.set("depth", String(focus.depth));
  const suffix = parameters.size ? `?${parameters.toString()}` : "";
  return request<ProjectGraph>(`/api/v1/projects/${projectId}/graph/focus${suffix}`, signal);
}
