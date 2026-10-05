"use client";

import { RefreshCw, Search } from "lucide-react";
import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { SymbolDetails } from "@/components/analysis/SymbolDetails";
import { SymbolList } from "@/components/analysis/SymbolList";
import { ProjectSelector } from "@/components/developer/ProjectSelector";
import { RepositoryTree } from "@/components/workspace/RepositoryTree";
import { useActiveProject } from "@/hooks/useActiveProject";
import { getFileContent, getRepositoryWorkspace, getFileAnalysis } from "@/services/workspace";
import type { FileAnalysis, FileSymbols, RepositoryFile, SymbolGroup } from "@/types/workspace";

// Example mock symbols for visual empty state
const mockEmptySymbols: FileSymbols = {
  imports: ["cycle_c"],
  functions: ["function_a", "format_user"],
  classes: ["UserService"],
  methods: ["get_user_info"],
  variables: ["USER_CONFIG"],
  exports: ["UserService"],
};

function SymbolsPageInner() {
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
  const [filterQuery, setFilterQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const loadWorkspace = useCallback(async () => {
    if (!activeProjectId) return;
    setIsLoadingWorkspace(true);
    setWorkspaceError(null);
    setSelectedFile(null);
    setAnalysis(null);
    setSourceText(null);
    setSelectedSymbolName(null);
    setSelectedSymbolGroup(null);
    try {
      const response = await getRepositoryWorkspace(activeProjectId);
      setFiles(response.files);
    } catch (error) {
      setWorkspaceError(
        error instanceof Error ? error.message : "Could not load the repository workspace."
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

      // Auto-select first available symbol if present
      const firstGroup = (["functions", "classes", "imports", "variables", "methods", "exports"] as SymbolGroup[]).find(
        (g) => analysisData.symbols[g]?.length
      );
      if (firstGroup && analysisData.symbols[firstGroup]?.[0]) {
        setSelectedSymbolGroup(firstGroup);
        setSelectedSymbolName(analysisData.symbols[firstGroup][0]);
      } else {
        setSelectedSymbolName(null);
        setSelectedSymbolGroup(null);
      }
    } catch (error) {
      setAnalysisError(
        error instanceof Error ? error.message : "Could not load symbols for this file."
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

  const filteredSymbols = useMemo(() => {
    if (!analysis?.symbols) return null;
    const query = filterQuery.trim().toLowerCase();
    if (!query) return analysis.symbols;

    const result = {} as FileSymbols;
    const groups: SymbolGroup[] = [
      "imports",
      "exports",
      "functions",
      "classes",
      "methods",
      "variables",
    ];
    for (const group of groups) {
      result[group] = (analysis.symbols[group] ?? []).filter((symbol) =>
        symbol.toLowerCase().includes(query)
      );
    }
    return result;
  }, [analysis?.symbols, filterQuery]);

  const hasSymbols = useMemo(() => {
    if (!filteredSymbols) return false;
    return Object.values(filteredSymbols).some((values) => values && values.length > 0);
  }, [filteredSymbols]);

  const handleSelectSymbol = useCallback((name: string, group: SymbolGroup) => {
    setSelectedSymbolName(name);
    setSelectedSymbolGroup(group);
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-0 h-full overflow-hidden bg-[#000000]">
      {/* ── Page Header ── */}
      <header className="relative z-20 shrink-0 border-b border-[#242424] bg-[#050505] px-6 py-4">
        <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#737373]">
          CODEGRAPH AI &nbsp;/&nbsp; CODE ANALYSIS
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Symbols
            </h1>
            <p className="mt-0.5 text-[13px] text-[#A3A3A3]">
              Discover functions, classes, variables, imports, and code declarations.
            </p>
          </div>
          {/* Active Project Context Selector */}
          <div className="w-full sm:w-80 shrink-0">
            <ProjectSelector
              projects={projects}
              selectedProjectId={activeProjectId}
              onSelect={selectProject}
            />
          </div>
        </div>
      </header>

      {/* ── Main 3-Column Workspace ── */}
      {isLoadingProjects ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-[#737373] font-mono text-xs">
          <RefreshCw className="size-4 animate-spin text-[#A3A3A3]" />
          <span>Loading project context…</span>
        </div>
      ) : errorLoadingProjects ? (
        <div className="m-6 rounded-lg border border-[#292929] bg-[#080808] p-6 text-xs font-mono">
          <p className="font-semibold text-white">Failed to load projects</p>
          <p className="mt-1 text-[#737373]">{errorLoadingProjects}</p>
        </div>
      ) : !activeProjectId ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center font-mono">
          <div>
            <p className="text-sm text-white font-medium">No Project Selected</p>
            <p className="mt-1 text-xs text-[#737373]">
              Select an active project from the dropdown above to view its code symbols.
            </p>
          </div>
        </div>
      ) : (
        /* 3-Column Container: Left File Explorer | Center Symbols List | Right Symbol Details */
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* LEFT COLUMN: File Explorer */}
          <RepositoryTree
            files={files}
            selectedFileId={selectedFile?.id ?? null}
            isLoading={isLoadingWorkspace}
            onSelectFile={(f) => {
              setSelectedFile(f);
              setFilterQuery("");
              setTypeFilter("all");
            }}
            onRefresh={() => setRefreshTrigger((p) => p + 1)}
            className="w-[270px] shrink-0 border-r border-[#242424] bg-[#050505]"
          />

          {/* CENTER COLUMN: Symbols Workspace */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#050505] relative min-w-0">
            {workspaceError ? (
              <div className="flex flex-1 items-center justify-center p-6 text-center font-mono text-xs text-[#737373]">
                <p>{workspaceError}</p>
              </div>
            ) : !selectedFile ? (
              /* Intentional Example Visual Symbol Browser for Empty State */
              <div className="flex flex-1 flex-col min-h-0 overflow-hidden relative">
                <div className="shrink-0 border-b border-[#242424] bg-[#080808] p-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between select-none">
                  <div className="flex items-center gap-2 rounded-lg border border-[#242424] bg-[#050505] px-3 py-1.5 text-xs text-[#737373] flex-1">
                    <Search className="size-3.5 shrink-0 text-[#555555]" />
                    <span className="font-mono text-[12px]">Search symbols in selected file...</span>
                  </div>
                </div>

                <div className="absolute inset-x-0 top-14 z-10 text-center pointer-events-none">
                  <span className="inline-block rounded-md border border-[#292929] bg-[#080808]/90 px-3 py-1 font-mono text-[11px] font-medium text-[#E5E5E5] shadow-lg backdrop-blur">
                    Select a file from Explorer to inspect its code symbols
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto opacity-40 pointer-events-none">
                  <SymbolList
                    symbols={mockEmptySymbols}
                    selectedSymbolName="function_a"
                  />
                </div>
              </div>
            ) : isLoadingAnalysis ? (
              <div className="flex flex-1 items-center justify-center gap-2 font-mono text-xs text-[#737373]">
                <RefreshCw className="size-4 animate-spin text-[#A3A3A3]" />
                <span>Extracting code symbols…</span>
              </div>
            ) : analysisError ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center font-mono text-xs">
                <p className="text-white font-medium">Unable to extract symbols</p>
                <p className="text-[#737373]">{analysisError}</p>
              </div>
            ) : filteredSymbols ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {/* Search Bar & Type Filter Toolbar */}
                <div className="shrink-0 border-b border-[#242424] bg-[#080808] p-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between select-none">
                  {/* Search Input */}
                  <div className="flex items-center gap-2 rounded-lg border border-[#242424] bg-[#050505] px-3 py-1.5 text-xs text-white flex-1 focus-within:border-[#555555] focus-within:shadow-[0_0_10px_rgba(255,255,255,0.03)] transition-all">
                    <Search className="size-3.5 shrink-0 text-[#555555]" />
                    <input
                      type="text"
                      placeholder={`Search symbols in ${selectedFile.path.split("/").pop()}...`}
                      value={filterQuery}
                      onChange={(e) => setFilterQuery(e.target.value)}
                      className="w-full bg-transparent font-mono text-[12px] text-white outline-none placeholder:text-[#555555]"
                    />
                  </div>

                  {/* Type Filter Dropdown */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[10px] uppercase font-bold text-[#555555] tracking-wider">
                      Type:
                    </span>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="rounded-lg border border-[#242424] bg-[#050505] px-2.5 py-1.5 font-mono text-[11px] text-white outline-none focus:border-[#555555] cursor-pointer"
                    >
                      <option value="all">All Types</option>
                      <option value="functions">Functions</option>
                      <option value="classes">Classes</option>
                      <option value="imports">Imports</option>
                      <option value="variables">Variables</option>
                      <option value="methods">Methods</option>
                      <option value="exports">Exports</option>
                    </select>
                  </div>
                </div>

                {/* Symbols List Area */}
                <div className="flex-1 overflow-y-auto min-h-0 bg-[#050505]">
                  {hasSymbols ? (
                    <SymbolList
                      symbols={filteredSymbols}
                      selectedSymbolName={selectedSymbolName}
                      typeFilter={typeFilter}
                      onSelectSymbol={handleSelectSymbol}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center p-6 text-center font-mono text-xs text-[#737373]">
                      <p>
                        {filterQuery.trim()
                          ? "No symbols match your filter."
                          : "No symbols found in this file."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* RIGHT COLUMN: Symbol Details Inspector */}
          <SymbolDetails
            symbolName={selectedSymbolName}
            symbolGroup={selectedSymbolGroup}
            analysis={analysis}
            sourceText={sourceText}
            projectId={activeProjectId}
            fileId={selectedFile?.id}
            filePath={selectedFile?.path}
            className="w-[300px] lg:w-[320px] shrink-0 border-l border-[#242424] bg-[#080808] hidden lg:flex flex-col h-full overflow-y-auto"
          />
        </div>
      )}
    </div>
  );
}

export default function SymbolsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center gap-2 font-mono text-xs text-[#737373]">
          <RefreshCw className="size-4 animate-spin text-[#A3A3A3]" />
          <span>Loading symbols workspace…</span>
        </div>
      }
    >
      <SymbolsPageInner />
    </Suspense>
  );
}
