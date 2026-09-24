import type { ProjectSettings, ProjectSettingsUpdate } from "@/types/settings";

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, options);
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(payload?.detail ?? "Settings API request failed.");
  }
  return response.json() as Promise<T>;
}

export function getProjectSettings(projectId: number, signal?: AbortSignal) {
  return request<ProjectSettings>(`/api/v1/projects/${projectId}/settings`, { signal });
}

export function updateProjectSettings(
  projectId: number,
  settings: ProjectSettingsUpdate,
  signal?: AbortSignal,
) {
  return request<ProjectSettings>(`/api/v1/projects/${projectId}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
    signal,
  });
}

export function resetProjectSettings(projectId: number, signal?: AbortSignal) {
  return request<ProjectSettings>(`/api/v1/projects/${projectId}/settings/reset`, {
    method: "POST",
    signal,
  });
}
