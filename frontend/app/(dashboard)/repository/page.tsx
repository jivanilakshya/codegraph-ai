"use client";

import { Check, ChevronDown, FolderGit2, RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

import { CodeViewer } from "@/components/workspace/CodeViewer";
import { RepositoryTree } from "@/components/workspace/RepositoryTree";
import { useActiveProject } from "@/hooks/useActiveProject";
import { parseSourceLocation, type HighlightRange } from "@/lib/navigation";
import { getFileContent, getRepositoryWorkspace } from "@/services/workspace";
import type { FileContent, RepositoryFile } from "@/types/workspace";

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function RepositoryPageInner() {
  const searchParams = useSearchParams();
  const {
    projects,
    activeProjectId,
    isLoadingProjects,
    errorLoadingProjects,
    selectProject,
  } = useActiveProject();

  const [files, setFiles] = useState<RepositoryFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<RepositoryFile | null>(null);
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [highlightRange, setHighlightRange] = useState<HighlightRange | null>(null);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const processedLocationRef = useRef<string | null>(null);

  const currentProject = projects.find((p) => p.id === activeProjectId);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const loadWorkspace = useCallback(async () => {
    if (!activeProjectId) return;
    setIsLoadingWorkspace(true);
    setWorkspaceError(null);
    setSelectedFile(null);
    setFileContent(null);
    setHighlightRange(null);
    try {
      const response = await getRepositoryWorkspace(activeProjectId);
      setFiles(response.files);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Could not load the repository workspace.");
    } finally {
      setIsLoadingWorkspace(false);
    }
  }, [activeProjectId]);

  useEffect(() => {
    if (activeProjectId) {
      void loadWorkspace();
    }
  }, [activeProjectId, loadWorkspace, refreshTrigger]);

  const loadFileContent = useCallback(
    async (projectId: number, file: RepositoryFile, range?: HighlightRange | null) => {
      setSelectedFile(file);
      setFileContent(null);
      setFileError(null);
      setIsLoadingFile(true);
      if (range !== undefined) {
        setHighlightRange(range);
      }
      try {
        const response = await getFileContent(projectId, file.id);
        setFileContent(response);
      } catch (error) {
        setFileError(error instanceof Error ? error.message : "Could not load this file.");
      } finally {
        setIsLoadingFile(false);
      }
    },
    []
  );

  // Handle deep-link source location navigation from search parameters
  useEffect(() => {
    if (!activeProjectId || files.length === 0) return;

    const sourceLoc = parseSourceLocation(searchParams);
    if (!sourceLoc || (sourceLoc.fileId == null && !sourceLoc.filePath)) {
      return;
    }

    const locationKey = `${activeProjectId}-${sourceLoc.fileId ?? ""}-${sourceLoc.filePath ?? ""}-${sourceLoc.startLine ?? ""}-${sourceLoc.endLine ?? ""}`;
    if (processedLocationRef.current === locationKey) {
      return;
    }

    let targetFile: RepositoryFile | undefined;

    if (sourceLoc.fileId != null) {
      targetFile = files.find((f) => f.id === sourceLoc.fileId);
    }

    if (!targetFile && sourceLoc.filePath) {
      const normalizedPath = sourceLoc.filePath.replace(/\\/g, "/").toLowerCase();
      targetFile = files.find((f) => {
        const fPath = f.path.replace(/\\/g, "/").toLowerCase();
        return (
          fPath === normalizedPath ||
          fPath.endsWith(normalizedPath) ||
          normalizedPath.endsWith(fPath)
        );
      });
    }

    if (targetFile) {
      processedLocationRef.current = locationKey;
      const range: HighlightRange | null =
        sourceLoc.startLine != null
          ? {
              startLine: sourceLoc.startLine,
              endLine: sourceLoc.endLine ?? sourceLoc.startLine,
              startColumn: sourceLoc.startColumn,
              endColumn: sourceLoc.endColumn,
            }
          : null;

      void loadFileContent(activeProjectId, targetFile, range);
    } else if (sourceLoc.fileId != null || sourceLoc.filePath) {
      setFileError(
        `Requested file ${sourceLoc.filePath ? `"${sourceLoc.filePath}"` : `(ID #${sourceLoc.fileId})`} was not found in this project.`
      );
    }
  }, [activeProjectId, files, searchParams, loadFileContent]);

  const handleSelectFile = async (file: RepositoryFile) => {
    if (!activeProjectId) return;
    processedLocationRef.current = null;
    await loadFileContent(activeProjectId, file, null);
  };

  const handleRefresh = () => {
    processedLocationRef.current = null;
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleClearHighlight = () => {
    setHighlightRange(null);
  };

  return (
    <div className="relative max-w-[1440px] mx-auto px-4 md:px-8 lg:px-10 py-8 md:py-10 text-white selection:bg-[#00e5ff]/30 selection:text-white">
      {/* Figma Ambient Atmospheric Background */}
      <div aria-hidden className="fixed inset-0 pointer-events-none z-0 reveal-fade">
        <div className="absolute inset-0 cg-ambient" />
        <div className="absolute inset-0 cg-grid opacity-60" />
        <div className="absolute inset-0 cg-noise" />
      </div>

      {/* HEADER SECTION (Stagger 80ms) */}
      <section
        className="relative z-30 flex flex-col md:flex-row md:items-end justify-between gap-6 reveal"
        style={{ "--d": "80ms" } as React.CSSProperties}
      >
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] shadow-[0_0_6px_#00e5ff]" />
            <span className="cg-label">Codebase Explorer</span>
          </div>
          <h1 className="text-4xl md:text-[56px] leading-[1] font-bold tracking-[-0.035em] text-white">
            Repository
          </h1>
          <p className="text-muted-foreground text-[15px] mt-3">
            Explore the files and structure of your active codebase.
          </p>
        </div>

        {/* ACTIVE PROJECT CONTEXT SELECTOR */}
        <div className="relative" ref={dropdownRef}>
          <div className="cg-label mb-2">Active Project Context</div>
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className={cn(
              "flex items-center gap-3 justify-between w-full md:w-64 h-10 pl-3 pr-2.5 rounded-lg border bg-white/[0.02] transition-all text-[13px]",
              dropdownOpen
                ? "border-[#00e5ff]/40 shadow-[0_0_0_3px_rgba(0,229,255,0.06),0_0_24px_-6px_rgba(0,229,255,0.35)]"
                : "border-white/[0.08] hover:border-white/20"
            )}
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] shadow-[0_0_6px_#00e5ff] shrink-0" />
              <span className="text-white font-medium truncate">
                {currentProject ? currentProject.name : "Select project…"}
              </span>
              {currentProject && (
                <span className="font-mono text-muted-foreground text-[11px]">#{currentProject.id}</span>
              )}
            </span>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-muted-foreground transition-transform duration-300",
                dropdownOpen && "rotate-180 text-[#00e5ff]"
              )}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-full md:w-72 p-1.5 rounded-xl border border-cyan-300/15 bg-[#0a0d16]/90 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8),0_0_30px_-10px_rgba(0,229,255,0.25)] cg-pop z-50">
              <div className="cg-label px-2.5 pt-1.5 pb-2 !text-[9.5px]">Switch project</div>
              {projects.length === 0 ? (
                <div className="px-3 py-2 font-mono text-xs text-muted-foreground italic">
                  No projects available
                </div>
              ) : (
                projects.map((p) => {
                  const active = p.id === activeProjectId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        processedLocationRef.current = null;
                        selectProject(p.id);
                        setDropdownOpen(false);
                      }}
                      className={cn(
                        "relative w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-colors",
                        active ? "bg-[#00e5ff]/[0.07]" : "hover:bg-white/[0.04]"
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-[#00e5ff]" />
                      )}
                      <span className="flex-1 min-w-0">
                        <span
                          className={cn(
                            "block text-[13px] truncate",
                            active ? "text-white font-medium" : "text-foreground/85"
                          )}
                        >
                          {p.name}{" "}
                          <span className="font-mono text-[11px] text-muted-foreground">(#{p.id})</span>
                        </span>
                        <span className="block font-mono text-[10.5px] text-muted-foreground">
                          {(p as { source_type?: string }).source_type ?? (p.github_url ? "GitHub" : "ZIP Archive")}
                        </span>
                      </span>
                      {active && <Check className="w-3.5 h-3.5 text-[#00e5ff]" />}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </section>

      {/* REPOSITORY WORKSPACE CONTAINER */}
      {isLoadingProjects ? (
        <div
          className="relative mt-8 rounded-2xl border border-white/[0.07] bg-[#070910]/80 backdrop-blur-xl p-16 flex items-center justify-center text-center reveal"
          style={{ "--d": "180ms" } as React.CSSProperties}
        >
          <RefreshCw className="w-6 h-6 animate-spin text-[#00e5ff]" />
          <span className="ml-3 font-mono text-xs text-muted-foreground">Loading project list…</span>
        </div>
      ) : errorLoadingProjects ? (
        <div
          className="relative mt-8 rounded-2xl border border-rose-900/50 bg-rose-950/20 p-6 font-mono text-xs text-rose-300 reveal"
          style={{ "--d": "180ms" } as React.CSSProperties}
        >
          <p className="font-bold text-rose-200">Failed to load projects</p>
          <p className="mt-1 text-muted-foreground">{errorLoadingProjects}</p>
        </div>
      ) : !activeProjectId ? (
        <div
          className="relative mt-8 rounded-2xl border border-white/[0.07] bg-[#070910]/80 backdrop-blur-xl py-20 px-6 text-center reveal"
          style={{ "--d": "180ms" } as React.CSSProperties}
        >
          <div className="relative mx-auto w-14 h-14 rounded-2xl border border-white/10 bg-[#0a0d16] flex items-center justify-center">
            <FolderGit2 className="w-6 h-6 text-muted-foreground" />
          </div>
          <h2 className="mt-4 font-sans text-lg font-bold text-white">No Project Selected</h2>
          <p className="mx-auto mt-1.5 max-w-sm font-mono text-xs text-muted-foreground">
            Please choose an active project using the project context selector above to explore its repository.
          </p>
        </div>
      ) : (
        <section
          className="relative mt-8 rounded-2xl border border-white/[0.07] overflow-hidden bg-[#070910]/80 backdrop-blur-xl shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)] reveal"
          style={{ "--d": "180ms" } as React.CSSProperties}
        >
          <div className="absolute inset-x-0 top-0 h-px cg-hairline z-10" />
          <div className="grid grid-cols-1 md:grid-cols-[230px_1fr] lg:grid-cols-[280px_1fr] md:h-[min(72vh,720px)] md:min-h-[520px]">
            {/* File Tree Explorer Panel */}
            <RepositoryTree
              files={files}
              selectedFileId={selectedFile?.id ?? null}
              isLoading={isLoadingWorkspace}
              onSelectFile={(file) => void handleSelectFile(file)}
              onRefresh={handleRefresh}
              projectName={currentProject?.name ?? ""}
            />

            {/* Code Preview Panel */}
            <CodeViewer
              file={fileContent}
              isLoading={isLoadingFile}
              error={fileError || workspaceError}
              highlightRange={highlightRange}
              onClearHighlight={handleClearHighlight}
              projectName={currentProject?.name ?? ""}
              fileCount={files.length}
            />
          </div>
        </section>
      )}
    </div>
  );
}

export default function RepositoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-72 items-center justify-center rounded-xl border border-white/[0.07] bg-[#070910]/80">
          <RefreshCw className="w-6 h-6 animate-spin text-[#00e5ff]" />
          <span className="ml-3 font-mono text-xs text-muted-foreground">Loading workspace…</span>
        </div>
      }
    >
      <RepositoryPageInner />
    </Suspense>
  );
}
