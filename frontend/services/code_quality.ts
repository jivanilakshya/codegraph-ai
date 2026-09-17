import { developerRequest } from "@/services/developer";
import type { CodeQualityResponse } from "@/types/code_quality";

export function getProjectCodeQuality(projectId: number) {
  return developerRequest<CodeQualityResponse>(`/api/v1/projects/${projectId}/quality`);
}
