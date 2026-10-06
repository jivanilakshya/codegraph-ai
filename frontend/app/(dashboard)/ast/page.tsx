"use client";

import {
  Braces,
  Check,
  ChevronDown,
  Code2,
  FolderTree,
  RefreshCw,
  Search,
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

import { ASTDetails } from "@/components/analysis/ASTDetails";
import {
  ASTHierarchy,
  buildHierarchyTree,
  computeStats,
  type HierarchyNode,
} from "@/components/analysis/ASTHierarchy";
import { useActiveProject } from "@/hooks/useActiveProject";
import { getFileAnalysis, getFileContent, getRepositoryWorkspace } from "@/services/workspace";
import type { FileAnalysis, RepositoryFile } from "@/types/workspace";

// ─── Utility ──────────────────────────────────────────────────────────────────
function cn(...c: (string | boolean | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

// ─── Mini file explorer ───────────────────────────────────────────────────────
type ExplorerProps = {
  files: RepositoryFile[];
  selectedFileId: number | null;
  isLoading: boolean;
  projectName: string;
  onSelectFile: (f: RepositoryFile) => void;
  onRefresh: () => void;
};

function Explorer({
  files,
  selectedFileId,
  isLoading,
  projectName,
  onSelectFile,
  onRefresh,
}: ExplorerProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return files;
    const q = query.toLowerCase();
    return files.filter((f) => f.path.toLowerCase().includes(q));
  }, [files, query]);

  function fileIcon(path: string) {
    if (path.endsWith(".md") || path.endsWith(".mdx")) return "text-violet-300/60";
    if (path.endsWith(".py")) return "text-sky-300/65";
    if (path.endsWith(".ts") || path.endsWith(".tsx")) return "text-blue-300/65";
    if (path.endsWith(".js") || path.endsWith(".jsx")) return "text-yellow-300/65";
    if (path.endsWith(".rs")) return "text-orange-300/65";
    if (path.endsWith(".go")) return "text-teal-300/65";
    return "text-slate-400/65";
  }

  return (
    <aside className="flex flex-col h-full border-r border-white/[0.06] bg-gradient-to-b from-[#0b0e18]/95 to-[#080a12]/90 min-w-0">
      {/* Header */}
      <div className="h-11 flex items-center gap-2 px-3.5 border-b border-white/[0.06] shrink-0">
        <FolderTree className="w-4 h-4 text-[#00e5ff]/80 shrink-0" />
        <span className="font-mono text-[12px] tracking-[0.12em] uppercase text-white/50 flex-1 font-semibold">
          Explorer
        </span>
        <span className="font-mono text-[11.5px] text-white/40 px-2 py-0.5 rounded border border-white/[0.08] bg-white/[0.02]">
          {files.length}
        </span>
        <button
          type="button"
          onClick={onRefresh}
          aria-label="Refresh"
          className="w-6.5 h-6.5 flex items-center justify-center rounded text-white/30 hover:text-[#00e5ff] hover:bg-[#00e5ff]/[0.06] transition-all"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin text-[#00e5ff]")} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2.5 border-b border-white/[0.05] shrink-0">
        <label className="flex items-center gap-2 h-8 px-2.5 rounded-lg border border-white/[0.08] bg-black/20 focus-within:border-[#00e5ff]/40 focus-within:shadow-[0_0_0_2px_rgba(0,229,255,0.06)] transition-all">
          <Search className="w-3.5 h-3.5 text-white/35 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter files…"
            className="w-full bg-transparent outline-none font-mono text-[13.5px] text-white placeholder:text-white/30"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")}>
              <X className="w-3 h-3 text-white/40 hover:text-white" />
            </button>
          )}
        </label>
      </div>

      {/* Project label */}
      <div className="flex items-center gap-1.5 px-3.5 py-2 shrink-0">
        <ChevronDown className="w-3.5 h-3.5 text-white/30 shrink-0" />
        <span className="font-mono text-[12px] font-medium text-white/35 truncate">{projectName}</span>
      </div>

      {/* File list */}
      <div className={cn("flex-1 min-h-0 overflow-y-auto py-1", isLoading && "opacity-40")}>
        {isLoading ? (
          <div className="space-y-1.5 px-3 py-1">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="h-8 animate-pulse rounded-md bg-white/[0.03]" style={{ width: `${60 + (i % 4) * 10}%` }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-3.5 py-4 font-mono text-[12px] text-white/30 italic">No files match filter.</p>
        ) : (
          filtered.map((file) => {
            const name = file.path.split("/").pop() ?? file.path;
            const active = file.id === selectedFileId;
            return (
              <button
                key={file.id}
                type="button"
                onClick={() => onSelectFile(file)}
                className={cn(
                  "group relative w-full flex items-center gap-2.5 h-9.5 pl-6 pr-3 text-left transition-all",
                  active
                    ? "bg-gradient-to-r from-[#00e5ff]/[0.12] via-[#00e5ff]/[0.04] to-transparent text-white font-medium shadow-[inset_0_0_12px_rgba(0,229,255,0.04)]"
                    : "text-slate-300/85 hover:bg-white/[0.04] hover:text-white"
                )}
              >
                <span
                  className={cn(
                    "absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-[#00e5ff] transition-opacity",
                    active ? "opacity-100 shadow-[0_0_8px_#00e5ff]" : "opacity-0"
                  )}
                />
                <Code2
                  className={cn(
                    "w-4 h-4 shrink-0 transition-colors",
                    active ? "text-[#00e5ff]" : fileIcon(file.path)
                  )}
                />
                <span className="font-mono text-[14.5px] truncate tracking-tight">{name}</span>
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00e5ff] shadow-[0_0_6px_#00e5ff] shrink-0" />
                )}
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}

// ─── Stat badge ───────────────────────────────────────────────────────────────
function StatBadge({ label, count }: { label: string; count: number }) {
  return (
    <span className="flex items-center gap-1 font-mono text-[9.5px] text-white/30">
      <span className="text-white/50">{count}</span>
      <span>{label}</span>
    </span>
  );
}

// ─── Main page inner ──────────────────────────────────────────────────────────
function AstPageInner() {
  const { projects, activeProjectId, isLoadingProjects, errorLoadingProjects, selectProject } =
    useActiveProject();

  const [files, setFiles] = useState<RepositoryFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<RepositoryFile | null>(null);
  // analysis and sourceText are used inside loadAnalysis to build the hierarchy tree
  const [_analysis, setAnalysis] = useState<FileAnalysis | null>(null);
  const [_sourceText, setSourceText] = useState<string | null>(null);

  // Hierarchical AST
  const [astRoot, setAstRoot] = useState<HierarchyNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<HierarchyNode | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [analysisRefresh, setAnalysisRefresh] = useState(0);
  const [projectOpen, setProjectOpen] = useState(false);
  // mobile: which panel is visible
  const [mobilePanel, setMobilePanel] = useState<"explorer" | "ast" | "details">("explorer");

  const projectRef = useRef<HTMLDivElement>(null);
  const currentProject = projects.find((p) => p.id === activeProjectId);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (projectRef.current && !projectRef.current.contains(e.target as Node))
        setProjectOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, []);

  // Load workspace files
  const loadWorkspace = useCallback(async () => {
    if (!activeProjectId) return;
    setIsLoadingWorkspace(true);
    setWorkspaceError(null);
    setSelectedFile(null);
    setAnalysis(null);
    setSourceText(null);
    setAstRoot(null);
    setSelectedNode(null);
    try {
      const r = await getRepositoryWorkspace(activeProjectId);
      setFiles(r.files);
    } catch (err) {
      setWorkspaceError(err instanceof Error ? err.message : "Failed to load workspace.");
    } finally {
      setIsLoadingWorkspace(false);
    }
  }, [activeProjectId]);

  useEffect(() => {
    if (activeProjectId) void loadWorkspace();
  }, [activeProjectId, loadWorkspace, refreshTrigger]);

  // Load file analysis
  const loadAnalysis = useCallback(async () => {
    if (!activeProjectId || !selectedFile) return;
    setIsLoadingAnalysis(true);
    setAnalysisError(null);
    setSelectedNode(null);
    setSearchTerm("");
    void analysisRefresh;
    try {
      const [analysisData, fileContent] = await Promise.all([
        getFileAnalysis(selectedFile.id),
        getFileContent(activeProjectId, selectedFile.id).catch(() => null),
      ]);
      setAnalysis(analysisData);
      const text = fileContent?.content ?? null;
      setSourceText(text);
      const fileName = selectedFile.path.split("/").pop();
      const tree = buildHierarchyTree(analysisData.ast, text, fileName);
      setAstRoot(tree);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Failed to parse AST.");
    } finally {
      setIsLoadingAnalysis(false);
    }
  }, [activeProjectId, selectedFile, analysisRefresh]);

  useEffect(() => {
    if (selectedFile) {
      void loadAnalysis();
      setMobilePanel("ast");
    }
  }, [selectedFile, loadAnalysis]);

  const stats = useMemo(() => {
    if (!astRoot) return null;
    return computeStats(astRoot);
  }, [astRoot]);

  const handleSelectNode = useCallback((node: HierarchyNode) => {
    setSelectedNode(node);
    setMobilePanel("details");
  }, []);

  // ─── Empty / error states ───────────────────────────────────────────────────

  if (isLoadingProjects) {
    return (
      <div className="flex h-full items-center justify-center gap-3 font-mono text-xs text-white/30">
        <RefreshCw className="w-4 h-4 animate-spin text-[#00e5ff]" />
        Loading project…
      </div>
    );
  }

  if (errorLoadingProjects) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="font-mono text-xs text-rose-300">{errorLoadingProjects}</p>
      </div>
    );
  }

  // ─── Layout ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Top header bar ─────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center justify-between gap-4 h-12 px-4 border-b border-white/[0.06] bg-[#070910]/90 backdrop-blur-sm">
        {/* Title breadcrumb */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] shadow-[0_0_6px_#00e5ff] shrink-0" />
          <span className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-white/30 hidden sm:block">
            CodeGraph AI
          </span>
          <span className="text-white/15 hidden sm:block">/</span>
          <span className="font-sans text-[14px] font-semibold text-white truncate">
            Abstract Syntax Tree
          </span>
          {selectedFile && (
            <>
              <span className="text-white/15">/</span>
              <span className="font-mono text-[11px] text-[#00e5ff]/70 truncate max-w-[200px]">
                {selectedFile.path.split("/").pop()}
              </span>
            </>
          )}
        </div>

        {/* Project selector */}
        {!activeProjectId ? (
          <div className="font-mono text-[11px] text-white/30">No project selected</div>
        ) : (
          <div className="relative shrink-0" ref={projectRef}>
            <button
              type="button"
              onClick={() => setProjectOpen((o) => !o)}
              className={cn(
                "flex items-center gap-2 h-8 pl-3 pr-2.5 rounded-lg border text-[12px] transition-all",
                projectOpen
                  ? "border-[#00e5ff]/40 bg-[#00e5ff]/[0.04] shadow-[0_0_0_3px_rgba(0,229,255,0.05)]"
                  : "border-white/[0.08] bg-white/[0.02] hover:border-white/20"
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] shadow-[0_0_5px_#00e5ff]" />
              <span className="font-medium text-white text-[12px] truncate max-w-[130px]">
                {currentProject?.name ?? "—"}
              </span>
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 text-white/40 transition-transform",
                  projectOpen && "rotate-180 text-[#00e5ff]"
                )}
              />
            </button>

            {projectOpen && (
              <div className="absolute top-full right-0 mt-1.5 w-64 p-1.5 rounded-xl border border-white/[0.10] bg-[#0a0d16]/95 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] z-50 cg-pop">
                <div className="font-mono text-[9px] tracking-[0.12em] uppercase text-white/25 px-2.5 pt-1 pb-2">
                  Switch project
                </div>
                {projects.map((p) => {
                  const active = p.id === activeProjectId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { selectProject(p.id); setProjectOpen(false); }}
                      className={cn(
                        "relative w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors",
                        active ? "bg-[#00e5ff]/[0.06]" : "hover:bg-white/[0.03]"
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-[#00e5ff]" />
                      )}
                      <span className="flex-1 min-w-0">
                        <span className="block font-mono text-[12px] text-white truncate">{p.name}</span>
                        <span className="block font-mono text-[9.5px] text-white/30">
                          {(p as { source_type?: string }).source_type ?? (p.github_url ? "GitHub" : "ZIP")}
                        </span>
                      </span>
                      {active && <Check className="w-3 h-3 text-[#00e5ff]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </header>

      {/* ── No project ─────────────────────────────────────────────── */}
      {!activeProjectId ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
          <span className="w-12 h-12 rounded-2xl border border-white/[0.08] bg-white/[0.02] flex items-center justify-center">
            <Braces className="w-6 h-6 text-white/20" strokeWidth={1.5} />
          </span>
          <div>
            <p className="text-[15px] font-semibold text-white/60">No Project Selected</p>
            <p className="mt-1 font-mono text-[11px] text-white/25">
              Select a project from the header to start exploring its AST.
            </p>
          </div>
        </div>
      ) : (
        /* ── Main 3-column workspace ─────────────────────────────── */
        <div className="flex-1 min-h-0 overflow-hidden">
          {/* Mobile panel tabs */}
          <div className="flex lg:hidden border-b border-white/[0.06] bg-[#080a12]/80 shrink-0">
            {(["explorer", "ast", "details"] as const).map((panel) => (
              <button
                key={panel}
                type="button"
                onClick={() => setMobilePanel(panel)}
                className={cn(
                  "flex-1 py-2.5 font-mono text-[10px] tracking-[0.1em] uppercase transition-colors",
                  mobilePanel === panel
                    ? "text-[#00e5ff] border-b-2 border-[#00e5ff]"
                    : "text-white/30 hover:text-white/60"
                )}
              >
                {panel === "explorer" ? "Files" : panel === "ast" ? "AST" : "Details"}
              </button>
            ))}
          </div>

          <div className="flex h-full overflow-hidden">
            {/* LEFT: Explorer */}
            <div
              className={cn(
                "w-[315px] shrink-0 h-full overflow-hidden",
                "hidden lg:block",
                mobilePanel === "explorer" && "!block w-full lg:w-[315px]"
              )}
            >
              <Explorer
                files={files}
                selectedFileId={selectedFile?.id ?? null}
                isLoading={isLoadingWorkspace}
                projectName={currentProject?.name ?? "Active Project"}
                onSelectFile={(f) => setSelectedFile(f)}
                onRefresh={() => setRefreshTrigger((p) => p + 1)}
              />
            </div>

            {/* CENTER: AST structure */}
            <div
              className={cn(
                "flex-1 min-w-0 h-full overflow-hidden flex flex-col",
                "hidden lg:flex",
                mobilePanel === "ast" && "!flex w-full"
              )}
            >
              {/* Center toolbar */}
              <div className="h-11 flex items-center gap-3 px-3.5 border-b border-white/[0.06] bg-[#080a12]/70 shrink-0">
                <Braces className="w-4 h-4 text-[#00e5ff]/70 shrink-0" />
                <span className="font-mono text-[11.5px] tracking-[0.12em] uppercase text-white/50 font-semibold">
                  AST Structure
                </span>

                {/* Stats */}
                {stats && (
                  <div className="flex items-center gap-3 ml-2 overflow-x-auto">
                    <span className="text-white/20">·</span>
                    <StatBadge label="nodes" count={stats.total} />
                    {stats.byKind.function != null && <StatBadge label="fn" count={stats.byKind.function} />}
                    {stats.byKind.method != null && <StatBadge label="method" count={stats.byKind.method} />}
                    {stats.byKind.class != null && <StatBadge label="class" count={stats.byKind.class} />}
                    {stats.byKind.import != null && <StatBadge label="import" count={stats.byKind.import} />}
                  </div>
                )}

                {/* Search */}
                <label className="ml-auto flex items-center gap-2 h-8 px-2.5 rounded-lg border border-white/[0.08] bg-black/20 focus-within:border-[#00e5ff]/40 focus-within:shadow-[0_0_0_2px_rgba(0,229,255,0.06)] transition-all min-w-0 max-w-[280px] w-full">
                  <Search className="w-3.5 h-3.5 text-white/35 shrink-0" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search functions, classes, imports…"
                    className="w-full bg-transparent outline-none font-mono text-[13px] text-white placeholder:text-white/30"
                  />
                  {searchTerm && (
                    <button type="button" onClick={() => setSearchTerm("")}>
                      <X className="w-3 h-3 text-white/40 hover:text-white" />
                    </button>
                  )}
                </label>
              </div>

              {/* Center content */}
              {workspaceError ? (
                <div className="flex-1 flex items-center justify-center p-6 font-mono text-xs text-rose-300">
                  {workspaceError}
                </div>
              ) : !selectedFile ? (
                <div className="flex-1 flex items-center justify-center text-center p-8">
                  <div>
                    <div className="relative mx-auto w-14 h-14 rounded-2xl border border-[#00e5ff]/15 bg-[#090d15] flex items-center justify-center mb-4 shadow-[0_0_30px_-10px_rgba(0,229,255,0.4)]">
                      <Code2 className="w-6 h-6 text-[#00e5ff]/50" strokeWidth={1.5} />
                    </div>
                    <p className="text-[14px] font-medium text-white/60">
                      Select a file to inspect its AST
                    </p>
                    <p className="mt-1 font-mono text-[10.5px] text-white/25">
                      The hierarchical structure will appear here.
                    </p>
                  </div>
                </div>
              ) : isLoadingAnalysis ? (
                <div className="flex-1 flex items-center justify-center gap-2 font-mono text-xs text-white/30">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#00e5ff]" />
                  Parsing source file…
                </div>
              ) : analysisError ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <p className="text-[13px] text-white/50">Unable to parse file</p>
                  <p className="font-mono text-[10px] text-white/25 max-w-xs">{analysisError}</p>
                  <button
                    type="button"
                    onClick={() => setAnalysisRefresh((p) => p + 1)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] font-mono text-[10.5px] text-white/40 hover:text-white hover:border-white/20 transition-all"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retry
                  </button>
                </div>
              ) : astRoot ? (
                <ASTHierarchy
                  root={astRoot}
                  searchTerm={searchTerm}
                  selectedId={selectedNode?.id ?? null}
                  onSelect={handleSelectNode}
                />
              ) : null}
            </div>

            {/* RIGHT: AST Details */}
            <div
              className={cn(
                "w-[305px] shrink-0 h-full overflow-hidden",
                "hidden lg:block",
                mobilePanel === "details" && "!block w-full lg:w-[305px]"
              )}
            >
              <ASTDetails
                selectedNode={selectedNode}
                selectedFile={selectedFile}
                projectId={activeProjectId}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function AstPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center gap-2 font-mono text-xs text-white/30">
          <RefreshCw className="w-4 h-4 animate-spin text-[#00e5ff]" />
          Loading AST workspace…
        </div>
      }
    >
      <AstPageInner />
    </Suspense>
  );
}
