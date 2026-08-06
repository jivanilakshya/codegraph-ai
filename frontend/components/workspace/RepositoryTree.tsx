"use client";

import { FolderTree, RefreshCw } from "lucide-react";

import type { RepositoryFile, TreeFolder, TreeNodeData } from "@/types/workspace";

import { TreeNode } from "./TreeNode";

type RepositoryTreeProps = {
  files: RepositoryFile[];
  selectedFileId: number | null;
  isLoading: boolean;
  onSelectFile: (file: RepositoryFile) => void;
  onRefresh: () => void;
};

function createTree(files: RepositoryFile[]): TreeNodeData[] {
  const root: TreeFolder = { type: "folder", name: "", path: "", children: [] };
  const folders = new Map<string, TreeFolder>([["", root]]);

  for (const file of files) {
    const pathParts = file.path.split("/").filter(Boolean);
    let parent = root;
    let folderPath = "";
    for (const folderName of pathParts.slice(0, -1)) {
      folderPath = folderPath ? `${folderPath}/${folderName}` : folderName;
      let folder = folders.get(folderPath);
      if (!folder) {
        folder = { type: "folder", name: folderName, path: folderPath, children: [] };
        folders.set(folderPath, folder);
        parent.children.push(folder);
      }
      parent = folder;
    }
    const name = pathParts.at(-1) ?? file.path;
    parent.children.push({ type: "file", name, path: file.path, file });
  }

  const sortNodes = (nodes: TreeNodeData[]) => {
    nodes.sort((left, right) => {
      if (left.type !== right.type) return left.type === "folder" ? -1 : 1;
      return left.name.localeCompare(right.name);
    });
    nodes.forEach((node) => { if (node.type === "folder") sortNodes(node.children); });
  };
  sortNodes(root.children);
  return root.children;
}

export function RepositoryTree({ files, selectedFileId, isLoading, onSelectFile, onRefresh }: RepositoryTreeProps) {
  const tree = createTree(files);
  return (
    <aside className="flex min-h-64 flex-col border-b border-slate-800 bg-[#0a1019] lg:min-h-0 lg:border-b-0 lg:border-r">
      <div className="flex h-10 items-center justify-between border-b border-slate-800 px-3"><span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400"><FolderTree className="size-3.5" /> Explorer</span><button type="button" onClick={onRefresh} className="grid size-7 place-items-center rounded text-slate-500 hover:bg-slate-800 hover:text-slate-200" aria-label="Refresh repository"><RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} /></button></div>
      <div className="min-h-0 flex-1 overflow-auto py-2">
        {isLoading ? <div className="space-y-2 px-3 pt-2">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-4 animate-pulse rounded bg-slate-800/80" style={{ width: `${60 + (index % 3) * 15}%` }} />)}</div> : tree.length ? tree.map((node) => <TreeNode key={node.path} node={node} selectedFileId={selectedFileId} onSelectFile={onSelectFile} />) : <p className="px-3 pt-4 text-xs leading-5 text-slate-500">No scanned files. Run a project scan, then refresh this workspace.</p>}
      </div>
    </aside>
  );
}
