export type GraphNodeType = "file" | "function" | "class" | "variable";

export type GraphRelationshipType = "IMPORTS" | "DECLARES" | "CALLS";

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
}

export interface GraphStats {
  nodes: number;
  edges: number;
  files: number;
  functions: number;
  classes: number;
}
