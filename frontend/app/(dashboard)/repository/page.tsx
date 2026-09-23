"use client";

import { FolderGit2, RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

import { ProjectSelector } from "@/components/developer/ProjectSelector";
import { PageHeader } from "@/components/ui/PageHeader";
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
      // File could not be found
      setFileError(
        `Requested file ${sourceLoc.filePath ? `"${sourceLoc.filePath}"` : `(ID #${sourceLoc.fileId})`} was not found in this project.`
      );
    }
  }, [activeProjectId, files, searchParams, loadFileContent]);

  // When user manually clicks a file in the tree, clear existing highlight
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
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <PageHeader title="Repository" description="Browse repository structure, files, and source code." />
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

      {isLoadingProjects ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="size-6 animate-spin text-cyan-400" />
          <span className="ml-2 text-sm text-slate-400">Loading project list...</span>
        </div>
      ) : errorLoadingProjects ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-200">
          <p className="font-semibold text-rose-100">Failed to load projects</p>
          <p className="mt-1 text-slate-400">{errorLoadingProjects}</p>
        </div>
      ) : !activeProjectId ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-950/40 py-16 text-center">
          <FolderGit2 className="size-12 text-slate-600" />
          <h2 className="mt-4 text-lg font-semibold text-slate-300">No Project Selected</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Please choose an active project using the dropdown selector above to browse its codebase.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-0 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
          <RepositoryTree
            files={files}
            selectedFileId={selectedFile?.id ?? null}
            isLoading={isLoadingWorkspace}
            onSelectFile={(file) => void handleSelectFile(file)}
            onRefresh={handleRefresh}
            className="border-b border-slate-800 lg:border-b-0 lg:border-r h-[600px]"
          />
          <div className="flex flex-col h-[600px] overflow-hidden">
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
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="size-6 animate-spin text-cyan-400" />
          <span className="ml-2 text-sm text-slate-400">Loading workspace...</span>
        </div>
      }
    >
      <RepositoryPageInner />
    </Suspense>
  );
}
