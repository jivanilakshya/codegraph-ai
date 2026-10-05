"use client";

import { GitFork, RefreshCw } from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { RelationshipDetails } from "@/components/analysis/RelationshipDetails";
import { RelationshipList } from "@/components/analysis/RelationshipList";
import { ProjectSelector } from "@/components/developer/ProjectSelector";
import { RepositoryTree } from "@/components/workspace/RepositoryTree";
import { useActiveProject } from "@/hooks/useActiveProject";
import { getRepositoryWorkspace, getFileAnalysis } from "@/services/workspace";
import type { FileAnalysis, FileRelationship, RepositoryFile } from "@/types/workspace";

function RelationshipsPageInner() {
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
  const [selectedRelationship, setSelectedRelationship] = useState<FileRelationship | null>(null);

  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const loadWorkspace = useCallback(async () => {
    if (!activeProjectId) return;
    setIsLoadingWorkspace(true);
    setWorkspaceError(null);
    setSelectedFile(null);
    setAnalysis(null);
    setSelectedRelationship(null);
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

  const loadAnalysis = useCallback(async () => {
    if (!selectedFile) return;
    setIsLoadingAnalysis(true);
    setAnalysisError(null);
    setSelectedRelationship(null);
    try {
      const analysisData = await getFileAnalysis(selectedFile.id);
      setAnalysis(analysisData);
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "Could not load relationships for this file.");
    } finally {
      setIsLoadingAnalysis(false);
    }
  }, [selectedFile]);

  useEffect(() => {
    if (selectedFile) {
      void loadAnalysis();
    }
  }, [selectedFile, loadAnalysis]);

  // Summary counts
  const summary = useMemo(() => {
    if (!analysis?.relationships.length) return null;
    const imports = analysis.relationships.filter((r) => r.relationship === "IMPORTS").length;
    const calls = analysis.relationships.filter((r) => r.relationship === "CALLS").length;
    const others = analysis.relationships.length - imports - calls;
    const parts: string[] = [];
    if (imports) parts.push(`${imports} Import${imports !== 1 ? "s" : ""}`);
    if (calls) parts.push(`${calls} Call${calls !== 1 ? "s" : ""}`);
    if (others) parts.push(`${others} Other${others !== 1 ? "s" : ""}`);
    return parts.join(" · ");
  }, [analysis?.relationships]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-0 h-full overflow-hidden bg-[#000000]">
      {/* ── Page Header ── */}
      <header className="relative z-20 shrink-0 border-b border-[#242424] bg-[#050505] px-6 py-4">
        <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#737373]">
          CODEGRAPH AI&nbsp;/&nbsp;CODE ANALYSIS
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Relationships
            </h1>
            <p className="mt-0.5 text-[13px] text-[#A3A3A3]">
              {summary
                ? summary
                : "Understand dependencies and connections across your codebase."}
            </p>
          </div>
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
              Select an active project from the dropdown above to browse its relationships.
            </p>
          </div>
        </div>
      ) : (
        /* 3-Column: Left File Explorer | Center Relationship Browser | Right Details Inspector */
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* LEFT COLUMN: File Explorer */}
          <RepositoryTree
            files={files}
            selectedFileId={selectedFile?.id ?? null}
            isLoading={isLoadingWorkspace}
            onSelectFile={(f) => {
              setSelectedFile(f);
              setSelectedRelationship(null);
            }}
            onRefresh={() => setRefreshTrigger((p) => p + 1)}
            className="w-[270px] shrink-0 border-r border-[#242424] bg-[#050505]"
          />

          {/* CENTER COLUMN: Relationship Browser */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#050505] relative min-w-0">
            {workspaceError ? (
              <div className="flex flex-1 items-center justify-center p-6 text-center font-mono text-xs text-[#737373]">
                <p>{workspaceError}</p>
              </div>
            ) : !selectedFile ? (
              /* Empty state — no file chosen */
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center font-mono">
                <GitFork className="size-8 text-[#2A2A2A] mb-3" />
                <p className="text-sm text-white font-medium">Select a file to view relationships</p>
                <p className="mt-1 text-xs text-[#737373]">
                  Choose a file from the explorer to see its IMPORTS and CALLS connections.
                </p>
              </div>
            ) : isLoadingAnalysis ? (
              <div className="flex flex-1 items-center justify-center gap-2 font-mono text-xs text-[#737373]">
                <RefreshCw className="size-4 animate-spin text-[#A3A3A3]" />
                <span>Extracting relationships…</span>
              </div>
            ) : analysisError ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center font-mono text-xs">
                <p className="text-white font-medium">Unable to extract relationships</p>
                <p className="text-[#737373]">{analysisError}</p>
              </div>
            ) : analysis ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {/* Center toolbar / file context bar */}
                <div className="shrink-0 border-b border-[#1C1C1C] bg-[#080808] px-4 py-2.5 flex items-center justify-between select-none">
                  <div className="flex items-center gap-2 min-w-0">
                    <GitFork className="size-3.5 shrink-0 text-[#555555]" />
                    <span className="font-mono text-[11px] text-[#737373] truncate">
                      {selectedFile.path}
                    </span>
                  </div>
                  {summary && (
                    <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-wider text-[#555555] ml-4">
                      {summary}
                    </span>
                  )}
                </div>

                {/* Scrollable relationship list */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  {analysis.relationships.length > 0 ? (
                    <RelationshipList
                      relationships={analysis.relationships}
                      selectedRelationship={selectedRelationship}
                      onSelectRelationship={setSelectedRelationship}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center p-6 text-center font-mono">
                      <div>
                        <p className="text-sm text-white font-medium">No relationships found</p>
                        <p className="mt-1 text-xs text-[#737373]">
                          This file has no recorded IMPORTS or CALLS connections.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* RIGHT COLUMN: Relationship Details Inspector */}
          <RelationshipDetails
            relationship={selectedRelationship}
            analysis={analysis}
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

export default function RelationshipsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center gap-2 font-mono text-xs text-[#737373]">
          <RefreshCw className="size-4 animate-spin text-[#A3A3A3]" />
          <span>Loading relationships workspace…</span>
        </div>
      }
    >
      <RelationshipsPageInner />
    </Suspense>
  );
}
