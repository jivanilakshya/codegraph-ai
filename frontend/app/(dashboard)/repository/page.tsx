"use client";

import { FolderGit2, RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

import { ProjectSelector } from "@/components/developer/ProjectSelector";
import { RepositoryTree } from "@/components/workspace/RepositoryTree";
import { CodeViewer } from "@/components/workspace/CodeViewer";
import { useActiveProject } from "@/hooks/useActiveProject";
import { parseSourceLocation, type HighlightRange } from "@/lib/navigation";
import { getFileContent, getRepositoryWorkspace } from "@/services/workspace";
import type { FileContent, RepositoryFile } from "@/types/workspace";

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

  // Keep track of the last processed source location to avoid re-triggering
  const processedLocationRef = useRef<string | null>(null);

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
    <div className="relative space-y-6 text-white selection:bg-white selection:text-black">
      {/* Subtle Ambient Background Light Source */}
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(255,255,255,0.035),transparent)]"
        aria-hidden="true"
      />

      <style>{`
        @keyframes repoEntrance {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .repo-stagger {
          opacity: 0;
          animation: repoEntrance 450ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .repo-stagger {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* Header & Project Selector (Stagger 0ms) */}
      <div
        className="repo-stagger relative z-10 flex flex-col gap-6 border-b border-[#202020] pb-6 md:flex-row md:items-end md:justify-between"
        style={{ animationDelay: "0ms" }}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#A3A3A3] bg-[#151515] border border-[#303030] px-2 py-0.5 rounded flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-white animate-pulse" />
              Codebase Explorer
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            REPOSITORY
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#A3A3A3]">
            Explore the files and structure of your active codebase.
          </p>
        </div>

        <div className="w-full md:w-80">
          <ProjectSelector
            projects={projects}
            selectedProjectId={activeProjectId}
            onSelect={(id) => {
              processedLocationRef.current = null;
              selectProject(id);
            }}
          />
        </div>
      </div>

      {/* Repository Main Panel Content (Staggered) */}
      {isLoadingProjects ? (
        <div className="repo-stagger flex h-72 items-center justify-center rounded-xl border border-[#202020] bg-[#080808]" style={{ animationDelay: "80ms" }}>
          <RefreshCw className="size-6 animate-spin text-white" />
          <span className="ml-3 font-mono text-xs text-[#A3A3A3]">Loading project list...</span>
        </div>
      ) : errorLoadingProjects ? (
        <div className="repo-stagger rounded-xl border border-rose-900/50 bg-rose-950/20 p-6 text-xs font-mono text-rose-300" style={{ animationDelay: "80ms" }}>
          <p className="font-bold text-rose-200">Failed to load projects</p>
          <p className="mt-1 text-[#A3A3A3]">{errorLoadingProjects}</p>
        </div>
      ) : !activeProjectId ? (
        <div className="repo-stagger flex flex-col items-center justify-center rounded-xl border border-[#242424] bg-[#080808] py-20 text-center" style={{ animationDelay: "80ms" }}>
          <FolderGit2 className="size-12 text-[#737373]" />
          <h2 className="mt-4 font-sans text-lg font-bold text-white">No Project Selected</h2>
          <p className="mx-auto mt-1.5 max-w-sm font-mono text-xs text-[#A3A3A3]">
            Please choose an active project using the project context selector above to explore its repository.
          </p>
        </div>
      ) : (
        <div
          className="repo-stagger grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-0 rounded-xl border border-[#242424] bg-[#080808] overflow-hidden shadow-2xl transition-all duration-300 hover:border-[#383838]"
          style={{ animationDelay: "120ms" }}
        >
          {/* File Tree Panel */}
          <RepositoryTree
            files={files}
            selectedFileId={selectedFile?.id ?? null}
            isLoading={isLoadingWorkspace}
            onSelectFile={(file) => void handleSelectFile(file)}
            onRefresh={handleRefresh}
            className="border-b border-[#202020] lg:border-b-0 lg:border-r h-[720px] lg:h-[750px]"
          />

          {/* Code Viewer Panel */}
          <div className="flex flex-col h-[720px] lg:h-[750px] overflow-hidden bg-[#050505]">
            {workspaceError ? (
              <CodeViewer file={null} isLoading={false} error={workspaceError} />
            ) : (
              <CodeViewer
                file={fileContent}
                isLoading={isLoadingFile}
                error={fileError}
                highlightRange={highlightRange}
                onClearHighlight={handleClearHighlight}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RepositoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-72 items-center justify-center rounded-xl border border-[#202020] bg-[#080808]">
          <RefreshCw className="size-6 animate-spin text-white" />
          <span className="ml-3 font-mono text-xs text-[#A3A3A3]">Loading workspace...</span>
        </div>
      }
    >
      <RepositoryPageInner />
    </Suspense>
  );
}

