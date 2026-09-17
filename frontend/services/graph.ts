import type { CodeGraphNode, ProjectGraph } from "@/types/graph";

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

export function searchProjectGraphNodes(
  projectId: number,
  query: string,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({ query, limit: "10" });
  return request<{ nodes: CodeGraphNode[] }>(
    `/api/v1/projects/${projectId}/graph/search?${params.toString()}`,
    signal,
  );
}

export function getProjectGraphFocus(
  projectId: number,
  nodeId: string,
  depth: 1 | 2 | 3 = 1,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({ depth: String(depth) });
  const recordMatch = /^(file|entity)_(\d+)$/.exec(nodeId);
  if (recordMatch) {
    params.set(recordMatch[1] === "file" ? "file_id" : "entity_id", recordMatch[2]);
  } else if (nodeId.startsWith("module_")) {
    params.set("module_path", nodeId.slice("module_".length));
  } else if (nodeId === `project_${projectId}`) {
    params.set("project_root", "true");
  } else if (nodeId.startsWith("api_route_")) {
    params.set("route_id", nodeId.slice("api_route_".length));
  } else {
    throw new Error("The selected graph node cannot be focused.");
  }
  return request<ProjectGraph>(
    `/api/v1/projects/${projectId}/graph/focus?${params.toString()}`,
    signal,
  );
}
