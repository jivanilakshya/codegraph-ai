"use client";

import { ChevronRight, FileCode2, FileText, Folder, FolderOpen } from "lucide-react";
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
  const indent = { paddingLeft: `${depth * 14 + 24}px` };

  if (node.type === "file") {
    const isSelected = node.file.id === selectedFileId;
    const isMd = node.name.endsWith(".md");
    const Icon = isMd ? FileText : FileCode2;

    return (
      <button
        type="button"
        onClick={() => onSelectFile(node.file)}
        style={indent}
        title={node.path}
        className={`group relative w-full flex items-center gap-2.5 h-8 pr-3 text-left transition-colors duration-200 ${
          isSelected
            ? "bg-gradient-to-r from-cyan-400/10 to-transparent text-white font-medium"
            : "text-[#9aa6b8] hover:bg-white/[0.03] hover:text-white"
        }`}
      >
        <span
          className={`absolute left-0 top-1 bottom-1 w-[2px] rounded-full bg-[#00e5ff] transition-all duration-300 ${
            isSelected ? "opacity-100 shadow-[0_0_8px_#00e5ff]" : "opacity-0"
          }`}
        />
        <Icon
          className={`w-3.5 h-3.5 shrink-0 transition-colors ${
            isSelected
              ? "text-[#00e5ff]"
              : isMd
              ? "text-violet-300/70"
              : "text-sky-300/60 group-hover:text-sky-300"
          }`}
        />
        <span className="font-mono text-[12.5px] truncate">{node.name}</span>
        {isSelected && (
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00e5ff] shadow-[0_0_6px_#00e5ff]" />
        )}
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        style={{ paddingLeft: `${depth * 14 + 12}px` }}
        className="group relative w-full flex items-center gap-2.5 h-8 pr-3 text-left transition-colors duration-200 text-[#9aa6b8] hover:bg-white/[0.03] hover:text-white"
      >
        <ChevronRight
          className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ${
            isExpanded ? "rotate-90 text-[#00e5ff]" : ""
          }`}
        />
        {isExpanded ? (
          <FolderOpen className="w-3.5 h-3.5 text-[#00e5ff]/80 shrink-0" />
        ) : (
          <Folder className="w-3.5 h-3.5 text-sky-300/60 shrink-0 group-hover:text-sky-300" />
        )}
        <span className="font-mono text-[12.5px] truncate font-medium text-white/90">
          {node.name}
        </span>
      </button>

      {/* Expanded directory children */}
      {isExpanded && (
        <div className="relative">
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
      )}
    </div>
  );
}
