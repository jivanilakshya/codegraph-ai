export interface DeadCodeItem {
  id: string;
  entity_type: "file" | "class" | "function" | "method" | "variable" | string;
  name: string;
  file_id: number;
  file_path: string;
  start_line?: number | null;
  end_line?: number | null;
  confidence: "high" | "medium" | "low" | string;
  reason: string;
}

export interface DeadCodeSummary {
  files: number;
  classes: number;
  functions: number;
  methods: number;
  variables: number;
}

export interface DeadCodeResponse {
  project_id: number;
  total_candidates: number;
  summary: DeadCodeSummary;
  items: DeadCodeItem[];
}
