"use client";

import {
  Check,
  ChevronDown,
  ChevronRight,
  FileCode2,
  FileText,
  Folder,
  FolderOpen,
  Network,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { RelationshipDetails } from "@/components/analysis/RelationshipDetails";
import { RelationshipList } from "@/components/analysis/RelationshipList";
import { useActiveProject } from "@/hooks/useActiveProject";
import { cn } from "@/lib/cn";
import {
  getFileAnalysis,
  getFileContent,
  getRepositoryWorkspace,
} from "@/services/workspace";
import type {
  FileAnalysis,
  FileRelationship,
  RepositoryFile,
} from "@/types/workspace";

type TreeFolderNode = {
  type: "folder";
  name: string;
  path: string;
  children: (TreeFolderNode | TreeFileNode)[];
};

type TreeFileNode = {
  type: "file";
  name: string;
  path: string;
  file: RepositoryFile;
};

type TreeNodeItem = TreeFolderNode | TreeFileNode;

function buildFileTree(files: RepositoryFile[]): TreeNodeItem[] {
  const root: TreeFolderNode = { type: "folder", name: "", path: "", children: [] };
  const folderMap = new Map<string, TreeFolderNode>([["", root]]);

  for (const file of files) {
    const parts = file.path.split("/").filter(Boolean);
    let parent = root;
    let currentPath = "";

    for (const part of parts.slice(0, -1)) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      let folder = folderMap.get(currentPath);
      if (!folder) {
        folder = { type: "folder", name: part, path: currentPath, children: [] };
        folderMap.set(currentPath, folder);
        parent.children.push(folder);
      }
      parent = folder;
    }

    const fileName = parts.at(-1) || file.path;
    parent.children.push({ type: "file", name: fileName, path: file.path, file });
  }

  const sortItems = (items: TreeNodeItem[]) => {
    items.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const item of items) {
      if (item.type === "folder") {
        sortItems(item.children);
      }
    }
  };

  sortItems(root.children);
  return root.children;
}

function filterTreeNodes(
  nodes: TreeNodeItem[],
  query: string
): { filtered: TreeNodeItem[]; hasMatches: boolean } {
  if (!query) return { filtered: nodes, hasMatches: true };
  const q = query.toLowerCase();

  const result: TreeNodeItem[] = [];
  for (const node of nodes) {
    if (node.type === "file") {
      if (
        node.name.toLowerCase().includes(q) ||
        node.path.toLowerCase().includes(q) ||
        (node.file.language && node.file.language.toLowerCase().includes(q))
      ) {
        result.push(node);
      }
    } else {
      const childRes = filterTreeNodes(node.children, query);
      if (childRes.hasMatches) {
        result.push({
          ...node,
          children: childRes.filtered,
        });
      }
    }
  }

  return { filtered: result, hasMatches: result.length > 0 };
}

