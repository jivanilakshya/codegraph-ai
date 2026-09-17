import { developerRequest } from "@/services/developer";
import type { ComplexityResponse } from "@/types/complexity";

export function getProjectComplexity(projectId: number) {
  return developerRequest<ComplexityResponse>(`/api/v1/projects/${projectId}/complexity`);
}
