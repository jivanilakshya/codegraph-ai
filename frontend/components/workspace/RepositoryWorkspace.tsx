"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { AnalysisPanel } from "@/components/workspace/AnalysisPanel";
import { CodeViewer } from "@/components/workspace/CodeViewer";
import { ConsolePanel } from "@/components/workspace/ConsolePanel";
import { RepositoryTree } from "@/components/workspace/RepositoryTree";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { parseSourceLocation, type HighlightRange } from "@/lib/navigation";
import { getFileContent, getRepositoryWorkspace } from "@/services/workspace";
import type { FileContent, RepositoryFile, RepositoryWorkspace } from "@/types/workspace";

type RepositoryWorkspaceProps = { projectId: number };

export function RepositoryWorkspace({ projectId }: RepositoryWorkspaceProps) {
  const searchParams = useSearchParams();
  const [workspace, setWorkspace] = useState<RepositoryWorkspace | null>(null);
  const [selectedFile, setSelectedFile] = useState<RepositoryFile | null>(null);
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [highlightRange, setHighlightRange] = useState<HighlightRange | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [consoleMessages, setConsoleMessages] = useState(["Workspace Ready"]);

  const processedLocationRef = useRef<string | null>(null);

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

  useEffect(() => {
    localStorage.setItem("activeProjectId", String(projectId));
    if (workspace?.name) {
      localStorage.setItem("activeProjectName", workspace.name);
    }
  }, [projectId, workspace]);

  const loadFileContent = useCallback(
    async (file: RepositoryFile, range?: HighlightRange | null) => {
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
        setConsoleMessages((messages) => [...messages, `Opened ${file.path}`].slice(-4));
      } catch (error) {
        setFileError(error instanceof Error ? error.message : "Could not load this file.");
      } finally {
        setIsLoadingFile(false);
      }
    },
    [projectId]
  );

  useEffect(() => {
    if (!workspace?.files || workspace.files.length === 0) return;

    const sourceLoc = parseSourceLocation(searchParams);
    if (!sourceLoc || (sourceLoc.fileId == null && !sourceLoc.filePath)) {
      return;
    }

    const locationKey = `${projectId}-${sourceLoc.fileId ?? ""}-${sourceLoc.filePath ?? ""}-${sourceLoc.startLine ?? ""}-${sourceLoc.endLine ?? ""}`;
    if (processedLocationRef.current === locationKey) {
      return;
    }

    let targetFile: RepositoryFile | undefined;

    if (sourceLoc.fileId != null) {
      targetFile = workspace.files.find((f) => f.id === sourceLoc.fileId);
    }

    if (!targetFile && sourceLoc.filePath) {
      const normalizedPath = sourceLoc.filePath.replace(/\\/g, "/").toLowerCase();
      targetFile = workspace.files.find((f) => {
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

      void loadFileContent(targetFile, range);
    }
  }, [workspace?.files, searchParams, projectId, loadFileContent]);

  const handleSelectFile = async (file: RepositoryFile) => {
    processedLocationRef.current = null;
    await loadFileContent(file, null);
  };

  const handleClearHighlight = () => {
    setHighlightRange(null);
  };

  const currentFile = selectedFile?.path ?? null;
  return (
    <WorkspaceLayout
      projectName={workspace?.name ?? `Project #${projectId}`}
      currentFile={currentFile}
      onRefresh={() => {
        processedLocationRef.current = null;
        void loadWorkspace();
      }}
      tree={
        <RepositoryTree
          files={workspace?.files ?? []}
          selectedFileId={selectedFile?.id ?? null}
          isLoading={isLoadingWorkspace}
          onSelectFile={(file) => void handleSelectFile(file)}
          onRefresh={() => {
            processedLocationRef.current = null;
            void loadWorkspace();
          }}
        />
      }
      viewer={
        workspaceError ? (
          <CodeViewer file={null} isLoading={false} error={workspaceError} />
        ) : (
          <CodeViewer
            file={fileContent}
            isLoading={isLoadingFile}
            error={fileError}
            highlightRange={highlightRange}
            onClearHighlight={handleClearHighlight}
          />
        )
      }
      analysis={
        <AnalysisPanel
          projectId={projectId}
          selectedFileId={selectedFile?.id ?? null}
          selectedFileName={selectedFile?.path ?? null}
          sourceText={fileContent && fileContent.id === selectedFile?.id ? fileContent.content : null}
        />
      }
      console={<ConsolePanel messages={consoleMessages} />}
    />
  );
}
