"use client";

import {
  Check,
  ChevronDown,
  Code2,
  FileCode2,
  FileText,
  RefreshCw,
  Search,
  Variable,
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

import { SymbolDetails } from "@/components/analysis/SymbolDetails";
import { SymbolList, SYMBOL_TYPE_META } from "@/components/analysis/SymbolList";
import { useActiveProject } from "@/hooks/useActiveProject";
import { cn } from "@/lib/cn";
import {
  getFileAnalysis,
  getFileContent,
  getRepositoryWorkspace,
} from "@/services/workspace";
import type {
  FileAnalysis,
  FileSymbols,
  RepositoryFile,
  SymbolGroup,
} from "@/types/workspace";

function SymbolsPageInner() {
  const searchParams = useSearchParams();
  const initialFileParam = searchParams.get("file");
  const initialSearchParam = searchParams.get("search") || "";

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

  // Selected symbol state
  const [selectedSymbolName, setSelectedSymbolName] = useState<string | null>(null);
  const [selectedSymbolGroup, setSelectedSymbolGroup] = useState<SymbolGroup | null>(null);

  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Filters
  const [fileFilter, setFileFilter] = useState("");
  const [query, setQuery] = useState(initialSearchParam);
  const [typeFilter, setTypeFilter] = useState("all");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Project context dropdown popover state
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const projectRef = useRef<HTMLDivElement>(null);

  // Mobile panel tab state
  const [mobileTab, setMobileTab] = useState<"explorer" | "symbols" | "details">("symbols");

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
    setAnalysis(null);
    setSourceText(null);
    setSelectedSymbolName(null);
    setSelectedSymbolGroup(null);

    try {
      const response = await getRepositoryWorkspace(activeProjectId);
      const loadedFiles = response.files || [];
      setFiles(loadedFiles);

      // Auto-select file: either from query param or default to the first file
      if (loadedFiles.length > 0) {
        if (initialFileParam) {
          const matched = loadedFiles.find(
            (f) =>
              f.path === initialFileParam ||
              f.path.endsWith(`/${initialFileParam}`) ||
              f.path.split("/").pop() === initialFileParam
          );
          setSelectedFile(matched ?? loadedFiles[0]);
        } else {
          setSelectedFile(loadedFiles[0]);
        }
      } else {
        setSelectedFile(null);
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

  // Load symbol analysis and source text for selected file
  const loadAnalysis = useCallback(async () => {
    if (!activeProjectId || !selectedFile) return;
    setIsLoadingAnalysis(true);
    setAnalysisError(null);

    try {
      const [analysisData, fileContent] = await Promise.all([
        getFileAnalysis(selectedFile.id),
        getFileContent(activeProjectId, selectedFile.id).catch(() => null),
      ]);

      setAnalysis(analysisData);
      setSourceText(fileContent ? fileContent.content : null);

      // Auto-select first symbol if available
      const groups: SymbolGroup[] = [
        "functions",
        "classes",
        "methods",
        "variables",
        "imports",
        "exports",
      ];
      const firstGroup = groups.find((g) => analysisData.symbols[g]?.length);

      if (firstGroup && analysisData.symbols[firstGroup]?.[0]) {
        setSelectedSymbolGroup(firstGroup);
        setSelectedSymbolName(analysisData.symbols[firstGroup][0]);
      } else {
        setSelectedSymbolName(null);
        setSelectedSymbolGroup(null);
      }
    } catch (error) {
      setAnalysisError(
        error instanceof Error
          ? error.message
          : "Could not load symbols for this file."
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

  // Filtered files in explorer
  const filteredFiles = useMemo(() => {
    const val = fileFilter.trim().toLowerCase();
    if (!val) return files;
    return files.filter(
      (f) =>
        f.path.toLowerCase().includes(val) ||
        (f.language && f.language.toLowerCase().includes(val))
    );
  }, [files, fileFilter]);

  // Filtered symbols in center workspace
  const filteredSymbols = useMemo(() => {
    if (!analysis?.symbols) return null;
    const q = query.trim().toLowerCase();

    const result = {} as FileSymbols;
    const groups: SymbolGroup[] = [
      "functions",
      "classes",
      "methods",
      "variables",
      "imports",
      "exports",
    ];

    for (const group of groups) {
      const items = analysis.symbols[group] ?? [];
      result[group] = q
        ? items.filter((sym) => sym.toLowerCase().includes(q))
        : items;
    }
    return result;
  }, [analysis?.symbols, query]);

  // Stats across selected file
  const symbolStats = useMemo(() => {
    if (!analysis?.symbols) return { total: 0, breakdown: [] };
    const groups: SymbolGroup[] = [
      "functions",
      "classes",
      "methods",
      "variables",
      "imports",
      "exports",
    ];

    let total = 0;
    const breakdown: Array<{ type: SymbolGroup; count: number }> = [];

    for (const group of groups) {
      const count = analysis.symbols[group]?.length ?? 0;
      total += count;
      if (count > 0) {
        breakdown.push({ type: group, count });
      }
    }

    return { total, breakdown };
  }, [analysis?.symbols]);

  const handleSelectSymbol = useCallback((name: string, group: SymbolGroup) => {
    setSelectedSymbolName(name);
    setSelectedSymbolGroup(group);
    setMobileTab("details");
  }, []);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden select-none px-3 md:px-5 lg:px-6 pt-2.5 md:pt-3 pb-3 md:pb-4 max-w-[1780px] mx-auto">
      {/* ── Page Header matching Figma Redesign ── */}
      <header
        className="relative z-40 shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-3 pb-2.5 border-b border-white/[0.06] mb-3"
      >
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_#00e5ff]" />
            <span className="cg-label">CodeGraph AI / Code Analysis</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
            Symbols
          </h1>
          <p className="text-muted-foreground text-[12.5px] sm:text-[13px] md:text-[13.5px] mt-1">
            Discover functions, classes, variables, imports, and code declarations.
          </p>
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
                    setSelectedSymbolName(null);
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
          <p className="mt-1 text-xs text-rose-300 font-mono">{errorLoadingProjects}</p>
        </div>
      ) : !activeProjectId ? (
        <div className="flex-1 flex items-center justify-center p-8 text-center font-mono">
          <div className="max-w-md p-6 rounded-2xl border border-white/[0.08] bg-[#080b12]/90">
            <p className="text-base font-semibold text-white">No Project Selected</p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Select an active project from the dropdown above to view its code symbols.
            </p>
          </div>
        </div>
      ) : (
        <div
          className="relative z-10 flex-1 min-h-0 w-full rounded-xl md:rounded-2xl border border-white/[0.07] overflow-hidden bg-[#070910]/85 backdrop-blur-xl shadow-[0_30px_90px_-30px_rgba(0,0,0,0.9)] flex flex-col reveal"
          style={{ ["--d" as string]: "120ms" }}
        >
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
              onClick={() => setMobileTab("symbols")}
              className={cn(
                "flex-1 py-2 font-mono text-[11px] uppercase tracking-wider text-center transition-colors",
                mobileTab === "symbols"
                  ? "text-primary border-b-2 border-primary font-semibold"
                  : "text-muted-foreground hover:text-white"
              )}
            >
              Symbols {selectedFile ? `(${symbolStats.total})` : ""}
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
          <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_340px] xl:grid-cols-[280px_minmax(0,1fr)_360px] 2xl:grid-cols-[300px_minmax(0,1fr)_380px]">
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
                <Code2 className="w-3.5 h-3.5 text-primary/80" />
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

              {/* Files List - Independently Scrollable */}
              <div className="flex-1 min-h-0 overflow-y-auto py-1">
                {isLoadingWorkspace ? (
                  <div className="space-y-1 px-2 py-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="h-8.5 rounded-md bg-white/[0.02] animate-pulse"
                      />
                    ))}
                  </div>
                ) : filteredFiles.length > 0 ? (
                  <ul className="space-y-0.5">
                    {filteredFiles.map((file, index) => {
                      const isActive = selectedFile?.id === file.id;
                      const isMd =
                        file.path.endsWith(".md") || file.path.endsWith(".txt");
                      const Icon = isMd ? FileText : FileCode2;
                      const fileName = file.path.split("/").pop() || file.path;

                      return (
                        <li
                          key={file.id}
                          className="reveal"
                          style={{ ["--d" as string]: `${index * 15}ms` }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFile(file);
                              setQuery("");
                              setTypeFilter("all");
                              setMobileTab("symbols");
                            }}
                            className={cn(
                              "group relative w-full flex items-center gap-2.5 h-8.5 pl-6 pr-3 text-left transition-colors",
                              isActive
                                ? "bg-gradient-to-r from-primary/[0.11] to-transparent text-white font-medium"
                                : "text-[#929fb2] hover:bg-white/[0.03] hover:text-white"
                            )}
                            title={file.path}
                          >
                            {/* Active neon left bar */}
                            <span
                              className={cn(
                                "absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-primary transition-opacity",
                                isActive
                                  ? "opacity-100 shadow-[0_0_8px_#00e5ff]"
                                  : "opacity-0"
                              )}
                            />

                            <Icon
                              className={cn(
                                "w-3.5 h-3.5 shrink-0",
                                isActive
                                  ? "text-primary"
                                  : isMd
                                  ? "text-violet-300/60"
                                  : "text-sky-300/55"
                              )}
                            />
                            <span className="font-mono text-[12.5px] truncate">
                              {fileName}
                            </span>

                            {isActive && (
                              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_5px_#00e5ff] shrink-0" />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="p-4 text-center font-mono text-xs text-muted-foreground">
                    No matching files.
                  </div>
                )}
              </div>
            </aside>

            {/* ── CENTER COLUMN: Symbols Workspace ── */}
            <div
              className={cn(
                "h-full min-h-0 flex flex-col bg-[#05070c]/95 overflow-hidden",
                "hidden lg:flex",
                mobileTab === "symbols" && "!flex w-full"
              )}
            >
              {workspaceError ? (
                <div className="flex flex-1 items-center justify-center p-6 text-center font-mono text-xs text-rose-300">
                  <p>{workspaceError}</p>
                </div>
              ) : !selectedFile ? (
                <div className="flex flex-1 items-center justify-center p-8 text-center font-mono">
                  <div>
                    <span className="inline-block p-4 rounded-xl border border-white/[0.08] bg-white/[0.02]">
                      <Variable className="w-6 h-6 text-primary mx-auto" />
                    </span>
                    <p className="mt-3 text-sm text-white font-medium">
                      Select a file from Explorer
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Choose any file to inspect its code declarations and symbols.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Symbols Header & Filter Toolbar */}
                  <div className="p-3 md:p-3.5 border-b border-white/[0.06] bg-[#080a12]/80 shrink-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <Variable className="w-4 h-4 text-primary shrink-0" />
                        <span className="cg-label !text-foreground/80">Symbols</span>
                        <span className="font-mono text-[11px] text-muted-foreground truncate">
                          / {selectedFile.path}
                        </span>
                      </div>

                      {/* Stats pills */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10.5px] text-muted-foreground">
                        <span>
                          <strong className="font-medium text-white">
                            {symbolStats.total}
                          </strong>{" "}
                          symbols
                        </span>
                        {symbolStats.breakdown.slice(0, 4).map((stat) => (
                          <span key={stat.type}>
                            <strong className="font-medium text-white">
                              {stat.count}
                            </strong>{" "}
                            {SYMBOL_TYPE_META[stat.type].plural.toLowerCase()}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Search & Type Filter Row */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <label className="flex-1 flex items-center gap-2 h-8.5 px-3 rounded-lg border border-white/[0.08] bg-black/20 focus-within:border-primary/35 focus-within:shadow-[0_0_0_2px_rgba(0,229,255,0.05)] transition-all">
                        <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder={`Search symbols in ${
                            selectedFile.path.split("/").pop() || "file"
                          }...`}
                          className="w-full min-w-0 bg-transparent outline-none text-[12px] text-white placeholder:text-muted-foreground/60 font-mono"
                        />
                        {query && (
                          <button
                            type="button"
                            onClick={() => setQuery("")}
                            aria-label="Clear symbol search"
                          >
                            <X className="w-3.5 h-3.5 text-muted-foreground hover:text-white" />
                          </button>
                        )}
                      </label>

                      {/* Type Filter Select */}
                      <label className="flex items-center gap-2 h-8.5 px-2.5 rounded-lg border border-white/[0.08] bg-black/20 shrink-0">
                        <span className="cg-label !text-[8.5px]">Type</span>
                        <select
                          value={typeFilter}
                          onChange={(e) => setTypeFilter(e.target.value)}
                          className="bg-[#090c13] outline-none font-mono text-[11px] text-foreground cursor-pointer"
                        >
                          <option value="all">All Types</option>
                          <option value="functions">Functions</option>
                          <option value="classes">Classes</option>
                          <option value="methods">Methods</option>
                          <option value="variables">Variables</option>
                          <option value="imports">Imports</option>
                          <option value="exports">Exports</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  {/* Symbols List Area - Independently Scrollable */}
                  <div className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4 ast-results">
                    {isLoadingAnalysis ? (
                      <div className="flex flex-col items-center justify-center h-48 gap-3 font-mono text-xs text-muted-foreground">
                        <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                        <span>Extracting code declarations…</span>
                      </div>
                    ) : analysisError ? (
                      <div className="flex flex-col items-center justify-center p-6 text-center font-mono text-xs">
                        <p className="text-white font-medium">
                          Unable to extract symbols
                        </p>
                        <p className="mt-1 text-muted-foreground">{analysisError}</p>
                        <button
                          type="button"
                          onClick={() => void loadAnalysis()}
                          className="mt-4 graph-action"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Try Again
                        </button>
                      </div>
                    ) : filteredSymbols ? (
                      <SymbolList
                        symbols={filteredSymbols}
                        selectedSymbolName={selectedSymbolName}
                        selectedSymbolGroup={selectedSymbolGroup}
                        typeFilter={typeFilter}
                        onSelectSymbol={handleSelectSymbol}
                        filePath={selectedFile.path}
                      />
                    ) : null}
                  </div>
                </>
              )}
            </div>

            {/* ── RIGHT COLUMN: Symbol Details Inspector ── */}
            <div
              className={cn(
                "h-full min-h-0 flex flex-col border-t lg:border-t-0 lg:border-l border-white/[0.06] overflow-hidden",
                "hidden lg:flex",
                mobileTab === "details" && "!flex w-full"
              )}
            >
              <SymbolDetails
                symbolName={selectedSymbolName}
                symbolGroup={selectedSymbolGroup}
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

export default function SymbolsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center gap-2 font-mono text-xs text-muted-foreground">
          <RefreshCw className="w-4 h-4 animate-spin text-primary" />
          <span>Loading symbols workspace…</span>
        </div>
      }
    >
      <SymbolsPageInner />
    </Suspense>
  );
}
