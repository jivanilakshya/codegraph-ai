export interface RepositoryFile {
  id: number;
  path: string;
  language: string | null;
  size: number;
}

export interface RepositoryWorkspace {
  id: number;
  name: string;
  files: RepositoryFile[];
}

export interface FileContent {
  id: number;
  path: string;
  language: string | null;
  content: string;
}

export type SymbolGroup = "imports" | "exports" | "functions" | "classes" | "methods" | "variables";

export type FileSymbols = Record<SymbolGroup, string[]>;

export interface FileRelationship {
  source: string;
  target: string;
  relationship: string;
}

export interface AstPoint {
  row: number;
  column: number;
}

export interface AstNodeData {
  type: string;
  is_named: boolean;
  start_byte: number;
  end_byte: number;
  start_point: AstPoint;
  end_point: AstPoint;
  children: AstNodeData[];
}

export interface FileAnalysis {
  file: string;
  language: string;
  ast: AstNodeData;
  symbols: FileSymbols;
  relationships: FileRelationship[];
}

export interface TreeFolder {
  type: "folder";
  name: string;
  path: string;
  children: TreeNodeData[];
}

export interface TreeFile {
  type: "file";
  name: string;
  path: string;
  file: RepositoryFile;
}

export type TreeNodeData = TreeFolder | TreeFile;
