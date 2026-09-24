export interface ProjectSettings {
  project_id: number;
  protected_exclusions: string[];
  custom_exclusions: string[];
  max_file_size_mb: number;
  enable_complexity: boolean;
  enable_dead_code: boolean;
  enable_circular_dependency: boolean;
  ollama_model: string;
  use_graph_context: boolean;
  use_search_context: boolean;
  available_ollama_models: string[];
}

export interface ProjectSettingsUpdate {
  custom_exclusions: string[];
  max_file_size_mb: number;
  enable_complexity: boolean;
  enable_dead_code: boolean;
  enable_circular_dependency: boolean;
  ollama_model: string;
  use_graph_context: boolean;
  use_search_context: boolean;
}
