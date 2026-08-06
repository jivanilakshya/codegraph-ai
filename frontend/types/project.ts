export interface Project {
  id: number;
  name: string;
  github_url: string | null;
  default_branch: string | null;
  created_at: string;
}

export interface ProjectListResponse {
  projects: Project[];
}
