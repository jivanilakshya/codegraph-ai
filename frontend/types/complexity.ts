export interface ComplexityItem {
  entity_id: number;
  entity_type: "function" | "method" | string;
  name: string;
  file_id: number;
  file_path: string;
  start_line: number;
  end_line: number;
  line_count: number;
  complexity: number;
  severity: "high" | "medium" | "low" | string;
  size_warning?: "very_large" | "large" | null;
}

export interface ComplexitySummary {
  total_items: number;
  high_complexity: number;
  medium_complexity: number;
  low_complexity: number;
  average_complexity: number;
  max_complexity: number;
}

export interface ComplexityResponse {
  project_id: number;
  summary: ComplexitySummary;
  items: ComplexityItem[];
}
