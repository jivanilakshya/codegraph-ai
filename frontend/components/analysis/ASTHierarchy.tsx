"use client";

import {
  ArrowRight,
  Box,
  Braces,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Code2,
  FunctionSquare,
  GitBranch,
  Layers3,
  Minus,
  RotateCcw,
  Split,
  SquareCode,
  Variable,
} from "lucide-react";
import React, { useCallback, useId, useMemo, useState } from "react";

import type { AstNodeData } from "@/types/workspace";

function cn(...c: (string | boolean | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type HierarchyNodeKind =
  | "module"
  | "import"
  | "class"
  | "function"
  | "method"
  | "variable"
  | "parameter"
  | "return"
  | "call"
  | "if"
  | "for"
  | "while"
  | "assignment"
  | "comment"
  | "expression"
  | "statement"
  | "identifier"
  | "other";

export interface HierarchyNode {
  id: string;
  kind: HierarchyNodeKind;
  label: string;
  /** Short supplemental description (e.g. line range) */
  meta: string;
  /** Source snippet */
  source?: string;
  children: HierarchyNode[];
  rawNode: AstNodeData;
  /** Whether this is a "meaningful" node vs a low-level parser detail */
  isHighLevel: boolean;
}

// ─── Classification helpers ───────────────────────────────────────────────────

const HIGH_LEVEL_RAW_TYPES = new Set([
  "module","translation_unit","program","file",
  "import_statement","import_from_statement","import_declaration","use_declaration","require_call",
  "class_definition","class_declaration","class_body","struct_specifier","interface_declaration","enum_declaration",
  "function_definition","function_declaration","function_expression","arrow_function","method_definition",
  "function_declarator","lambda",
  "decorated_definition",
  "parameters","formal_parameters","parameter_list",
  "identifier","type_identifier","field_identifier",
  "block","compound_statement","statement_block",
  "return_statement","yield_statement",
  "call","call_expression","function_call",
  "if_statement","if","elif_clause","else_clause","conditional_expression",
  "for_statement","for","while_statement","while",
  "assignment","augmented_assignment","assignment_expression","expression_statement",
  "comment","line_comment","block_comment",
]);

const LOW_LEVEL_SKIP = new Set([
  "string","string_content","string_start","string_end",
  "(",")","[","]","{","}",",",".",":",";","->","=>","=","==","!=","<",">",
  "\"","'","true","false","none","null","undefined","self","this",
  "integer","float","number","binary_operator","comparison_operator",
  "unary_operator","boolean_operator","not_operator","and","or","not","in","is",
  "def","class","import","from","return","if","elif","else","for","while",
  "pass","break","continue","raise","try","except","finally","with","as","global","nonlocal",
  "new","delete","typeof","instanceof","void","const","let","var","async","await",
  "keyword_argument","named_expression","concatenated_string","interpolation","escape_sequence",
  "dotted_name","relative_import","future_import_statement","print_statement",
  "parenthesized_expression","not_operator","boolean","none","ellipsis",
]);

function classifyKind(rawType: string): HierarchyNodeKind {
  if (rawType === "module" || rawType === "translation_unit" || rawType === "program" || rawType === "file") return "module";
  if (rawType.includes("import") || rawType === "use_declaration" || rawType === "require_call") return "import";
  if (rawType.includes("class") || rawType.includes("struct") || rawType.includes("interface") || rawType.includes("enum")) return "class";
  if (rawType === "method_definition") return "method";
  if (rawType.includes("function") || rawType.includes("arrow_function") || rawType === "lambda" || rawType === "decorated_definition") return "function";
  if (rawType.includes("parameters") || rawType.includes("parameter_list") || rawType.includes("formal_parameters")) return "parameter";
  if (rawType.includes("return") || rawType.includes("yield")) return "return";
  if (rawType === "call" || rawType === "call_expression" || rawType === "function_call") return "call";
  if (rawType.includes("if") || rawType.includes("elif") || rawType.includes("else")) return "if";
  if (rawType.includes("for")) return "for";
  if (rawType.includes("while")) return "while";
  if (rawType.includes("assignment")) return "assignment";
  if (rawType.includes("comment")) return "comment";
  if (rawType === "identifier" || rawType === "type_identifier" || rawType === "field_identifier") return "identifier";
  if (rawType.includes("expression")) return "expression";
  if (rawType.includes("statement") || rawType === "block" || rawType === "compound_statement" || rawType === "statement_block") return "statement";
  return "other";
}

function isHighLevelNode(rawType: string): boolean {
  return HIGH_LEVEL_RAW_TYPES.has(rawType);
}

function shouldSkip(rawType: string): boolean {
  return LOW_LEVEL_SKIP.has(rawType) || rawType.length <= 1;
}

// ─── Source snippet extraction ─────────────────────────────────────────────

function getSnippet(node: AstNodeData, lines: string[]): string | undefined {
  if (lines.length === 0) return undefined;
  const startRow = node.start_point.row;
  const endRow = node.end_point.row;
  if (startRow < 0 || startRow >= lines.length) return undefined;
  const maxLines = 8;
  const actualEnd = Math.min(endRow, startRow + maxLines - 1);
  if (startRow === actualEnd) {
    const s = lines[startRow]?.slice(node.start_point.column, node.end_point.column)?.trim();
    return s || undefined;
  }
  const parts = [
    lines[startRow]?.slice(node.start_point.column),
    ...lines.slice(startRow + 1, actualEnd),
    actualEnd < endRow ? "    …" : lines[actualEnd]?.slice(0, node.end_point.column),
  ].filter((l) => l !== undefined);
  return parts.join("\n").trim() || undefined;
}

// ─── Label computation ────────────────────────────────────────────────────────

function getLabel(
  node: AstNodeData,
  kind: HierarchyNodeKind,
  lines: string[],
  fileName?: string
): string {
  function getLine(row: number, startCol: number, endCol: number): string {
    return lines[row]?.slice(startCol, endCol)?.trim() ?? "";
  }

  function findChildText(rawTypes: string[]): string | null {
    for (const c of node.children) {
      if (rawTypes.includes(c.type)) {
        const t = getLine(c.start_point.row, c.start_point.column, c.end_point.column);
        if (t) return t;
      }
    }
    return null;
  }

  switch (kind) {
    case "module":
      return fileName ?? "module";
    case "import": {
      const firstLine = lines[node.start_point.row]?.trim() ?? "";
      // Extract the imported name from "from X import Y" or "import X"
      const fromMatch = firstLine.match(/^from\s+([\w.]+)/);
      const importMatch = firstLine.match(/^import\s+([\w.,\s]+)/);
      if (fromMatch) return fromMatch[1] ?? firstLine;
      if (importMatch) return (importMatch[1] ?? firstLine).trim().split(",")[0]?.trim() ?? firstLine;
      return firstLine.slice(0, 32) || "import";
    }
    case "class": {
      const name = findChildText(["identifier","type_identifier","name"]);
      return name ?? "Class";
    }
    case "function":
    case "method": {
      const name = findChildText(["identifier","name","property_identifier"]);
      if (name) return `${name}()`;
      // Try parsing first line
      const firstLine = lines[node.start_point.row]?.slice(node.start_point.column)?.trim() ?? "";
      const match = firstLine.match(/(?:def|function|fn)\s+(\w+)/);
      return match ? `${match[1]}()` : "function()";
    }
    case "parameter": {
      // Count named params
      const paramChildren = node.children.filter(
        (c) => c.is_named && !["(", ")", ","].includes(c.type)
      );
      return paramChildren.length > 0
        ? `${paramChildren.length} param${paramChildren.length === 1 ? "" : "s"}`
        : "parameters";
    }
    case "return": {
      const firstLine = lines[node.start_point.row]?.slice(node.start_point.column)?.trim() ?? "";
      const short = firstLine.length > 28 ? `${firstLine.slice(0, 26)}…` : firstLine;
      return short || "return";
    }
    case "call": {
      const firstLine = lines[node.start_point.row]?.slice(node.start_point.column)?.trim() ?? "";
      const short = firstLine.length > 32 ? `${firstLine.slice(0, 30)}…` : firstLine;
      return short || "call";
    }
    case "if": {
      const firstLine = lines[node.start_point.row]?.slice(node.start_point.column)?.trim() ?? "";
      const short = firstLine.length > 32 ? `${firstLine.slice(0, 30)}…` : firstLine;
      return short || "if …";
    }
    case "for": {
      const firstLine = lines[node.start_point.row]?.slice(node.start_point.column)?.trim() ?? "";
      const short = firstLine.length > 32 ? `${firstLine.slice(0, 30)}…` : firstLine;
      return short || "for …";
    }
    case "while": {
      const firstLine = lines[node.start_point.row]?.slice(node.start_point.column)?.trim() ?? "";
      const short = firstLine.length > 32 ? `${firstLine.slice(0, 30)}…` : firstLine;
      return short || "while …";
    }
    case "assignment": {
      const firstLine = lines[node.start_point.row]?.slice(node.start_point.column)?.trim() ?? "";
      const short = firstLine.length > 32 ? `${firstLine.slice(0, 30)}…` : firstLine;
      return short || "assignment";
    }
    case "comment": {
      const text = getSnippet(node, lines) ?? "";
      return text.length > 36 ? `${text.slice(0, 34)}…` : text || "# comment";
    }
    case "identifier": {
      const text = getLine(node.start_point.row, node.start_point.column, node.end_point.column);
      return text || node.type;
    }
    case "statement": {
      const firstLine = lines[node.start_point.row]?.slice(node.start_point.column)?.trim() ?? "";
      const short = firstLine.length > 36 ? `${firstLine.slice(0, 34)}…` : firstLine;
      return short || node.type.replace(/_/g, " ");
    }
    default: {
      const firstLine = lines[node.start_point.row]?.slice(node.start_point.column)?.trim() ?? "";
      const short = firstLine.length > 36 ? `${firstLine.slice(0, 34)}…` : firstLine;
      return short || node.type.replace(/_/g, " ");
    }
  }
}

// ─── Tree builder ────────────────────────────────────────────────────────────

let nodeCounter = 0;

function buildNode(
  node: AstNodeData,
  lines: string[],
  idPrefix: string,
  depth: number,
  fileName?: string
): HierarchyNode | null {
  if (shouldSkip(node.type)) return null;
  if (!isHighLevelNode(node.type) && depth > 3) return null;

  const kind = classifyKind(node.type);
  const id = `${idPrefix}-${nodeCounter++}`;
  const startLine = node.start_point.row + 1;
  const endLine = node.end_point.row + 1;
  const meta = startLine === endLine ? `L${startLine}` : `L${startLine}–${endLine}`;
  const label = getLabel(node, kind, lines, fileName);
  const source = getSnippet(node, lines);
  const isHL = isHighLevelNode(node.type);

  const children: HierarchyNode[] = [];
  for (const child of node.children) {
    const built = buildNode(child, lines, id, depth + 1, fileName);
    if (built) children.push(built);
  }

  // Collapse low-level nodes that have no interesting children
  if (!isHL && children.length === 0) return null;

  return { id, kind, label, meta, source, children, rawNode: node, isHighLevel: isHL };
}

export function buildHierarchyTree(
  ast: AstNodeData,
  sourceText: string | null,
  fileName?: string
): HierarchyNode {
  nodeCounter = 0;
  const lines = sourceText ? sourceText.split("\n") : [];
  const root = buildNode(ast, lines, "root", 0, fileName);
  return root ?? {
    id: "root-0",
    kind: "module",
    label: fileName ?? "module",
    meta: "",
    children: [],
    rawNode: ast,
    isHighLevel: true,
  };
}

// ─── Stat counters ────────────────────────────────────────────────────────────

export interface AstStats {
  total: number;
  byKind: Partial<Record<HierarchyNodeKind, number>>;
}

export function computeStats(root: HierarchyNode): AstStats {
  let total = 0;
  const byKind: Partial<Record<HierarchyNodeKind, number>> = {};
  function walk(n: HierarchyNode) {
    total++;
    byKind[n.kind] = (byKind[n.kind] ?? 0) + 1;
    n.children.forEach(walk);
  }
  walk(root);
  return { total, byKind };
}

// ─── Icon & visual metadata ───────────────────────────────────────────────────

const KIND_VISUAL: Record<
  HierarchyNodeKind,
  { icon: React.ElementType; tone: string; label: string }
> = {
  module:     { icon: Layers3,        tone: "text-sky-300",     label: "MODULE" },
  import:     { icon: GitBranch,      tone: "text-violet-300",  label: "IMPORT" },
  class:      { icon: Box,            tone: "text-indigo-300",  label: "CLASS" },
  function:   { icon: FunctionSquare, tone: "text-[#00e5ff]",   label: "FUNCTION" },
  method:     { icon: FunctionSquare, tone: "text-cyan-300",    label: "METHOD" },
  variable:   { icon: Variable,       tone: "text-emerald-300", label: "VARIABLE" },
  parameter:  { icon: Split,          tone: "text-amber-200",   label: "PARAMS" },
  return:     { icon: ArrowRight,     tone: "text-orange-300",  label: "RETURN" },
  call:       { icon: Braces,         tone: "text-purple-300",  label: "CALL" },
  if:         { icon: SquareCode,     tone: "text-yellow-200",  label: "IF" },
  for:        { icon: RotateCcw,      tone: "text-lime-300",    label: "FOR" },
  while:      { icon: RotateCcw,      tone: "text-lime-200",    label: "WHILE" },
  assignment: { icon: Variable,       tone: "text-teal-300",    label: "ASSIGN" },
  comment:    { icon: Minus,          tone: "text-slate-400",   label: "COMMENT" },
  expression: { icon: Braces,         tone: "text-[#9cabc0]",   label: "EXPR" },
  statement:  { icon: SquareCode,     tone: "text-[#9cabc0]",   label: "STMT" },
  identifier: { icon: CircleDot,      tone: "text-sky-200",     label: "IDENT" },
  other:      { icon: Code2,          tone: "text-slate-500",   label: "NODE" },
};

// ─── Single tree row ──────────────────────────────────────────────────────────

type ASTRowProps = {
  node: HierarchyNode;
  depth: number;
  isSelected: boolean;
  isExpanded: boolean;
  searchTerm: string;
  onSelect: (n: HierarchyNode) => void;
  onToggle: (id: string) => void;
};

function highlightText(text: string, term: string): React.ReactNode {
  if (!term) return text;
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[#00e5ff]/20 text-[#00e5ff] rounded px-0.5">{text.slice(idx, idx + term.length)}</mark>
      {text.slice(idx + term.length)}
    </>
  );
}

function getLabelStyling(kind: HierarchyNodeKind, isSelected: boolean, depth: number): string {
  if (kind === "module") {
    return "font-mono text-[16px] font-bold tracking-tight text-white";
  }
  if (kind === "function" || kind === "class" || kind === "method") {
    return isSelected
      ? "font-mono text-[15px] font-semibold text-white"
      : "font-mono text-[15px] font-semibold text-slate-100 group-hover:text-white";
  }
  if (["parameter", "return", "if", "for", "while", "assignment"].includes(kind)) {
    return isSelected
      ? "font-mono text-[14px] font-medium text-white"
      : "font-mono text-[14px] font-medium text-slate-200 group-hover:text-white";
  }
  if (["statement", "identifier", "call", "expression"].includes(kind)) {
    return isSelected
      ? "font-mono text-[13.5px] font-normal text-white"
      : "font-mono text-[13.5px] font-normal text-slate-300 group-hover:text-slate-100";
  }
  return isSelected
    ? "font-mono text-[12.5px] text-slate-200"
    : "font-mono text-[12.5px] text-slate-400 group-hover:text-slate-200";
}

function ASTRow({ node, depth, isSelected, isExpanded, searchTerm, onSelect, onToggle }: ASTRowProps) {
  const visual = KIND_VISUAL[node.kind] ?? KIND_VISUAL.other;
  const Icon = visual.icon;
  const hasChildren = node.children.length > 0;
  const indentPx = depth * 22;

  return (
    <div
      className={cn(
        "ast-hierarchy-row group relative flex items-center gap-2.5 pr-3 cursor-pointer select-none transition-colors",
        depth === 0 ? "h-10 my-0.5" : "h-9 my-0.5"
      )}
      style={{ paddingLeft: `${10 + indentPx}px` }}
      onClick={() => onSelect(node)}
      role="option"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect(node)}
      aria-selected={isSelected}
    >
      {/* Active indicator */}
      {isSelected && (
        <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-[#00e5ff] shadow-[0_0_8px_#00e5ff]" />
      )}

      {/* Indent guide lines */}
      {depth > 0 && Array.from({ length: depth }).map((_, i) => (
        <span
          key={i}
          className="absolute top-0 bottom-0 w-px bg-white/[0.06]"
          style={{ left: `${10 + i * 22 + 9}px` }}
        />
      ))}

      {/* Expand/collapse toggle */}
      <button
        type="button"
        className={`shrink-0 w-4.5 h-4.5 flex items-center justify-center rounded transition-transform duration-200 ${
          hasChildren ? "opacity-70 hover:opacity-100 hover:bg-white/[0.08]" : "opacity-0 pointer-events-none"
        }`}
        onClick={(e) => { e.stopPropagation(); if (hasChildren) onToggle(node.id); }}
        aria-label={isExpanded ? "Collapse" : "Expand"}
      >
        {hasChildren && (
          isExpanded
            ? <ChevronDown className="w-3.5 h-3.5 text-white/70" />
            : <ChevronRight className="w-3.5 h-3.5 text-white/50" />
        )}
      </button>

      {/* Icon */}
      <span className={`shrink-0 w-4 h-4 ${visual.tone}`}>
        <Icon className="w-full h-full" />
      </span>

      {/* Label */}
      <span className={cn("flex-1 min-w-0 truncate transition-colors", getLabelStyling(node.kind, isSelected, depth))}>
        {highlightText(node.label, searchTerm)}
      </span>

      {/* Kind badge (hidden at deep levels) */}
      {depth <= 2 && (
        <span className={`shrink-0 font-mono text-[11px] font-medium tracking-[0.1em] uppercase ${visual.tone} opacity-80 px-1.5 py-0.2 rounded border border-white/[0.06] bg-white/[0.02]`}>
          {visual.label}
        </span>
      )}

      {/* Meta (line info) */}
      <span className="shrink-0 font-mono text-[11.5px] text-white/35 font-medium ml-1.5">{node.meta}</span>

      {/* Active row background */}
      <span
        className={`absolute inset-y-0.5 left-1 right-0 rounded-md -z-10 transition-all duration-150 ${
          isSelected
            ? "bg-gradient-to-r from-[#00e5ff]/[0.12] via-[#00e5ff]/[0.03] to-transparent shadow-[inset_0_0_12px_rgba(0,229,255,0.04)]"
            : "bg-transparent group-hover:bg-white/[0.035]"
        }`}
      />
    </div>
  );
}

// ─── Search filter ────────────────────────────────────────────────────────────

function matchesSearch(node: HierarchyNode, term: string): boolean {
  if (!term) return true;
  const q = term.toLowerCase();
  if (node.label.toLowerCase().includes(q)) return true;
  if (node.kind.toLowerCase().includes(q)) return true;
  if (KIND_VISUAL[node.kind]?.label.toLowerCase().includes(q)) return true;
  return false;
}

function filterTree(node: HierarchyNode, term: string): HierarchyNode | null {
  if (!term) return node;
  const filteredChildren = node.children
    .map((c) => filterTree(c, term))
    .filter(Boolean) as HierarchyNode[];
  const selfMatches = matchesSearch(node, term);
  if (selfMatches || filteredChildren.length > 0) {
    return { ...node, children: filteredChildren };
  }
  return null;
}

// ─── Recursive render ─────────────────────────────────────────────────────────

type TreeRendererProps = {
  nodes: HierarchyNode[];
  depth: number;
  selectedId: string | null;
  expandedIds: Set<string>;
  searchTerm: string;
  onSelect: (n: HierarchyNode) => void;
  onToggle: (id: string) => void;
};

function TreeRenderer({
  nodes, depth, selectedId, expandedIds, searchTerm, onSelect, onToggle,
}: TreeRendererProps) {
  return (
    <>
      {nodes.map((node) => {
        const isSelected = node.id === selectedId;
        const isExpanded = expandedIds.has(node.id);
        return (
          <div key={node.id}>
            <ASTRow
              node={node}
              depth={depth}
              isSelected={isSelected}
              isExpanded={isExpanded}
              searchTerm={searchTerm}
              onSelect={onSelect}
              onToggle={onToggle}
            />
            {isExpanded && node.children.length > 0 && (
              <div className="ast-children-panel overflow-hidden">
                <TreeRenderer
                  nodes={node.children}
                  depth={depth + 1}
                  selectedId={selectedId}
                  expandedIds={expandedIds}
                  searchTerm={searchTerm}
                  onSelect={onSelect}
                  onToggle={onToggle}
                />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface ASTHierarchyProps {
  root: HierarchyNode;
  searchTerm: string;
  selectedId: string | null;
  onSelect: (node: HierarchyNode) => void;
}

export function ASTHierarchy({ root, searchTerm, selectedId, onSelect }: ASTHierarchyProps) {
  const id = useId();

  // Default: expand root and its direct children
  const defaultExpanded = useMemo(() => {
    const s = new Set<string>([root.id]);
    root.children.forEach((c) => {
      s.add(c.id);
      // Also expand first-level function/class children (params, body groups)
      if (["function","method","class"].includes(c.kind)) {
        c.children.slice(0, 3).forEach((cc) => s.add(cc.id));
      }
    });
    return s;
  }, [root]);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(defaultExpanded);

  const handleToggle = useCallback((nodeId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    const all = new Set<string>();
    function collect(n: HierarchyNode) {
      all.add(n.id);
      n.children.forEach(collect);
    }
    collect(root);
    setExpandedIds(all);
  }, [root]);

  const handleCollapseAll = useCallback(() => {
    setExpandedIds(new Set([root.id]));
  }, [root.id]);

  const displayRoot = useMemo(() => {
    return filterTree(root, searchTerm) ?? root;
  }, [root, searchTerm]);

  return (
    <div className="flex flex-col h-full" id={`ast-tree-${id}`}>
      {/* Expand / Collapse all controls */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/[0.04] shrink-0">
        <span className="font-mono text-[9px] text-white/25 uppercase tracking-widest">Tree</span>
        <div className="flex items-center gap-1 ml-auto">
          <button
            type="button"
            onClick={handleExpandAll}
            className="font-mono text-[9.5px] text-white/30 hover:text-[#00e5ff] transition-colors px-2 py-0.5 rounded hover:bg-[#00e5ff]/[0.06]"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={handleCollapseAll}
            className="font-mono text-[9.5px] text-white/30 hover:text-[#00e5ff] transition-colors px-2 py-0.5 rounded hover:bg-[#00e5ff]/[0.06]"
          >
            Collapse
          </button>
        </div>
      </div>

      {/* Tree content */}
      <div className="flex-1 min-h-0 overflow-y-auto py-1.5 ast-hierarchy-scroll">
        <TreeRenderer
          nodes={[displayRoot]}
          depth={0}
          selectedId={selectedId}
          expandedIds={expandedIds}
          searchTerm={searchTerm}
          onSelect={onSelect}
          onToggle={handleToggle}
        />
      </div>
    </div>
  );
}

// Re-export visual metadata for use in Details panel
export { KIND_VISUAL };
