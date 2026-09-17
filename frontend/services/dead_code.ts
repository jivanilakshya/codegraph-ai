import { developerRequest } from "@/services/developer";
import type { DeadCodeResponse } from "@/types/dead_code";

export function getProjectDeadCode(projectId: number) {
  return developerRequest<DeadCodeResponse>(`/api/v1/projects/${projectId}/dead-code`);
}
