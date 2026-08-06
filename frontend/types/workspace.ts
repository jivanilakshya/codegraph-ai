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
