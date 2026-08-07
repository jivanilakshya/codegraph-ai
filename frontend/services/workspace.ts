import type { FileAnalysis, FileContent, RepositoryWorkspace } from "@/types/workspace";

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, { signal });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(payload?.detail ?? "Could not load the repository workspace.");
  }
  return response.json() as Promise<T>;
}

export function getRepositoryWorkspace(projectId: number, signal?: AbortSignal) {
  return request<RepositoryWorkspace>(`/api/v1/projects/${projectId}/repository`, signal);
}

export function getFileContent(projectId: number, fileId: number, signal?: AbortSignal) {
  return request<FileContent>(`/api/v1/projects/${projectId}/files/${fileId}/content`, signal);
}

export function getFileAnalysis(fileId: number, signal?: AbortSignal) {
  return request<FileAnalysis>(`/api/v1/files/${fileId}/ast`, signal);
}
