"use client";

import { FolderGit2, RefreshCw } from "lucide-react";
import { Suspense, useCallback, useEffect, useState } from "react";

import { ProjectSelector } from "@/components/developer/ProjectSelector";
import { PageHeader } from "@/components/ui/PageHeader";
import { RepositoryTree } from "@/components/workspace/RepositoryTree";
import { CodeViewer } from "@/components/workspace/CodeViewer";
import { useActiveProject } from "@/hooks/useActiveProject";
import { getFileContent, getRepositoryWorkspace } from "@/services/workspace";
import type { FileContent, RepositoryFile } from "@/types/workspace";

function RepositoryPageInner() {
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
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const loadWorkspace = useCallback(async () => {
    if (!activeProjectId) return;
    setIsLoadingWorkspace(true);
    setWorkspaceError(null);
    setSelectedFile(null);
    setFileContent(null);
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

  const handleSelectFile = async (file: RepositoryFile) => {
    if (!activeProjectId) return;
    setSelectedFile(file);
    setFileContent(null);
    setFileError(null);
    setIsLoadingFile(true);
    try {
      const response = await getFileContent(activeProjectId, file.id);
      setFileContent(response);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Could not load this file.");
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <PageHeader title="Repository" description="Browse repository structure, files, and source code." />
        <div className="w-full md:w-80">
          <ProjectSelector
            projects={projects}
            selectedProjectId={activeProjectId}
            onSelect={selectProject}
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
              <CodeViewer file={fileContent} isLoading={isLoadingFile} error={fileError} />
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
