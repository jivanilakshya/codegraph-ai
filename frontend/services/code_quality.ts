import { cachedRequest } from "@/lib/apiCache";
import { developerRequest } from "@/services/developer";
import type { CodeQualityResponse } from "@/types/code_quality";

export function getProjectCodeQuality(projectId: number, forceRefresh = false) {
  return cachedRequest(
    `project:${projectId}:quality`,
    () => developerRequest<CodeQualityResponse>(`/api/v1/projects/${projectId}/quality`),
    forceRefresh ? 0 : 30_000
  );
}
