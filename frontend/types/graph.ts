export type GraphNodeType = "file" | "class" | "function" | "method" | "variable" | "module";

export type GraphRelationshipType = "IMPORTS" | "EXPORTS" | "CALLS" | "HAS_METHOD" | "EXTENDS" | "CONTAINS";

export interface CodeGraphNode {
  id: string;
  label: string;
  type: GraphNodeType;
  file_id: number | null;
  project_id: number;
}

export interface CodeGraphEdge {
  source: string;
  target: string;
  relationship: GraphRelationshipType;
}

export interface ProjectGraph {
  nodes: CodeGraphNode[];
  edges: CodeGraphEdge[];
}

export interface GraphStats {
  nodes: number;
  edges: number;
  files: number;
  functions: number;
  classes: number;
}
