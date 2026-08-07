import { ChevronDown, ChevronRight, Circle } from "lucide-react";

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

export function ASTNode({ node, nodeId, depth, expandedNodeIds, selectedNodeId, searchTerm, sourceText, onSelect, onToggle }: ASTNodeProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedNodeIds.has(nodeId);
  const identifier = identifierText(node, sourceText);
  const label = identifier ? `${node.type}: ${identifier}` : node.type;
  const isMatch = searchTerm.trim().length > 0 && label.toLowerCase().includes(searchTerm.trim().toLowerCase());

  return (
    <li>
      <div className={`flex min-w-max items-center rounded text-xs ${selectedNodeId === nodeId ? "bg-cyan-400/10 text-cyan-200" : isMatch ? "bg-amber-400/10 text-amber-200" : "text-slate-400 hover:bg-slate-800/70"}`} style={{ paddingLeft: `${depth * 14 + 4}px` }}>
        {hasChildren ? <button type="button" onClick={() => onToggle(nodeId)} className="grid size-5 place-items-center text-slate-500 hover:text-slate-200" aria-label={`${isExpanded ? "Collapse" : "Expand"} ${node.type}`}>{isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}</button> : <span className="grid size-5 place-items-center"><Circle className="size-1.5 fill-slate-600 text-slate-600" /></span>}
        <button type="button" onClick={() => onSelect(node, nodeId)} className="flex min-w-0 flex-1 items-center gap-1 py-1 pr-3 text-left font-mono"><span className="truncate">{label}</span>{hasChildren && <span className="shrink-0 font-sans text-[10px] text-slate-600">{node.children.length}</span>}</button>
      </div>
      {hasChildren && isExpanded && <ul>{node.children.map((child, index) => <ASTNode key={`${nodeId}.${index}`} node={child} nodeId={`${nodeId}.${index}`} depth={depth + 1} expandedNodeIds={expandedNodeIds} selectedNodeId={selectedNodeId} searchTerm={searchTerm} sourceText={sourceText} onSelect={onSelect} onToggle={onToggle} />)}</ul>}
    </li>
  );
}
