"use client";

import {
  Box,
  Braces,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Code2,
  FileCode2,
  FileText,
  FunctionSquare,
  GitBranch,
  Layers3,
  RefreshCw,
  Search,
  Split,
  SquareCode,
  Variable,
  X,
} from "lucide-react";
import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useActiveProject } from "@/hooks/useActiveProject";
import { cn } from "@/lib/cn";
import {
  getFileAnalysis,
  getFileContent,
  getRepositoryWorkspace,
} from "@/services/workspace";
import type {
  AstEntity,
  AstNodeData,
  AstType,
  FileAnalysis,
  FileSymbols,
  RepositoryFile,
} from "@/types/workspace";

const TYPE_META: Record<
  AstType,
  { plural: string; icon: React.ElementType; tone: string }
> = {
  Module: { plural: "Modules", icon: Layers3, tone: "text-sky-300" },
  Import: { plural: "Imports", icon: GitBranch, tone: "text-violet-300" },
  Class: { plural: "Classes", icon: Box, tone: "text-indigo-300" },
  Function: { plural: "Functions", icon: FunctionSquare, tone: "text-primary" },
  Variable: { plural: "Variables", icon: Variable, tone: "text-emerald-300" },
  Parameter: { plural: "Parameters", icon: Split, tone: "text-amber-200" },
  Identifier: { plural: "Identifiers", icon: CircleDot, tone: "text-sky-200" },
  Statement: { plural: "Statements", icon: SquareCode, tone: "text-[#9cabc0]" },
  Expression: { plural: "Expressions", icon: Braces, tone: "text-[#9cabc0]" },
};

const TYPE_ORDER: AstType[] = [
  "Module",
  "Import",
  "Class",
  "Function",
  "Variable",
  "Parameter",
  "Identifier",
  "Statement",
  "Expression",
];

