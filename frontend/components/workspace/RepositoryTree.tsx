"use client";

import { ChevronDown, FolderTree, RefreshCw, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import type { RepositoryFile, TreeFolder, TreeNodeData } from "@/types/workspace";

import { TreeNode } from "./TreeNode";

type RepositoryTreeProps = {
  className?: string;
  files: RepositoryFile[];
  selectedFileId: number | null;
  isLoading: boolean;
  onSelectFile: (file: RepositoryFile) => void;
  onRefresh: () => void;
  projectName?: string;
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
  projectName = "Active Project",
}: RepositoryTreeProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;
    const query = searchQuery.toLowerCase();
    return files.filter((f) => f.path.toLowerCase().includes(query));
  }, [files, searchQuery]);

  const tree = useMemo(() => createTree(filteredFiles), [filteredFiles]);

  return (
    <aside
      className={`flex flex-col min-h-0 border-b md:border-b-0 md:border-r border-white/[0.06] bg-gradient-to-b from-[#0b0e18]/90 to-[#080a12]/90 ${
        className ?? ""
      }`}
    >
      {/* Explorer Header Toolbar */}
      <div className="h-12 flex items-center gap-2 pl-4 pr-2 border-b border-white/[0.06] shrink-0 select-none">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FolderTree className="w-3.5 h-3.5 text-[#00e5ff]/80" />
          <span className="cg-label !text-foreground/80">Explorer</span>
          <span className="font-mono text-[10.5px] text-muted-foreground px-1.5 py-0.5 rounded border border-white/[0.08] shrink-0">
            {files.length} files
          </span>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          title="Refresh repository file list"
          aria-label="Refresh repository file list"
          className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-[#00e5ff] hover:bg-[#00e5ff]/[0.06] hover:shadow-[0_0_14px_-4px_rgba(0,229,255,0.5)] active:scale-[0.98] transition-all"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${
              isLoading
                ? "rotate-[360deg] text-[#00e5ff] transition-transform duration-[800ms] ease-out"
                : "rotate-0"
            }`}
          />
        </button>
      </div>

      {/* Quick Search Filter */}
      {files.length > 5 && (
        <div className="px-3 py-2 border-b border-white/[0.04]">
          <div className="flex items-center gap-2 px-2.5 h-7 rounded-md border border-white/[0.07] bg-white/[0.02] text-xs text-muted-foreground focus-within:border-[#00e5ff]/40 focus-within:bg-white/[0.04] transition-colors">
            <Search className="w-3 h-3 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter files…"
              className="bg-transparent border-none outline-none text-[11.5px] font-mono text-white placeholder:text-muted-foreground/60 w-full"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-muted-foreground hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Scrollable File Tree Container */}
      <div
        className={`flex-1 min-h-0 overflow-y-auto py-2 ${
          isLoading ? "opacity-40 transition-opacity" : ""
        }`}
      >
        <div className="px-4 pt-1 pb-2 flex items-center gap-1.5 font-mono text-[10.5px] text-muted-foreground select-none">
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
          <span className="truncate">{projectName}</span>
        </div>

        <div className="relative">
          <span className="absolute left-[22px] top-0 bottom-2 w-px bg-white/[0.05]" />
          {isLoading ? (
            <div className="space-y-2 px-4 pt-2">
              {Array.from({ length: 9 }, (_, i) => (
                <div
                  key={i}
                  className="h-5 animate-pulse rounded bg-white/[0.04]"
                  style={{ width: `${50 + (i % 4) * 12}%` }}
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
            <p className="px-4 pt-4 font-mono text-[11.5px] leading-relaxed text-muted-foreground">
              {searchQuery ? "No files match your search filter." : "No files scanned in this repository workspace."}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