function RepositoryTreeNodes({
  nodes,
  depth,
  openFolders,
  toggleFolder,
  selectedFileId,
  onSelectFile,
  query,
}: {
  nodes: TreeNodeItem[];
  depth: number;
  openFolders: Set<string>;
  toggleFolder: (path: string) => void;
  selectedFileId: number | null;
  onSelectFile: (file: RepositoryFile) => void;
  query: string;
}) {
  return (
    <ul className="space-y-0.5">
      {nodes.map((node) => {
        if (node.type === "folder") {
          const isOpen = openFolders.has(node.path) || Boolean(query);
          return (
            <li key={node.path}>
              <button
                type="button"
                onClick={() => toggleFolder(node.path)}
                className="group w-full h-8 flex items-center gap-2 pr-3 text-left text-[#9aa6b8] hover:text-white hover:bg-white/[0.025] transition-colors"
                style={{ paddingLeft: `${10 + depth * 14}px` }}
              >
                <ChevronRight
                  className={cn(
                    "w-3 h-3 text-white/30 transition-transform shrink-0",
                    isOpen && "rotate-90 text-white/70"
                  )}
                />
                {isOpen ? (
                  <FolderOpen className="w-3.5 h-3.5 text-violet-300/75 shrink-0" />
                ) : (
                  <Folder className="w-3.5 h-3.5 text-violet-300/60 shrink-0 group-hover:text-violet-300" />
                )}
                <span className="font-mono text-[12px] 2xl:text-[13px] truncate font-medium">
                  {node.name}
                </span>
              </button>
              {isOpen && (
                <RepositoryTreeNodes
                  nodes={node.children}
                  depth={depth + 1}
                  openFolders={openFolders}
                  toggleFolder={toggleFolder}
                  selectedFileId={selectedFileId}
                  onSelectFile={onSelectFile}
                  query={query}
                />
              )}
            </li>
          );
        }

        const isSelected = selectedFileId === node.file.id;
        const isMd = node.name.endsWith(".md") || node.name.endsWith(".txt");
        const Icon = isMd ? FileText : FileCode2;

        return (
          <li key={node.path}>
            <button
              type="button"
              onClick={() => onSelectFile(node.file)}
              className={cn(
                "group relative w-full flex items-center gap-2 h-8 pr-3 text-left transition-colors",
                isSelected
                  ? "bg-gradient-to-r from-primary/[0.11] to-transparent text-white font-medium"
                  : "text-[#929fb2] hover:text-white hover:bg-white/[0.025]"
              )}
              style={{ paddingLeft: `${24 + depth * 14}px` }}
              title={node.path}
            >
              <span
                className={cn(
                  "absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-primary transition-opacity",
                  isSelected ? "opacity-100 shadow-[0_0_8px_#00e5ff]" : "opacity-0"
                )}
              />
              <Icon
                className={cn(
                  "w-3.5 h-3.5 shrink-0",
                  isSelected
                    ? "text-primary"
                    : isMd
                    ? "text-violet-300/60"
                    : "text-sky-300/55 group-hover:text-sky-300"
                )}
              />
              <span className="font-mono text-[12px] 2xl:text-[13px] truncate">
                {node.name}
              </span>
              {isSelected && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_5px_#00e5ff] shrink-0" />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function RelationshipsPageInner() {
  const searchParams = useSearchParams();
  const initialFileParam = searchParams.get("file");

  const {
    projects,
    activeProjectId,
    isLoadingProjects,
    errorLoadingProjects,
    selectProject,
  } = useActiveProject();

  const [files, setFiles] = useState<RepositoryFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<RepositoryFile | null>(null);
  const [analysis, setAnalysis] = useState<FileAnalysis | null>(null);
  const [sourceText, setSourceText] = useState<string | null>(null);
  const [selectedRelationship, setSelectedRelationship] =
    useState<FileRelationship | null>(null);

  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Filters & State
  const [fileFilter, setFileFilter] = useState("");
  const [query, setQuery] = useState("");
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Active Project Context dropdown
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const projectRef = useRef<HTMLDivElement>(null);

  // Mobile panel tab state (< lg)
  const [mobileTab, setMobileTab] = useState<"explorer" | "relationships" | "details">(
    "relationships"
  );

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? projects[0],
    [projects, activeProjectId]
  );

  // Close project dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (projectRef.current && !projectRef.current.contains(event.target as Node)) {
        setProjectDropdownOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Load repository workspace files
  const loadWorkspace = useCallback(async () => {
    if (!activeProjectId) return;
    setIsLoadingWorkspace(true);
    setWorkspaceError(null);
    setSelectedFile(null);
    setAnalysis(null);
    setSourceText(null);
    setSelectedRelationship(null);

    try {
      const response = await getRepositoryWorkspace(activeProjectId);
      const loadedFiles = response.files || [];
      setFiles(loadedFiles);

      // Collect all folder paths to auto-expand tree initially
      const folders = new Set<string>();
      for (const f of loadedFiles) {
        const parts = f.path.split("/").filter(Boolean);
        let cur = "";
        for (const p of parts.slice(0, -1)) {
          cur = cur ? `${cur}/${p}` : p;
          folders.add(cur);
        }
      }
      setOpenFolders(folders);

      // Select file if provided in URL parameter
      if (initialFileParam && loadedFiles.length > 0) {
        const matched = loadedFiles.find(
          (f) =>
            f.path === initialFileParam ||
            f.path.endsWith(`/${initialFileParam}`) ||
            f.path.split("/").pop() === initialFileParam
        );
        if (matched) {
          setSelectedFile(matched);
        }
      }
    } catch (error) {
      setWorkspaceError(
        error instanceof Error
          ? error.message
          : "Could not load the repository workspace."
      );
    } finally {
      setIsLoadingWorkspace(false);
    }
  }, [activeProjectId, initialFileParam]);

  useEffect(() => {
    if (activeProjectId) {
      void loadWorkspace();
    }
  }, [activeProjectId, loadWorkspace, refreshTrigger]);

  // Load relationships analysis & source text when a file is selected
  const loadAnalysis = useCallback(async () => {
    if (!activeProjectId || !selectedFile) return;
    setIsLoadingAnalysis(true);
    setAnalysisError(null);
    setSelectedRelationship(null);

    try {
      const [analysisData, fileContent] = await Promise.all([
        getFileAnalysis(selectedFile.id),
        getFileContent(activeProjectId, selectedFile.id).catch(() => null),
      ]);

      setAnalysis(analysisData);
      setSourceText(fileContent ? fileContent.content : null);

      // Auto-select first relationship if available
      if (analysisData.relationships && analysisData.relationships.length > 0) {
        setSelectedRelationship(analysisData.relationships[0]);
      } else {
        setSelectedRelationship(null);
      }
    } catch (error) {
      setAnalysisError(
        error instanceof Error
          ? error.message
          : "Could not load relationships for this file."
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

  // Folder toggling
  const toggleFolder = useCallback((folderPath: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  }, []);

  // Build and filter file tree
  const fileTree = useMemo(() => buildFileTree(files), [files]);
  const filteredTree = useMemo(() => {
    return filterTreeNodes(fileTree, fileFilter).filtered;
  }, [fileTree, fileFilter]);

  // Filtered relationships in center area
  const filteredRelationships = useMemo(() => {
    if (!analysis?.relationships) return [];
    const q = query.trim().toLowerCase();
    if (!q) return analysis.relationships;
    return analysis.relationships.filter(
      (rel) =>
        rel.source.toLowerCase().includes(q) ||
        rel.target.toLowerCase().includes(q) ||
        rel.relationship.toLowerCase().includes(q)
    );
  }, [analysis?.relationships, query]);

  // Summary counts across selected file
  const counts = useMemo(() => {
    if (!analysis?.relationships) {
      return { imports: 0, calls: 0, others: 0, total: 0 };
    }
    const imports = analysis.relationships.filter(
      (r) => r.relationship === "IMPORTS"
    ).length;
    const calls = analysis.relationships.filter(
      (r) => r.relationship === "CALLS"
    ).length;
    const total = analysis.relationships.length;
    const others = total - imports - calls;
    return { imports, calls, others, total };
  }, [analysis?.relationships]);

  const handleSelectFile = useCallback((file: RepositoryFile) => {
    setSelectedFile(file);
    setSelectedRelationship(null);
    setQuery("");
    setMobileTab("relationships");
  }, []);

  const handleSelectRelationship = useCallback((rel: FileRelationship) => {
    setSelectedRelationship(rel);
    setMobileTab("details");
  }, []);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden select-none px-3 md:px-5 lg:px-6 pt-2.5 md:pt-3 pb-3 md:pb-4 max-w-[1780px] mx-auto">
      {/* ── Page Header matching Figma Redesign ── */}
      <header className="relative z-40 shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-3 pb-2.5 border-b border-white/[0.06] mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_#00e5ff]" />
            <span className="cg-label">CodeGraph AI / Code Analysis</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
            Relationships
          </h1>
          <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <p className="text-muted-foreground text-[12.5px] sm:text-[13px] md:text-[13.5px]">
              Understand dependencies and connections across your codebase.
            </p>
            {selectedFile && counts.total > 0 && (
              <>
                <span className="hidden sm:block w-px h-3 bg-white/10" />
                <span className="font-mono text-[10.5px] tracking-[0.08em] text-muted-foreground">
                  <strong className="text-violet-300 font-medium">
                    {counts.imports} IMPORTS
                  </strong>
                  <span className="mx-2 text-white/20">·</span>
                  <strong className="text-primary font-medium">
                    {counts.calls} CALLS
                  </strong>
                  {counts.others > 0 && (
                    <>
                      <span className="mx-2 text-white/20">·</span>
                      <strong className="text-sky-300 font-medium">
                        {counts.others} OTHER
                      </strong>
                    </>
                  )}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Active Project Context Selector */}
        <div className="relative shrink-0 z-50" ref={projectRef}>
          <div className="cg-label mb-1.5">Active Project Context</div>
          <button
            type="button"
            onClick={() => setProjectDropdownOpen((open) => !open)}
            className={cn(
              "flex items-center gap-3 justify-between w-full md:w-64 h-9.5 pl-3 pr-2.5 rounded-lg border bg-white/[0.02] transition-all text-[13px]",
              projectDropdownOpen
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
                projectDropdownOpen && "rotate-180 text-primary"
              )}
            />
          </button>

          {projectDropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-full md:w-72 max-h-80 overflow-y-auto p-1.5 rounded-xl border border-cyan-300/20 bg-[#0a0d16] backdrop-blur-2xl shadow-[0_20px_60px_-10px_rgba(0,0,0,0.95)] z-[100] cg-pop">
              <div className="cg-label px-2.5 pt-1.5 pb-2 !text-[9.5px]">
                Switch project
              </div>
              {projects.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    selectProject(option.id);
                    setProjectDropdownOpen(false);
                    setSelectedFile(null);
                    setSelectedRelationship(null);
                  }}
                  className={cn(
                    "relative w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-colors",
                    option.id === activeProjectId
                      ? "bg-primary/[0.08]"
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
                    {option.github_url && (
                      <span className="block font-mono text-[10.5px] text-muted-foreground truncate">
                        {option.github_url}
                      </span>
                    )}
                  </span>
                  {option.id === activeProjectId && (
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ── Main Workspace Card ── */}
      {isLoadingProjects ? (
        <div className="flex flex-1 items-center justify-center gap-2.5 text-muted-foreground font-mono text-xs">
          <RefreshCw className="w-4 h-4 animate-spin text-primary" />
          <span>Loading project context…</span>
        </div>
      ) : errorLoadingProjects ? (
        <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/[0.05] p-6 text-center">
          <p className="font-medium text-white">Failed to load projects</p>
          <p className="mt-1 text-xs text-rose-300 font-mono">
            {errorLoadingProjects}
          </p>
        </div>
      ) : !activeProjectId ? (
        <div className="flex-1 flex items-center justify-center p-8 text-center font-mono">
          <div className="max-w-md p-6 rounded-2xl border border-white/[0.08] bg-[#080b12]/90">
            <p className="text-base font-semibold text-white">No Project Selected</p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Select an active project from the dropdown above to browse its relationships.
            </p>
          </div>
        </div>
      ) : (
        <div
          className="relative z-10 flex-1 min-h-0 w-full rounded-xl md:rounded-2xl border border-white/[0.07] overflow-hidden bg-[#070910]/85 backdrop-blur-xl shadow-[0_30px_90px_-30px_rgba(0,0,0,0.9)] flex flex-col reveal"
          style={{ ["--d" as string]: "120ms" }}
        >
          {/* Subtle Top Hairline Highlight */}
          <div className="absolute inset-x-0 top-0 h-px cg-hairline z-20 pointer-events-none" />

          {/* Mobile/Tablet View Switcher (< lg) */}
          <div className="flex lg:hidden border-b border-white/[0.06] bg-[#080a12]/90 shrink-0">
            <button
              type="button"
              onClick={() => setMobileTab("explorer")}
              className={cn(
                "flex-1 py-2 font-mono text-[11px] uppercase tracking-wider text-center transition-colors",
                mobileTab === "explorer"
                  ? "text-primary border-b-2 border-primary font-semibold"
                  : "text-muted-foreground hover:text-white"
              )}
            >
              Explorer ({files.length})
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("relationships")}
              className={cn(
                "flex-1 py-2 font-mono text-[11px] uppercase tracking-wider text-center transition-colors",
                mobileTab === "relationships"
                  ? "text-primary border-b-2 border-primary font-semibold"
                  : "text-muted-foreground hover:text-white"
              )}
            >
              Relationships {selectedFile ? `(${counts.total})` : ""}
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("details")}
              className={cn(
                "flex-1 py-2 font-mono text-[11px] uppercase tracking-wider text-center transition-colors",
                mobileTab === "details"
                  ? "text-primary border-b-2 border-primary font-semibold"
                  : "text-muted-foreground hover:text-white"
              )}
            >
              Details
            </button>
          </div>

          {/* 3-Column Side-by-Side IDE Workspace (lg and up) */}
          <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_340px] xl:grid-cols-[290px_minmax(0,1fr)_360px] 2xl:grid-cols-[310px_minmax(0,1fr)_380px]">
            {/* ── LEFT COLUMN: File Explorer ── */}
            <aside
              className={cn(
                "h-full min-h-0 flex flex-col border-b lg:border-b-0 lg:border-r border-white/[0.06] bg-gradient-to-b from-[#0b0e18]/95 to-[#080a12]/90 overflow-hidden",
                "hidden lg:flex",
                mobileTab === "explorer" && "!flex w-full"
              )}
            >
              {/* Explorer Header */}
              <div className="h-11 flex items-center gap-2 px-3.5 border-b border-white/[0.06] shrink-0">
                <Folder className="w-3.5 h-3.5 text-primary/80" />
                <span className="cg-label !text-foreground/80">Explorer</span>
                <span className="font-mono text-[10px] text-muted-foreground px-1.5 py-0.5 rounded border border-white/[0.08]">
                  {files.length} files
                </span>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="ml-auto w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/[0.06] transition-all"
                  aria-label="Refresh files"
                  title="Refresh files"
                >
                  <RefreshCw
                    className={cn(
                      "w-3.5 h-3.5",
                      isLoadingWorkspace && "animate-spin text-primary"
                    )}
                  />
                </button>
              </div>

              {/* Filter Files Input */}
              <div className="p-2.5 border-b border-white/[0.05] shrink-0">
                <label className="flex items-center gap-2 h-8.5 px-2.5 rounded-lg border border-white/[0.07] bg-black/15 focus-within:border-primary/30 focus-within:bg-primary/[0.025] transition-all">
                  <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <input
                    value={fileFilter}
                    onChange={(e) => setFileFilter(e.target.value)}
                    placeholder="Filter files..."
                    className="w-full min-w-0 bg-transparent outline-none text-[12px] text-white placeholder:text-muted-foreground/60 font-mono"
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

              {/* Active Project Breadcrumb */}
              <div className="px-3.5 py-2 border-b border-white/[0.04] flex items-center gap-1.5 font-mono text-[10.5px] text-muted-foreground shrink-0">
                <ChevronDown className="w-3 h-3 shrink-0" />
                <span className="truncate">
                  Active Project / {activeProject?.name || "Repository"}
                </span>
              </div>

              {/* Files Tree List - Independently Scrollable */}
              <div className="flex-1 min-h-0 overflow-y-auto py-1.5">
                {isLoadingWorkspace ? (
                  <div className="space-y-1.5 px-3 py-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        className="h-7 rounded-md bg-white/[0.02] animate-pulse"
                      />
                    ))}
                  </div>
                ) : filteredTree.length > 0 ? (
                  <RepositoryTreeNodes
                    nodes={filteredTree}
                    depth={0}
                    openFolders={openFolders}
                    toggleFolder={toggleFolder}
                    selectedFileId={selectedFile?.id ?? null}
                    onSelectFile={handleSelectFile}
                    query={fileFilter}
                  />
                ) : (
                  <div className="p-4 text-center font-mono text-xs text-muted-foreground">
                    No matching files.
                  </div>
                )}
              </div>
            </aside>

            {/* ── CENTER COLUMN: Relationships Workspace ── */}
            <div
              className={cn(
                "h-full min-h-0 flex flex-col bg-[#05070c]/95 overflow-hidden",
                "hidden lg:flex",
                mobileTab === "relationships" && "!flex w-full"
              )}
            >
              {workspaceError ? (
                <div className="flex flex-1 items-center justify-center p-6 text-center font-mono text-xs text-rose-300">
                  <p>{workspaceError}</p>
                </div>
              ) : !selectedFile ? (
                /* Empty state: No file chosen */
                <div className="flex-1 flex items-center justify-center text-center p-6 sm:p-8 ast-results">
                  <div className="max-w-md">
                    <span className="mx-auto w-14 h-14 rounded-2xl border border-primary/20 bg-[#090d15] flex items-center justify-center shadow-[0_0_35px_-12px_rgba(0,229,255,0.5)]">
                      <Network className="w-6 h-6 text-primary" strokeWidth={1.5} />
                    </span>
                    <p className="mt-5 text-[16px] font-medium text-white">
                      Select a file to view relationships
                    </p>
                    <p className="mt-1.5 text-[12.5px] text-muted-foreground leading-relaxed">
                      Choose a file from the explorer to see its IMPORTS and CALLS
                      connections.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Selected File Context Bar & Search Toolbar */}
                  <div className="p-3 md:p-3.5 border-b border-white/[0.06] bg-[#080a12]/80 shrink-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <Network className="w-4 h-4 text-primary shrink-0" />
                        <span className="cg-label !text-foreground/80">
                          Relationships
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground truncate">
                          / {selectedFile.path}
                        </span>
                      </div>

                      {/* Summary stats badge matching Figma */}
                      {counts.total > 0 && (
                        <div className="flex flex-wrap items-center gap-x-2 font-mono text-[10.5px] text-muted-foreground shrink-0">
                          <strong className="text-violet-300 font-medium">
                            {counts.imports} IMPORTS
                          </strong>
                          <span className="text-white/20">·</span>
                          <strong className="text-primary font-medium">
                            {counts.calls} CALLS
                          </strong>
                          {counts.others > 0 && (
                            <>
                              <span className="text-white/20">·</span>
                              <strong className="text-sky-300 font-medium">
                                {counts.others} OTHER
                              </strong>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Search Relationships Input */}
                    <label className="flex items-center gap-2 h-8.5 px-3 rounded-lg border border-white/[0.08] bg-black/20 focus-within:border-primary/35 focus-within:shadow-[0_0_0_2px_rgba(0,229,255,0.05)] transition-all">
                      <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={`Search relationships in ${
                          selectedFile.path.split("/").pop() || "file"
                        }...`}
                        className="w-full min-w-0 bg-transparent outline-none text-[12px] text-white placeholder:text-muted-foreground/60 font-mono"
                      />
                      {query && (
                        <button
                          type="button"
                          onClick={() => setQuery("")}
                          aria-label="Clear relationship search"
                        >
                          <X className="w-3.5 h-3.5 text-muted-foreground hover:text-white" />
                        </button>
                      )}
                    </label>
                  </div>

                  {/* Relationships List Area - Independently Scrollable */}
                  <div className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4 ast-results">
                    {isLoadingAnalysis ? (
                      <div className="space-y-2.5 p-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className="h-12 rounded-lg border border-white/[0.05] bg-white/[0.02] animate-pulse flex items-center justify-between px-4"
                          >
                            <div className="h-4 w-32 bg-white/[0.05] rounded" />
                            <div className="h-5 w-16 bg-white/[0.05] rounded" />
                            <div className="h-4 w-28 bg-white/[0.05] rounded" />
                          </div>
                        ))}
                      </div>
                    ) : analysisError ? (
                      <div className="flex flex-col items-center justify-center p-6 text-center font-mono text-xs">
                        <p className="text-white font-medium">
                          Unable to load relationships
                        </p>
                        <p className="mt-1 text-rose-300 max-w-md">
                          {analysisError}
                        </p>
                        <button
                          type="button"
                          onClick={() => void loadAnalysis()}
                          className="mt-4 graph-action"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Try Again
                        </button>
                      </div>
                    ) : analysis && analysis.relationships.length === 0 ? (
                      /* Empty state: File has no detected relationships */
                      <div className="flex-1 min-h-64 flex items-center justify-center text-center px-6">
                        <div className="max-w-md">
                          <span className="mx-auto w-12 h-12 rounded-xl border border-white/[0.08] bg-white/[0.025] flex items-center justify-center">
                            <Network
                              className="w-5 h-5 text-muted-foreground"
                              strokeWidth={1.5}
                            />
                          </span>
                          <p className="mt-4 text-[15px] font-medium text-white">
                            No relationships found
                          </p>
                          <p className="mt-1.5 text-[12px] text-muted-foreground leading-relaxed">
                            This file does not currently have indexed import or call
                            relationships.
                          </p>
                        </div>
                      </div>
                    ) : filteredRelationships.length === 0 ? (
                      /* Empty state: Filter search query matched nothing */
                      <div className="h-full min-h-64 flex items-center justify-center text-center px-6">
                        <div>
                          <Search className="w-6 h-6 mx-auto text-muted-foreground" />
                          <p className="mt-3 text-[14px] text-white font-medium">
                            No relationships match
                          </p>
                          <p className="mt-1 text-[12px] text-muted-foreground">
                            Try another source, target, or relationship type.
                          </p>
                          <button
                            type="button"
                            onClick={() => setQuery("")}
                            className="mt-3 text-xs text-primary underline"
                          >
                            Clear search
                          </button>
                        </div>
                      </div>
                    ) : (
                      <RelationshipList
                        relationships={filteredRelationships}
                        selectedRelationship={selectedRelationship}
                        onSelectRelationship={handleSelectRelationship}
                      />
                    )}
                  </div>
                </>
              )}
            </div>

            {/* ── RIGHT COLUMN: Relationship Details Inspector ── */}
            <div
              className={cn(
                "h-full min-h-0 flex flex-col border-t lg:border-t-0 lg:border-l border-white/[0.06] overflow-hidden",
                "hidden lg:flex",
                mobileTab === "details" && "!flex w-full"
              )}
            >
              <RelationshipDetails
                relationship={selectedRelationship}
                analysis={analysis}
                sourceText={sourceText}
                projectId={activeProjectId}
                fileId={selectedFile?.id}
                filePath={selectedFile?.path}
                className="h-full min-h-0 w-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RelationshipsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center gap-2 font-mono text-xs text-muted-foreground">
          <RefreshCw className="w-4 h-4 animate-spin text-primary" />
          <span>Loading relationships workspace…</span>
        </div>
      }
    >
      <RelationshipsPageInner />
    </Suspense>
  );
}
