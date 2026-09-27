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
  const indent = { paddingLeft: `${depth * 14 + 10}px` };

  if (node.type === "file") {
    const isSelected = node.file.id === selectedFileId;
    return (
      <button
        type="button"
        onClick={() => onSelectFile(node.file)}
        style={indent}
        title={node.path}
        className={`flex min-h-[30px] h-8 w-full items-center gap-2.5 pr-3 text-left font-mono text-[14px] sm:text-[15px] transition-all duration-150 ${
          isSelected
            ? "border-l-2 border-white bg-[rgba(255,255,255,0.08)] text-white font-semibold shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]"
            : "border-l-2 border-transparent text-[#A3A3A3] font-medium hover:bg-[rgba(255,255,255,0.04)] hover:text-white"
        }`}
      >
        {node.file.language ? (
          <FileCode2 className="size-4 shrink-0 text-white opacity-80" />
        ) : (
          <FileText className="size-4 shrink-0 text-[#737373]" />
        )}
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsExpanded((value) => !value)}
        style={indent}
        className="flex min-h-[30px] h-8 w-full items-center gap-2 pr-3 text-left font-mono text-[14px] sm:text-[15px] font-medium text-white transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)]"
      >
        {isExpanded ? (
          <ChevronDown className="size-4 shrink-0 text-[#A3A3A3]" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-[#737373]" />
        )}
        {isExpanded ? (
          <FolderOpen className="size-4 shrink-0 text-white" />
        ) : (
          <Folder className="size-4 shrink-0 text-[#A3A3A3]" />
        )}
        <span className="truncate">{node.name}</span>
      </button>

      {/* Smooth Expansion Transition */}
      <div
        className={`transition-all duration-200 ease-in-out ${
          isExpanded ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"
        }`}
      >
        {node.children.map((child) => (
          <TreeNode
            key={child.path}
            node={child}
            depth={depth + 1}
            selectedFileId={selectedFileId}
            onSelectFile={onSelectFile}
          />
        ))}
      </div>
    </div>
  );
}


