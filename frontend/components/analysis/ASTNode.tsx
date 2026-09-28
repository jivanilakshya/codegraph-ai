import { ChevronDown, ChevronRight } from "lucide-react";

import type { AstNodeData } from "@/types/workspace";

type ASTNodeProps = {
  node: AstNodeData;
  nodeId: string;
  depth: number;
  expandedNodeIds: Set<string>;
  selectedNodeId: string;
  searchTerm: string;
  sourceText: string | null;
  onSelect: (node: AstNodeData, nodeId: string) => void;
  onToggle: (nodeId: string) => void;
};

function identifierText(node: AstNodeData, sourceText: string | null): string | null {
  if (!sourceText || node.type !== "identifier" || node.start_point.row !== node.end_point.row) return null;
  return sourceText.split("\n")[node.start_point.row]?.slice(node.start_point.column, node.end_point.column) ?? null;
}

export function ASTNode({
  node,
  nodeId,
  depth,
  expandedNodeIds,
  selectedNodeId,
  searchTerm,
  sourceText,
  onSelect,
  onToggle,
}: ASTNodeProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedNodeIds.has(nodeId);
  const isSelected = selectedNodeId === nodeId;
  const identifier = identifierText(node, sourceText);
  const isMatch =
    searchTerm.trim().length > 0 &&
    `${node.type} ${identifier ?? ""}`.toLowerCase().includes(searchTerm.trim().toLowerCase());

  return (
    <li className="relative list-none">
      {/* Node card */}
      <div
        className={`
          group relative flex items-center gap-1.5 cursor-pointer select-none
          transition-all duration-150 ease-out
          ${isSelected
            ? "bg-[#151515] border-l-2 border-white"
            : isMatch
            ? "bg-[#101010] border-l-2 border-[#737373]"
            : "border-l-2 border-transparent hover:bg-[#0D0D0D] hover:border-[#333333]"
          }
        `}
        style={{ paddingLeft: `${depth * 18 + 10}px` }}
        onClick={() => onSelect(node, nodeId)}
      >
        {/* Expand/collapse toggle */}
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(nodeId);
            }}
            className="shrink-0 grid size-4 place-items-center text-[#555555] hover:text-[#A3A3A3] transition-colors"
            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${node.type}`}
          >
            {isExpanded ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
          </button>
        ) : (
          <span className="shrink-0 size-4 grid place-items-center">
            <span className="size-1 rounded-full bg-[#333333]" />
          </span>
        )}

        {/* Node label */}
        <div className="flex min-w-0 items-baseline gap-2 py-[5px] pr-3">
          <span
            className={`font-mono text-[11px] uppercase tracking-wider shrink-0 ${
              isSelected ? "text-[#737373]" : "text-[#555555] group-hover:text-[#737373]"
            } transition-colors`}
          >
            {node.type}
          </span>
          {identifier && (
            <span
              className={`font-mono text-[13px] truncate ${
                isSelected ? "text-white" : isMatch ? "text-[#E5E5E5]" : "text-[#A3A3A3] group-hover:text-[#E5E5E5]"
              } transition-colors`}
            >
              {identifier}
            </span>
          )}
          {hasChildren && (
            <span className="shrink-0 text-[10px] text-[#333333] group-hover:text-[#555555] font-mono transition-colors ml-auto pr-1">
              {node.children.length}
            </span>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <ul
          className="relative"
          style={{
            marginLeft: `${depth * 18 + 19}px`,
            borderLeft: "1px solid #242424",
          }}
        >
          {node.children.map((child, index) => (
            <ASTNode
              key={`${nodeId}.${index}`}
              node={child}
              nodeId={`${nodeId}.${index}`}
              depth={0}
              expandedNodeIds={expandedNodeIds}
              selectedNodeId={selectedNodeId}
              searchTerm={searchTerm}
              sourceText={sourceText}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
