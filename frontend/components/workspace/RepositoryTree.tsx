"use client";

import { FolderTree, RefreshCw } from "lucide-react";

import type { RepositoryFile, TreeFolder, TreeNodeData } from "@/types/workspace";

import { TreeNode } from "./TreeNode";

type RepositoryTreeProps = {
  className?: string;
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
    nodes.forEach((node) => {
      if (node.type === "folder") sortNodes(node.children);
    });
  };
  sortNodes(root.children);
  return root.children;
}

export function RepositoryTree({
  className,
  files,
  selectedFileId,
  isLoading,
  onSelectFile,
  onRefresh,
}: RepositoryTreeProps) {
  const tree = createTree(files);

  return (
    <aside className={`flex min-h-0 flex-col bg-[#050505] ${className ?? "h-[min(50vh,24rem)] border-b border-[#202020] lg:h-auto lg:border-b-0 lg:border-r"}`}>
      {/* Explorer Header Toolbar */}
      <div className="flex h-12 items-center justify-between border-b border-[#202020] bg-[#0A0A0A] px-4 select-none">
        <span className="flex items-center gap-2.5 font-mono text-[15px] sm:text-[16px] font-bold uppercase tracking-wider text-white">
          <FolderTree className="size-4 text-white" />
          <span>EXPLORER</span>
          <span className="ml-1 text-xs font-normal text-[#737373]">({files.length})</span>
        </span>

        <button
          type="button"
          onClick={onRefresh}
          className="grid size-7.5 place-items-center rounded-md border border-[#222222] bg-[#0D0D0D] text-[#A3A3A3] transition-all hover:border-[#444444] hover:bg-[#151515] hover:text-white"
          aria-label="Refresh repository"
          title="Refresh repository structure"
        >
          <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin text-white" : ""}`} />
        </button>
      </div>

      {/* Scrollable File Tree */}
      <div className="min-h-0 flex-1 overflow-auto py-2 font-mono text-xs select-none">
        {isLoading ? (
          <div className="space-y-2 px-4 pt-3">
            {Array.from({ length: 9 }, (_, index) => (
              <div
                key={index}
                className="h-5 animate-pulse rounded bg-[#121212]"
                style={{ width: `${50 + (index % 4) * 12}%` }}
              />
            ))}
          </div>
        ) : tree.length ? (
          tree.map((node) => (
            <TreeNode
              key={node.path}
              node={node}
              selectedFileId={selectedFileId}
              onSelectFile={onSelectFile}
            />
          ))
        ) : (
          <p className="px-4 pt-6 font-mono text-xs leading-relaxed text-[#737373]">
            No scanned files. Run a project scan, then refresh this workspace.
          </p>
        )}
      </div>
    </aside>
  );
}

