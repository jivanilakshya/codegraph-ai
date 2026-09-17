export type GraphNodeType = "project" | "module" | "file" | "api_route" | "function" | "class" | "method" | "variable";

export type GraphRelationshipType = "CONTAINS" | "IMPORTS" | "DECLARES" | "CALLS" | "EXTENDS" | "HAS_METHOD" | "HANDLES";

export interface CodeGraphNode {
  id: string;
  label: string;
  type: GraphNodeType;
}

export interface CodeGraphEdge {
  id: string;
  source: string;
  target: string;
  type: GraphRelationshipType;
}

export interface ProjectGraph {
  nodes: CodeGraphNode[];
  edges: CodeGraphEdge[];
  truncated: boolean;
}

export interface GraphStats {
  nodes: number;
  edges: number;
  files: number;
  functions: number;
  classes: number;
}
