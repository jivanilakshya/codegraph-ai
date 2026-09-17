export interface CircularDependencyItem {
  id: string;
  project_id: number;
  cycle: string[];
  cycle_length: number;
  severity: "high" | "medium" | "low" | string;
  explanation: string;
  file_ids: number[];
  file_paths: string[];
}

export interface CircularDependencySummary {
  total_cycles: number;
  high_severity: number;
  medium_severity: number;
  low_severity: number;
  max_cycle_length: number;
}

export interface CircularDependencyResponse {
  project_id: number;
  summary: CircularDependencySummary;
  cycles: CircularDependencyItem[];
}
