import { cachedRequest } from "@/lib/apiCache";
import { developerRequest } from "@/services/developer";
import type { DeadCodeResponse } from "@/types/dead_code";

export function getProjectDeadCode(projectId: number, forceRefresh = false) {
  return cachedRequest(
    `project:${projectId}:dead-code`,
    () => developerRequest<DeadCodeResponse>(`/api/v1/projects/${projectId}/dead-code`),
    forceRefresh ? 0 : 30_000
  );
}
