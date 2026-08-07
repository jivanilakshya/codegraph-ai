import type { RepositoryFile, RepositoryWorkspace } from "@/types/workspace";

export interface HealthResponse {
  postgres: boolean;
  neo4j: boolean;
  status: "healthy" | "unhealthy" | string;
}

export interface TimedResponse<T> {
  data: T;
  durationMs: number;
  status: number;
}

export interface ScanResponse {
  success: boolean;
  total_files: number;
  supported_files: number;
  ignored_files: number;
  scan_time_ms: number;
  message: string;
}

export interface GraphStatsResponse {
  nodes: number;
  edges: number;
  files: number;
  functions: number;
  classes: number;
}

export interface DeveloperLogEntry {
  id: number;
  source: "backend" | "frontend" | "database" | "neo4j" | "scanner";
  message: string;
  timestamp: Date;
  tone: "info" | "success" | "error";
}

export type DatabaseTab = "projects" | "files" | "symbols" | "relationships";
export type ApiEndpoint = "health" | "projects" | "repository" | "ast" | "symbols" | "relationships" | "graph" | "graph-stats" | "scanner";
export type QuickAction = "refresh-graph" | "refresh-repository" | "refresh-health";
export type QuickSqlAction = "projects" | "files" | "symbols" | "relationships" | "project-statistics" | "duplicates" | "largest-project" | "latest-scan" | "language-count" | "relationship-count";

export type InventoryData = RepositoryWorkspace | null;
export type InventoryFile = RepositoryFile;
