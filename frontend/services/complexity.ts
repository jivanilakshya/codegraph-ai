import { cachedRequest } from "@/lib/apiCache";
import { developerRequest } from "@/services/developer";
import type { ComplexityResponse } from "@/types/complexity";

export function getProjectComplexity(projectId: number, forceRefresh = false) {
  return cachedRequest(
    `project:${projectId}:complexity`,
    () => developerRequest<ComplexityResponse>(`/api/v1/projects/${projectId}/complexity`),
    forceRefresh ? 0 : 30_000
  );
}
