"use client";

import { ChevronDown, ChevronRight, FileCode2, FileText, Folder, FolderOpen } from "lucide-react";
import { useState } from "react";

import type { RepositoryFile, TreeNodeData } from "@/types/workspace";

type TreeNodeProps = {
  node: TreeNodeData;
  depth?: number;
  selectedFileId: number | null;
  onSelectFile: (file: RepositoryFile) => void;
};

export function TreeNode({ node, depth = 0, selectedFileId, onSelectFile }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const indent = { paddingLeft: `${depth * 12 + 8}px` };

  if (node.type === "file") {
    const isSelected = node.file.id === selectedFileId;
    return (
      <button type="button" onClick={() => onSelectFile(node.file)} style={indent} title={node.path} className={`flex h-7 w-full items-center gap-2 pr-2 text-left text-xs transition-colors ${isSelected ? "bg-cyan-400/10 text-cyan-200" : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"}`}>
        {node.file.language ? <FileCode2 className="size-3.5 shrink-0 text-cyan-400" /> : <FileText className="size-3.5 shrink-0 text-slate-500" />}
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  return (
    <div>
      <button type="button" onClick={() => setIsExpanded((value) => !value)} style={indent} className="flex h-7 w-full items-center gap-1 pr-2 text-left text-xs font-medium text-slate-300 hover:bg-slate-800/70">
        {isExpanded ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
        {isExpanded ? <FolderOpen className="size-3.5 shrink-0 text-amber-300" /> : <Folder className="size-3.5 shrink-0 text-amber-300" />}
        <span className="truncate">{node.name}</span>
      </button>
      {isExpanded && node.children.map((child) => <TreeNode key={child.path} node={child} depth={depth + 1} selectedFileId={selectedFileId} onSelectFile={onSelectFile} />)}
    </div>
  );
}
