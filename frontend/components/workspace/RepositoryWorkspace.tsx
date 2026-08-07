"use client";

import { useCallback, useEffect, useState } from "react";

import { AnalysisPanel } from "@/components/workspace/AnalysisPanel";
import { CodeViewer } from "@/components/workspace/CodeViewer";
import { ConsolePanel } from "@/components/workspace/ConsolePanel";
import { RepositoryTree } from "@/components/workspace/RepositoryTree";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { getFileContent, getRepositoryWorkspace } from "@/services/workspace";
import type { FileContent, RepositoryFile, RepositoryWorkspace } from "@/types/workspace";

type RepositoryWorkspaceProps = { projectId: number };

export function RepositoryWorkspace({ projectId }: RepositoryWorkspaceProps) {
  const [workspace, setWorkspace] = useState<RepositoryWorkspace | null>(null);
  const [selectedFile, setSelectedFile] = useState<RepositoryFile | null>(null);
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [consoleMessages, setConsoleMessages] = useState(["Workspace Ready"]);

  const loadWorkspace = useCallback(async () => {
    setIsLoadingWorkspace(true);
    setWorkspaceError(null);
    try {
      const response = await getRepositoryWorkspace(projectId);
      setWorkspace(response);
      setConsoleMessages((messages) => [...messages, `Repository Loaded (${response.files.length} files)`].slice(-4));
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Could not load the repository.");
    } finally {
      setIsLoadingWorkspace(false);
    }
  }, [projectId]);

  useEffect(() => { void loadWorkspace(); }, [loadWorkspace]);

  const handleSelectFile = async (file: RepositoryFile) => {
    setSelectedFile(file);
    setFileContent(null);
    setFileError(null);
    setIsLoadingFile(true);
    try {
      const response = await getFileContent(projectId, file.id);
      setFileContent(response);
      setConsoleMessages((messages) => [...messages, `Opened ${file.path}`].slice(-4));
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Could not load this file.");
    } finally {
      setIsLoadingFile(false);
    }
  };

  const currentFile = selectedFile?.path ?? null;
  return <WorkspaceLayout projectName={workspace?.name ?? `Project #${projectId}`} currentFile={currentFile} onRefresh={() => void loadWorkspace()} tree={<RepositoryTree files={workspace?.files ?? []} selectedFileId={selectedFile?.id ?? null} isLoading={isLoadingWorkspace} onSelectFile={(file) => void handleSelectFile(file)} onRefresh={() => void loadWorkspace()} />} viewer={workspaceError ? <CodeViewer file={null} isLoading={false} error={workspaceError} /> : <CodeViewer file={fileContent} isLoading={isLoadingFile} error={fileError} />} analysis={<AnalysisPanel selectedFileId={selectedFile?.id ?? null} selectedFileName={selectedFile?.path ?? null} sourceText={fileContent && fileContent.id === selectedFile?.id ? fileContent.content : null} />} console={<ConsolePanel messages={consoleMessages} />} />;
}
