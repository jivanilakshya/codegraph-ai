import type { DeadCodeSummary } from "./dead_code";
import type { CircularDependencySummary } from "./circular_dependency";
import type { ComplexitySummary } from "./complexity";

export interface CodeQualitySummary {
  project_id: number;
  overall_score: number;
  quality_grade: string;
  dead_code_count: number;
  dead_code_high_confidence_count: number;
  circular_dependency_count: number;
  high_circular_dependency_count: number;
  complexity_total: number;
  high_complexity_count: number;
  medium_complexity_count: number;
  low_complexity_count: number;
  average_complexity: number;
  max_complexity: number;
}

export interface CodeQualityBreakdown {
  dead_code: DeadCodeSummary;
  circular_dependency: CircularDependencySummary;
  complexity: ComplexitySummary;
}

export interface CodeQualityResponse {
  project_id: number;
  summary: CodeQualitySummary;
  breakdown: CodeQualityBreakdown;
}
