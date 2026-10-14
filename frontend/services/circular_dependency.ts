import { cachedRequest } from "@/lib/apiCache";
import { developerRequest } from "@/services/developer";
import type { CircularDependencyResponse } from "@/types/circular_dependency";

export function getProjectCircularDependencies(projectId: number, forceRefresh = false) {
  return cachedRequest(
    `project:${projectId}:circular-dependencies`,
    () => developerRequest<CircularDependencyResponse>(`/api/v1/projects/${projectId}/circular-dependencies`),
    forceRefresh ? 0 : 30_000
  );
}