function extractAstEntities(
  ast: AstNodeData | null | undefined,
  sourceText: string | null | undefined,
  fileName: string,
  language?: string | null,
  symbols?: FileSymbols | null
): AstEntity[] {
  const result: AstEntity[] = [];
  const lines = sourceText ? sourceText.split("\n") : [];
  const totalLines = lines.length || 1;

  const moduleLine = totalLines === 1 ? "Line 1" : `Lines 1–${totalLines}`;
  const langName =
    language ??
    (fileName.endsWith(".py")
      ? "Python"
      : fileName.endsWith(".ts") || fileName.endsWith(".tsx")
      ? "TypeScript"
      : fileName.endsWith(".js")
      ? "JavaScript"
      : fileName.endsWith(".md")
      ? "Markdown"
      : "Source");

  result.push({
    id: `mod-${fileName}`,
    type: "Module",
    name: fileName,
    description: `${langName} source module`,
    line: moduleLine,
    parent: "Root",
    children: ast?.children ? ast.children.filter((c) => c.is_named).length : 0,
    source: sourceText
      ? lines.slice(0, 20).join("\n") + (lines.length > 20 ? "\n…" : "")
      : undefined,
    rawNode: ast ?? undefined,
  });

  if (!ast) return result;

  let counter = 0;
  const seenKeys = new Set<string>();

  function getLineText(row: number, startCol?: number, endCol?: number): string {
    const l = lines[row];
    if (!l) return "";
    if (startCol !== undefined && endCol !== undefined) {
      return l.slice(startCol, endCol).trim();
    }
    return l.trim();
  }

  function getSnippet(node: AstNodeData): string | undefined {
    if (lines.length === 0) return undefined;
    const startRow = node.start_point.row;
    const endRow = node.end_point.row;
    if (startRow < 0 || startRow >= lines.length) return undefined;
    const maxLines = 10;
    const actualEnd = Math.min(endRow, startRow + maxLines - 1);
    if (startRow === actualEnd) {
      return lines[startRow]?.slice(node.start_point.column, node.end_point.column)?.trim();
    }
    const parts = [
      lines[startRow]?.slice(node.start_point.column),
      ...lines.slice(startRow + 1, actualEnd),
      actualEnd < endRow ? "    …" : lines[actualEnd]?.slice(0, node.end_point.column),
    ].filter(Boolean);
    return parts.join("\n").trim() || undefined;
  }

  function walk(node: AstNodeData, parentName: string, depth: number) {
    if (!node || depth > 8) return;

    const rawType = node.type;
    let entityType: AstType | null = null;
    let desc = "";
    let name = "";

    if (
      rawType.includes("import") ||
      rawType === "use_declaration" ||
      rawType === "require_call"
    ) {
      entityType = "Import";
      desc = "Imported declaration";
      const firstLine = getLineText(node.start_point.row);
      const match = firstLine.match(
        /^(?:from\s+[\w.]+\s+import\s+[\w*,\s]+|import\s+[\w.,\s]+)/
      );
      name = match ? match[0] : firstLine.slice(0, 40) || "import";
    } else if (
      rawType.includes("class") ||
      rawType.includes("struct") ||
      rawType.includes("interface") ||
      rawType.includes("enum")
    ) {
      entityType = "Class";
      desc = "Class / type declaration";
      const idChild = node.children.find((c) =>
        ["identifier", "type_identifier", "name"].includes(c.type)
      );
      name = idChild
        ? getLineText(idChild.start_point.row, idChild.start_point.column, idChild.end_point.column)
        : "Class";
    } else if (
      rawType === "function_definition" ||
      rawType === "function_declaration" ||
      rawType === "function_expression" ||
      rawType === "arrow_function" ||
      rawType === "method_definition" ||
      rawType === "lambda" ||
      rawType === "decorated_definition"
    ) {
      entityType = "Function";
      desc =
        rawType === "method_definition"
          ? "Class method definition"
          : "Callable function definition";
      const idChild = node.children.find((c) =>
        ["identifier", "name", "property_identifier"].includes(c.type)
      );
      if (idChild) {
        name = getLineText(idChild.start_point.row, idChild.start_point.column, idChild.end_point.column);
      } else {
        const firstLine = getLineText(node.start_point.row);
        const match = firstLine.match(/(?:def|function|fn)\s+(\w+)/);
        name = match ? match[1] : "function";
      }
    } else if (
      rawType.includes("parameter") ||
      rawType === "formal_parameters" ||
      rawType === "parameter_list"
    ) {
      if (
        rawType === "parameter" ||
        rawType === "typed_parameter" ||
        rawType === "default_parameter"
      ) {
        entityType = "Parameter";
        desc = "Typed function parameter";
        name = getSnippet(node) || getLineText(node.start_point.row);
      }
    } else if (
      rawType === "assignment" ||
      rawType === "augmented_assignment" ||
      rawType === "variable_declarator" ||
      rawType === "field_declaration"
    ) {
      entityType = "Variable";
      desc = "Variable / field assignment";
      const leftChild = node.children[0];
      name = leftChild
        ? getSnippet(leftChild) || getLineText(leftChild.start_point.row)
        : getLineText(node.start_point.row).slice(0, 30);
    } else if (
      rawType === "identifier" ||
      rawType === "type_identifier" ||
      rawType === "field_identifier"
    ) {
      if (node.is_named && depth <= 3) {
        entityType = "Identifier";
        desc = "Referenced identifier symbol";
        name = getLineText(node.start_point.row, node.start_point.column, node.end_point.column);
      }
    } else if (
      rawType.includes("if_") ||
      rawType.includes("for_") ||
      rawType.includes("while_") ||
      rawType.includes("return_")
    ) {
      entityType = "Statement";
      const firstLine = getLineText(node.start_point.row);
      desc = rawType.includes("if")
        ? "Conditional branch statement"
        : rawType.includes("return")
        ? "Return statement"
        : "Control flow statement";
      name = firstLine.length > 36 ? `${firstLine.slice(0, 34)}…` : firstLine || rawType;
    } else if (
      rawType === "call" ||
      rawType === "call_expression" ||
      rawType === "function_call"
    ) {
      entityType = "Expression";
      desc = "Function invocation expression";
      const firstLine = getLineText(node.start_point.row);
      name = firstLine.length > 36 ? `${firstLine.slice(0, 34)}…` : firstLine || "call()";
    }

    let currentParent = parentName;

    if (entityType && name) {
      const startRow = node.start_point.row + 1;
      const endRow = node.end_point.row + 1;
      const startCol = node.start_point.column;
      const lineStr =
        startRow === endRow
          ? startCol > 0
            ? `Line ${startRow} · Col ${startCol}`
            : `Line ${startRow}`
          : `Lines ${startRow}–${endRow}`;

      const key = `${entityType}:${name}:${lineStr}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        const childrenCount = node.children.filter((c) => c.is_named).length;
        result.push({
          id: `ast-${counter++}`,
          type: entityType,
          name,
          description: desc,
          line: lineStr,
          parent: parentName,
          children: childrenCount,
          source: getSnippet(node),
          rawNode: node,
        });
        currentParent = name;
      }
    }

    for (const child of node.children) {
      walk(child, currentParent, depth + 1);
    }
  }

  for (const child of ast.children) {
    walk(child, "Module", 1);
  }

  if (symbols) {
    if (symbols.functions) {
      for (const fn of symbols.functions) {
        if (!result.some((r) => r.type === "Function" && r.name === fn)) {
          result.push({
            id: `fn-${counter++}`,
            type: "Function",
            name: fn,
            description: "Callable function definition",
            line: "Declared in module",
            parent: "Module",
            children: 0,
          });
        }
      }
    }
    if (symbols.classes) {
      for (const cls of symbols.classes) {
        if (!result.some((r) => r.type === "Class" && r.name === cls)) {
          result.push({
            id: `cls-${counter++}`,
            type: "Class",
            name: cls,
            description: "Class / type declaration",
            line: "Declared in module",
            parent: "Module",
            children: 0,
          });
        }
      }
    }
    if (symbols.imports) {
      for (const imp of symbols.imports) {
        if (!result.some((r) => r.type === "Import" && r.name === imp)) {
          result.push({
            id: `imp-${counter++}`,
            type: "Import",
            name: imp,
            description: "Imported declaration",
            line: "Line 1",
            parent: "Module",
            children: 0,
          });
        }
      }
    }
    if (symbols.variables) {
      for (const v of symbols.variables) {
        if (!result.some((r) => r.type === "Variable" && r.name === v)) {
          result.push({
            id: `var-${counter++}`,
            type: "Variable",
            name: v,
            description: "Variable declaration",
            line: "Module scope",
            parent: "Module",
            children: 0,
          });
        }
      }
    }
  }

  return result;
}

function AstPageInner() {
  const {
    projects,
    activeProjectId,
    activeProject,
    isLoadingProjects,
    errorLoadingProjects,
    selectProject,
  } = useActiveProject();

  const [files, setFiles] = useState<RepositoryFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<RepositoryFile | null>(null);
  const [analysis, setAnalysis] = useState<FileAnalysis | null>(null);
  const [sourceText, setSourceText] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fileFilter, setFileFilter] = useState("");
  const [astQuery, setAstQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All Types" | AstType>("All Types");

  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [projectOpen, setProjectOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Mobile panel tab state
  const [mobilePanel, setMobilePanel] = useState<"explorer" | "ast" | "details">("explorer");

  const projectRef = useRef<HTMLDivElement>(null);

  // Close project selector popover on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        projectRef.current &&
        !projectRef.current.contains(e.target as Node)
      ) {
        setProjectOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load workspace files
  const loadWorkspace = useCallback(async () => {
    if (!activeProjectId) return;
    setIsLoadingWorkspace(true);
    setWorkspaceError(null);
    setSelectedFile(null);
    setAnalysis(null);
    setSourceText(null);
    setSelectedId(null);

    try {
      const response = await getRepositoryWorkspace(activeProjectId);
      const loadedFiles = response.files || [];
      setFiles(loadedFiles);
      if (loadedFiles.length > 0) {
        setSelectedFile(loadedFiles[0]);
      }
    } catch (err) {
      setWorkspaceError(
        err instanceof Error ? err.message : "Failed to load workspace files."
      );
    } finally {
      setIsLoadingWorkspace(false);
    }
  }, [activeProjectId]);

  useEffect(() => {
    if (activeProjectId) {
      void loadWorkspace();
    }
  }, [activeProjectId, loadWorkspace, refreshTrigger]);

  // Load file analysis & content
  const loadAnalysis = useCallback(async () => {
    if (!activeProjectId || !selectedFile) return;
    setIsLoadingAnalysis(true);
    setAnalysisError(null);
    setSelectedId(null);
    setAstQuery("");
    setTypeFilter("All Types");
    setSourceOpen(false);

    try {
      const [analysisData, fileContent] = await Promise.all([
        getFileAnalysis(selectedFile.id),
        getFileContent(activeProjectId, selectedFile.id).catch(() => null),
      ]);
      setAnalysis(analysisData);
      setSourceText(fileContent ? fileContent.content : null);
    } catch (err) {
      setAnalysisError(
        err instanceof Error ? err.message : "Failed to parse file AST."
      );
    } finally {
      setIsLoadingAnalysis(false);
    }
  }, [activeProjectId, selectedFile]);

  useEffect(() => {
    if (selectedFile) {
      void loadAnalysis();
    }
  }, [selectedFile, loadAnalysis]);

  // Extract structured AST entities from real backend data
  const entities = useMemo(() => {
    if (!selectedFile) return [];
    const fileName = selectedFile.path.split("/").pop() ?? selectedFile.path;
    return extractAstEntities(
      analysis?.ast,
      sourceText,
      fileName,
      selectedFile.language ?? analysis?.language,
      analysis?.symbols
    );
  }, [analysis, sourceText, selectedFile]);

  const selectedEntity = useMemo(
    () => entities.find((item) => item.id === selectedId) ?? null,
    [entities, selectedId]
  );

  const filteredFiles = useMemo(() => {
    const q = fileFilter.trim().toLowerCase();
    return q
      ? files.filter(
          (f) =>
            f.path.toLowerCase().includes(q) ||
            (f.language && f.language.toLowerCase().includes(q))
        )
      : files;
  }, [files, fileFilter]);

  const filteredEntities = useMemo(() => {
    const q = astQuery.trim().toLowerCase();
    return entities.filter(
      (item) =>
        (typeFilter === "All Types" || item.type === typeFilter) &&
        (!q ||
          `${item.name} ${item.type} ${item.description} ${item.parent} ${item.line}`
            .toLowerCase()
            .includes(q))
    );
  }, [entities, astQuery, typeFilter]);

  const sections = useMemo(() => {
    return TYPE_ORDER.map((type) => ({
      type,
      items: filteredEntities.filter((item) => item.type === type),
    })).filter((section) => section.items.length > 0);
  }, [filteredEntities]);

  const handleSelectFile = (file: RepositoryFile) => {
    setSelectedFile(file);
    setMobilePanel("ast");
  };

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const selectedFileName = selectedFile
    ? selectedFile.path.split("/").pop() ?? selectedFile.path
    : null;

  if (isLoadingProjects) {
    return (
      <div className="flex h-full items-center justify-center gap-3 font-mono text-xs text-muted-foreground">
        <RefreshCw className="w-4 h-4 animate-spin text-primary" />
        Loading project…
      </div>
    );
  }

  if (errorLoadingProjects) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <p className="font-mono text-xs text-rose-300">{errorLoadingProjects}</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden select-none px-3 md:px-5 lg:px-6 pt-2.5 md:pt-3 pb-3 md:pb-4 max-w-[1780px] mx-auto min-w-0 box-border">
      {/* ── Page Header: Matching Figma Redesign ── */}
      <section
        className="relative z-40 shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-3 pb-2.5 border-b border-white/[0.06] mb-3 reveal"
        style={{ ["--d" as string]: "80ms" }}
      >
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_#00e5ff]" />
            <span className="cg-label">CodeGraph AI / Structural Analysis</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
            AST <span className="text-white/25">/</span> Abstract Syntax Tree
          </h1>
          <p className="text-muted-foreground text-[12.5px] sm:text-[13px] md:text-[13.5px] mt-1">
            Inspect how CodeGraph AI understands the structure of your source code.
          </p>
        </div>

        {/* Active Project Context Selector */}
        <div className="relative shrink-0" ref={projectRef}>
          <div className="cg-label mb-1.5">Active Project Context</div>
          <button
            type="button"
            onClick={() => setProjectOpen((open) => !open)}
            className={cn(
              "flex items-center gap-3 justify-between w-full md:w-64 h-9.5 pl-3 pr-2.5 rounded-lg border bg-white/[0.02] transition-all text-[13px]",
              projectOpen
                ? "border-primary/40 shadow-[0_0_0_3px_rgba(0,229,255,0.06),0_0_24px_-6px_rgba(0,229,255,0.35)]"
                : "border-white/[0.08] hover:border-white/20"
            )}
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_#00e5ff]" />
              <span className="text-white font-medium truncate">
                {activeProject?.name ?? "Select Project"}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                #{activeProjectId ?? "—"}
              </span>
            </span>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-muted-foreground transition-transform",
                projectOpen && "rotate-180 text-primary"
              )}
            />
          </button>

          {projectOpen && (
            <div className="absolute top-full right-0 mt-2 w-full md:w-72 max-h-80 overflow-y-auto p-1.5 rounded-xl border border-cyan-300/15 bg-[#0a0d16]/95 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] z-50 cg-pop">
              <div className="cg-label px-2.5 pt-1.5 pb-2 !text-[9.5px]">
                Switch project
              </div>
              {projects.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    selectProject(option.id);
                    setProjectOpen(false);
                    setSelectedFile(null);
                    setSelectedId(null);
                  }}
                  className={cn(
                    "relative w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-colors",
                    option.id === activeProjectId
                      ? "bg-primary/[0.07]"
                      : "hover:bg-white/[0.04]"
                  )}
                >
                  {option.id === activeProjectId && (
                    <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-primary" />
                  )}
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] text-white truncate font-medium">
                      {option.name}{" "}
                      <span className="font-mono text-[11px] text-muted-foreground font-normal">
                        (#{option.id})
                      </span>
                    </span>
                    <span className="block font-mono text-[10.5px] text-muted-foreground truncate">
                      {option.github_url ||
                        option.default_branch ||
                        "Local repository"}
                    </span>
                  </span>
                  {option.id === activeProjectId && (
                    <Check className="w-3.5 h-3.5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Main 3-Column AST Workspace ── */}
      {!activeProjectId ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8 rounded-2xl border border-white/[0.07] bg-[#070910]/85">
          <span className="w-12 h-12 rounded-2xl border border-white/[0.08] bg-white/[0.02] flex items-center justify-center">
            <Braces className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
          </span>
          <div>
            <p className="text-[15px] font-semibold text-white/60">
              No Project Selected
            </p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              Select a project from the header to start exploring its AST.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Mobile Navigation Tabs (< lg) */}
          <div className="flex lg:hidden border border-white/[0.06] rounded-lg mb-2 bg-[#080a12]/80 shrink-0 overflow-hidden">
            {(["explorer", "ast", "details"] as const).map((panel) => (
              <button
                key={panel}
                type="button"
                onClick={() => setMobilePanel(panel)}
                className={cn(
                  "flex-1 py-2 font-mono text-[11px] tracking-[0.08em] uppercase transition-colors text-center",
                  mobilePanel === panel
                    ? "bg-primary/[0.1] text-primary font-semibold"
                    : "text-muted-foreground hover:text-white"
                )}
              >
                {panel === "explorer"
                  ? "Explorer"
                  : panel === "ast"
                  ? "AST Structure"
                  : "Details"}
              </button>
            ))}
          </div>

          <div
            className="flex-1 min-h-0 rounded-2xl border border-white/[0.07] overflow-hidden bg-[#070910]/85 backdrop-blur-xl shadow-[0_40px_100px_-40px_rgba(0,0,0,0.95)] relative reveal"
            style={{ ["--d" as string]: "180ms" }}
          >
            <div className="absolute inset-x-0 top-0 h-px cg-hairline z-20" />

            <div className="grid h-full grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[18%_57%_25%] overflow-hidden">
              {/* ── LEFT PANEL: AST Explorer ── */}
              <aside
                className={cn(
                  "flex flex-col h-full border-b lg:border-b-0 lg:border-r border-white/[0.06] bg-gradient-to-b from-[#0b0e18]/95 to-[#080a12]/90 min-w-0 overflow-hidden",
                  "hidden lg:flex",
                  mobilePanel === "explorer" && "!flex w-full"
                )}
              >
                <div className="h-11 flex items-center gap-2 px-3 border-b border-white/[0.06] shrink-0">
                  <Code2 className="w-3.5 h-3.5 text-primary/80 shrink-0" />
                  <span className="cg-label !text-foreground/80 font-semibold">
                    Explorer
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground px-1.5 py-0.5 rounded border border-white/[0.08] ml-1">
                    {files.length} files
                  </span>
                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="ml-auto w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/[0.06] transition-all"
                    aria-label="Refresh files"
                  >
                    <RefreshCw
                      className={cn(
                        "w-3.5 h-3.5",
                        isLoadingWorkspace && "animate-spin text-primary"
                      )}
                    />
                  </button>
                </div>

                <div className="p-2.5 border-b border-white/[0.05] shrink-0">
                  <label className="flex items-center gap-2 h-8 px-2.5 rounded-md border border-white/[0.07] bg-black/10 focus-within:border-primary/30 focus-within:bg-primary/[0.025] transition-all">
                    <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <input
                      value={fileFilter}
                      onChange={(e) => setFileFilter(e.target.value)}
                      placeholder="Filter files..."
                      className="w-full min-w-0 bg-transparent outline-none font-mono text-[11.5px] text-white placeholder:text-muted-foreground/60"
                    />
                    {fileFilter && (
                      <button
                        type="button"
                        onClick={() => setFileFilter("")}
                        aria-label="Clear filter"
                      >
                        <X className="w-3 h-3 text-muted-foreground hover:text-white" />
                      </button>
                    )}
                  </label>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto py-2">
                  <div className="px-3 py-1.5 flex items-center gap-1.5 font-mono text-[10.5px] text-muted-foreground">
                    <ChevronDown className="w-3 h-3 shrink-0" />
                    <span className="truncate">
                      Active Project / {activeProject?.name ?? "Project"}
                    </span>
                  </div>

                  <ul
                    className={cn(
                      "transition-opacity space-y-0.5",
                      isLoadingWorkspace && "opacity-30"
                    )}
                  >
                    {filteredFiles.map((file) => {
                      const active = file.id === selectedFile?.id;
                      const name = file.path.split("/").pop() ?? file.path;
                      const isMd =
                        file.path.endsWith(".md") || file.path.endsWith(".mdx");
                      const Icon = isMd ? FileText : FileCode2;
                      return (
                        <li key={file.id}>
                          <button
                            type="button"
                            onClick={() => handleSelectFile(file)}
                            className={cn(
                              "group relative w-full flex items-center gap-2.5 h-8 pl-5 pr-3 text-left transition-colors",
                              active
                                ? "bg-gradient-to-r from-primary/[0.11] to-transparent text-white font-medium"
                                : "text-[#929fb2] hover:bg-white/[0.03] hover:text-white"
                            )}
                          >
                            <span
                              className={cn(
                                "absolute left-0 top-1 bottom-1 w-[2px] rounded-full bg-primary transition-opacity",
                                active
                                  ? "opacity-100 shadow-[0_0_8px_#00e5ff]"
                                  : "opacity-0"
                              )}
                            />
                            <Icon
                              className={cn(
                                "w-3.5 h-3.5 shrink-0",
                                active
                                  ? "text-primary"
                                  : isMd
                                  ? "text-violet-300/60"
                                  : "text-sky-300/55"
                              )}
                            />
                            <span className="font-mono text-[11.5px] truncate flex-1">
                              {name}
                            </span>
                            {active && (
                              <span className="ml-auto w-1 h-1 rounded-full bg-primary shadow-[0_0_5px_#00e5ff] shrink-0" />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </aside>

              {/* ── CENTER PANEL: AST Structure ── */}
              <div
                className={cn(
                  "relative flex flex-col h-full bg-[#05070c]/95 overflow-hidden min-w-0",
                  "hidden lg:flex",
                  mobilePanel === "ast" && "!flex w-full"
                )}
              >
                <div className="p-3 border-b border-white/[0.06] bg-[#080a12]/80 shrink-0">
                  <div className="flex items-center justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Braces className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="cg-label !text-foreground/80 font-semibold">
                        AST Structure
                      </span>
                      {selectedFileName && (
                        <span className="font-mono text-[10.5px] text-muted-foreground truncate">
                          / {selectedFileName}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[10.5px] text-muted-foreground whitespace-nowrap shrink-0">
                      {filteredEntities.length} element
                      {filteredEntities.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <label className="flex-1 flex items-center gap-2 h-9 px-3 rounded-lg border border-white/[0.08] bg-black/15 focus-within:border-primary/35 focus-within:shadow-[0_0_0_3px_rgba(0,229,255,0.05)] transition-all min-w-0">
                      <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <input
                        value={astQuery}
                        onChange={(e) => setAstQuery(e.target.value)}
                        placeholder="Search AST nodes, functions, classes, identifiers..."
                        className="w-full min-w-0 bg-transparent outline-none text-[12px] text-white placeholder:text-muted-foreground/60"
                      />
                      {astQuery && (
                        <button
                          type="button"
                          onClick={() => setAstQuery("")}
                          aria-label="Clear AST search"
                        >
                          <X className="w-3 h-3 text-muted-foreground hover:text-white" />
                        </button>
                      )}
                    </label>

                    <label className="flex items-center gap-2 h-9 px-3 rounded-lg border border-white/[0.08] bg-black/15 shrink-0">
                      <span className="cg-label !text-[8.5px]">Type</span>
                      <select
                        value={typeFilter}
                        onChange={(e) =>
                          setTypeFilter(e.target.value as "All Types" | AstType)
                        }
                        className="bg-[#090c13] outline-none font-mono text-[10.5px] text-foreground cursor-pointer pr-1"
                      >
                        <option value="All Types">All Types</option>
                        {TYPE_ORDER.map((type) => (
                          <option key={type} value={type}>
                            {TYPE_META[type].plural}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                {isLoadingAnalysis ? (
                  <div className="flex-1 flex items-center justify-center gap-2 font-mono text-xs text-muted-foreground">
                    <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                    Parsing source file…
                  </div>
                ) : analysisError ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
                    <p className="text-[13px] text-white/50">Unable to parse file</p>
                    <p className="font-mono text-[10px] text-rose-300 max-w-xs">
                      {analysisError}
                    </p>
                    <button
                      type="button"
                      onClick={() => void loadAnalysis()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] font-mono text-[10.5px] text-white/40 hover:text-white hover:border-white/20 transition-all"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Retry
                    </button>
                  </div>
                ) : !selectedFile ? (
                  <div className="relative flex-1 flex items-center justify-center overflow-hidden p-6">
                    <div className="absolute w-72 h-56 rounded-full bg-cyan-500/[0.06] blur-[70px]" />
                    <div className="relative text-center px-6">
                      <span className="mx-auto w-14 h-14 rounded-2xl border border-primary/20 bg-[#090d15] flex items-center justify-center shadow-[0_0_35px_-12px_rgba(0,229,255,0.5)]">
                        <Code2 className="w-6 h-6 text-primary" strokeWidth={1.5} />
                      </span>
                      <p className="mt-5 text-[16px] font-medium text-white">
                        Select a file from Explorer to inspect its AST
                      </p>
                      <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                        Structural elements will be categorized here.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4 space-y-6">
                    {sections.length > 0 ? (
                      sections.map((section, sectionIndex) => {
                        const meta = TYPE_META[section.type];
                        return (
                          <section key={section.type} className="space-y-2">
                            <div className="flex items-center gap-2.5 mb-2">
                              <span className="font-mono text-[9.5px] text-primary/65 font-bold">
                                {String(sectionIndex + 1).padStart(2, "0")}
                              </span>
                              <span className="cg-label !text-foreground/75 font-semibold">
                                {meta.plural}
                              </span>
                              <span className="flex-1 h-px bg-gradient-to-r from-white/[0.08] to-transparent" />
                              <span className="font-mono text-[9.5px] text-muted-foreground">
                                ({section.items.length})
                              </span>
                            </div>

                            <div className="space-y-1.5">
                              {section.items.map((item) => {
                                const Icon = TYPE_META[item.type].icon;
                                const active = item.id === selectedId;
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedId(item.id);
                                      setSourceOpen(false);
                                      setMobilePanel("details");
                                    }}
                                    className={cn(
                                      "ast-row group relative w-full grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border px-3 py-2.5 text-left overflow-hidden transition-all",
                                      active
                                        ? "border-primary/40 bg-gradient-to-r from-primary/[0.09] to-primary/[0.02] shadow-[0_0_18px_-12px_rgba(0,229,255,0.7)]"
                                        : "border-white/[0.065] bg-white/[0.018] hover:border-primary/25 hover:bg-white/[0.035]"
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-primary transition-opacity",
                                        active
                                          ? "opacity-100 shadow-[0_0_7px_#00e5ff]"
                                          : "opacity-0"
                                      )}
                                    />
                                    <span
                                      className={cn(
                                        "w-8 h-8 rounded-md border flex items-center justify-center transition-colors shrink-0",
                                        active
                                          ? "border-primary/25 bg-primary/[0.07]"
                                          : "border-white/[0.07] bg-black/15 group-hover:border-white/[0.12]"
                                      )}
                                    >
                                      <Icon className={cn("w-3.5 h-3.5", meta.tone)} />
                                    </span>
                                    <span className="min-w-0">
                                      <span className="flex items-center gap-2 min-w-0">
                                        <span
                                          className={cn(
                                            "font-mono text-[12px] truncate font-medium",
                                            active
                                              ? "text-white"
                                              : "text-foreground/90"
                                          )}
                                        >
                                          {item.name}
                                        </span>
                                        {item.children > 0 && (
                                          <span className="hidden sm:inline font-mono text-[9px] text-white/30 shrink-0">
                                            {item.children} child
                                            {item.children > 1 ? "ren" : ""}
                                          </span>
                                        )}
                                      </span>
                                      <span className="block mt-0.5 text-[10.5px] text-muted-foreground truncate">
                                        {item.description}
                                      </span>
                                    </span>
                                    <span className="text-right pl-2 shrink-0">
                                      <span
                                        className={cn(
                                          "block font-mono text-[8.5px] tracking-[0.12em] uppercase font-semibold",
                                          meta.tone
                                        )}
                                      >
                                        {item.type}
                                      </span>
                                      <span className="block mt-1 font-mono text-[9.5px] text-muted-foreground whitespace-nowrap">
                                        {item.line}
                                      </span>
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </section>
                        );
                      })
                    ) : (
                      <div className="h-64 flex items-center justify-center text-center px-5">
                        <div>
                          <Search
                            className="w-6 h-6 text-muted-foreground mx-auto"
                            strokeWidth={1.5}
                          />
                          <p className="mt-3 text-[14px] text-white font-medium">
                            No AST elements match
                          </p>
                          <p className="mt-1 font-mono text-[10.5px] text-muted-foreground">
                            Adjust your search or type filter.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── RIGHT PANEL: AST Details ── */}
              <aside
                className={cn(
                  "flex flex-col h-full border-t lg:border-t-0 lg:border-l border-white/[0.06] bg-gradient-to-b from-[#0a0d16]/95 to-[#070910]/95 min-w-0 overflow-hidden",
                  "hidden xl:flex",
                  mobilePanel === "details" && "!flex w-full"
                )}
              >
                <div className="h-11 flex items-center gap-2 px-4 border-b border-white/[0.06] shrink-0 sticky top-0 bg-[#0a0d16]/95 backdrop-blur z-10">
                  <Braces className="w-3.5 h-3.5 text-primary/80 shrink-0" />
                  <span className="cg-label !text-foreground/80 font-semibold">
                    AST Details
                  </span>
                  {selectedEntity && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_#00e5ff] shrink-0" />
                  )}
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto">
                  {selectedEntity ? (
                    <div key={selectedEntity.id} className="p-4 space-y-3 cg-pop">
                      {/* Top Summary Card */}
                      <div className="rounded-xl border border-primary/20 bg-primary/[0.035] p-3.5">
                        <div className="flex items-center gap-3">
                          <span className="w-9 h-9 rounded-lg border border-primary/25 bg-primary/[0.06] flex items-center justify-center shrink-0">
                            {React.createElement(TYPE_META[selectedEntity.type].icon, {
                              className: `w-4 h-4 ${TYPE_META[selectedEntity.type].tone}`,
                            })}
                          </span>
                          <div className="min-w-0">
                            <div className="font-mono text-[9.5px] tracking-[0.15em] text-primary uppercase font-semibold">
                              {selectedEntity.type}
                            </div>
                            <div className="mt-0.5 font-mono text-[13px] text-white truncate font-medium">
                              {selectedEntity.name}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/[0.06] font-mono text-[9.5px] text-muted-foreground truncate">
                          {selectedFileName} · {selectedEntity.line}
                        </div>
                      </div>

                      {/* Details DL List */}
                      <dl className="mt-2">
                        {[
                          ["TYPE", selectedEntity.type],
                          ["NAME", selectedEntity.name],
                          ["FILE", selectedFileName ?? "—"],
                          [
                            "LANGUAGE",
                            selectedFile?.language ??
                              (selectedFileName?.endsWith(".py")
                                ? "Python"
                                : selectedFileName?.endsWith(".ts") ||
                                  selectedFileName?.endsWith(".tsx")
                                ? "TypeScript"
                                : selectedFileName?.endsWith(".js")
                                ? "JavaScript"
                                : selectedFileName?.endsWith(".md")
                                ? "Markdown"
                                : "Code"),
                          ],
                          ["LINES", selectedEntity.line],
                          ["PARENT", selectedEntity.parent],
                          ["CHILDREN", String(selectedEntity.children)],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="grid grid-cols-[72px_1fr] gap-3 py-2 border-b border-white/[0.055] last:border-0"
                          >
                            <dt className="cg-label !text-[8.5px] pt-0.5">{label}</dt>
                            <dd className="font-mono text-[10.5px] text-foreground break-all leading-relaxed">
                              {value}
                            </dd>
                          </div>
                        ))}
                      </dl>

                      {/* Description */}
                      <div className="pt-2 border-t border-white/[0.06]">
                        <div className="cg-label !text-[8.5px] mb-1">
                          Description
                        </div>
                        <p className="text-[11.5px] leading-relaxed text-foreground/80">
                          {selectedEntity.description}
                        </p>
                      </div>

                      {/* Source Code Preview */}
                      {selectedEntity.source && (
                        <div className="mt-3 rounded-lg border border-white/[0.07] overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setSourceOpen((open) => !open)}
                            className="w-full h-8 px-3 flex items-center gap-2 bg-white/[0.02] hover:bg-white/[0.035] transition-colors"
                          >
                            <ChevronRight
                              className={cn(
                                "w-3 h-3 text-primary transition-transform shrink-0",
                                sourceOpen && "rotate-90"
                              )}
                            />
                            <span className="cg-label !text-[8.5px] !text-foreground/75 font-semibold">
                              Source Code Preview
                            </span>
                          </button>
                          {sourceOpen && (
                            <div className="border-t border-white/[0.06] bg-[#05070b] cg-pop overflow-x-auto max-h-48">
                              <div className="flex min-w-max font-mono text-[10.5px] leading-5 py-2">
                                <span className="w-8 px-2 text-right text-white/20 select-none border-r border-white/[0.05] shrink-0">
                                  1
                                </span>
                                <code className="px-3 text-[#c9d4e3] whitespace-pre">
                                  {selectedEntity.source}
                                </code>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Empty State */
                    <div className="h-full min-h-[260px] flex items-center justify-center text-center px-6 py-12">
                      <div>
                        <span className="mx-auto w-11 h-11 rounded-xl border border-white/[0.08] bg-white/[0.025] flex items-center justify-center">
                          <Braces
                            className="w-5 h-5 text-muted-foreground"
                            strokeWidth={1.5}
                          />
                        </span>
                        <p className="mt-4 text-[14px] font-medium text-white">
                          No AST element selected
                        </p>
                        <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground max-w-[200px] mx-auto">
                          Select an AST element to inspect its details.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AstPageSkeleton() {
  return (
    <div className="h-full w-full flex flex-col overflow-hidden px-3 md:px-5 lg:px-6 pt-2.5 md:pt-3 pb-3 md:pb-4 max-w-[1780px] mx-auto animate-pulse">
      <div className="h-14 w-1/3 rounded-lg bg-white/[0.03] mb-3" />
      <div className="flex-1 rounded-2xl border border-white/[0.06] bg-white/[0.02]" />
    </div>
  );
}

export default function AstPage() {
  return (
    <Suspense fallback={<AstPageSkeleton />}>
      <AstPageInner />
    </Suspense>
  );
}
