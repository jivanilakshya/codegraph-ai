import { developerRequest } from "@/services/developer";
import type { CircularDependencyResponse } from "@/types/circular_dependency";

export function getProjectCircularDependencies(projectId: number) {
  return developerRequest<CircularDependencyResponse>(`/api/v1/projects/${projectId}/circular-dependencies`);
}
