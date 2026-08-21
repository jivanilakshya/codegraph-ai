"use client";

import { RefreshCw, TreePine } from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { ASTSearch } from "@/components/analysis/ASTSearch";
import { ASTToolbar } from "@/components/analysis/ASTToolbar";
import { ASTTree, getAstMetrics, getAstSearchMatchCount } from "@/components/analysis/ASTTree";
import { ProjectSelector } from "@/components/developer/ProjectSelector";
import { PageHeader } from "@/components/ui/PageHeader";
import { RepositoryTree } from "@/components/workspace/RepositoryTree";
import { useActiveProject } from "@/hooks/useActiveProject";
import { getFileContent, getRepositoryWorkspace, getFileAnalysis } from "@/services/workspace";
import type { FileAnalysis } from "@/types/workspace";
import type { RepositoryFile } from "@/types/workspace";

function AstPageInner() {
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
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [analysisRefresh, setAnalysisRefresh] = useState(0);

  const loadWorkspace = useCallback(async () => {
    if (!activeProjectId) return;
    setIsLoadingWorkspace(true);
    setWorkspaceError(null);
    setSelectedFile(null);
    setAnalysis(null);
    setSourceText(null);
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
    if (!activeProjectId || !selectedFile) return;
    setIsLoadingAnalysis(true);
    setAnalysisError(null);
    
    // Explicitly reference analysisRefresh to satisfy eslint rules
    void analysisRefresh;

    try {
      const [analysisData, fileContent] = await Promise.all([
        getFileAnalysis(selectedFile.id),
        getFileContent(activeProjectId, selectedFile.id).catch(() => null),
      ]);
      setAnalysis(analysisData);
      setSourceText(fileContent ? fileContent.content : null);
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "Could not load AST for this file.");
    } finally {
      setIsLoadingAnalysis(false);
    }
  }, [activeProjectId, selectedFile, analysisRefresh]);

  useEffect(() => {
    if (selectedFile) {
      void loadAnalysis();
    }
  }, [selectedFile, loadAnalysis]);

  const astMetrics = useMemo(() => {
    if (!analysis) return { nodeCount: 0, maximumDepth: 0 };
    return getAstMetrics(analysis.ast);
  }, [analysis]);

  const astSearchMatchCount = useMemo(() => {
    if (!analysis) return 0;
    return getAstSearchMatchCount(analysis.ast, searchTerm, sourceText);
  }, [analysis, searchTerm, sourceText]);

  const handleRefreshWorkspace = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleRefreshAnalysis = () => {
    setAnalysisRefresh((prev) => prev + 1);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <PageHeader title="AST" description="Inspect abstract syntax trees and structural code insights." />
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
          <TreePine className="size-12 text-slate-600" />
          <h2 className="mt-4 text-lg font-semibold text-slate-300">No Project Selected</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Please choose an active project using the dropdown selector above to parse files and view ASTs.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-0 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
          <RepositoryTree
            files={files}
            selectedFileId={selectedFile?.id ?? null}
            isLoading={isLoadingWorkspace}
            onSelectFile={setSelectedFile}
            onRefresh={handleRefreshWorkspace}
            className="border-b border-slate-800 lg:border-b-0 lg:border-r h-[600px]"
          />
          <div className="flex flex-col h-[600px] overflow-hidden bg-[#080d14]">
            {workspaceError ? (
              <div className="flex h-full items-center justify-center p-6 text-center">
                <p className="text-sm text-rose-300">{workspaceError}</p>
              </div>
            ) : !selectedFile ? (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <TreePine className="size-8 text-slate-600 animate-pulse" />
                <h2 className="mt-3 font-medium text-slate-300">Select a file to parse</h2>
                <p className="mt-1 text-sm text-slate-500">Choose a file from the explorer to see its AST.</p>
              </div>
            ) : isLoadingAnalysis ? (
              <div className="flex h-full items-center justify-center p-6 text-center">
                <RefreshCw className="size-6 animate-spin text-cyan-400" />
                <span className="ml-2 text-sm text-slate-400">Parsing source file...</span>
              </div>
            ) : analysisError ? (
              <div className="flex h-full items-center justify-center p-6 text-center">
                <p className="text-sm text-rose-300">{analysisError}</p>
              </div>
            ) : analysis ? (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="shrink-0">
                  <ASTToolbar
                    nodeCount={astMetrics.nodeCount}
                    maximumDepth={astMetrics.maximumDepth}
                    isParsing={isLoadingAnalysis}
                    onRefresh={handleRefreshAnalysis}
                  />
                  <ASTSearch
                    value={searchTerm}
                    matchCount={astSearchMatchCount}
                    onChange={setSearchTerm}
                  />
                </div>
                <div className="flex-1 overflow-auto min-h-0">
                  <ASTTree
                    ast={analysis.ast}
                    searchTerm={searchTerm}
                    sourceText={sourceText}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AstPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="size-6 animate-spin text-cyan-400" />
          <span className="ml-2 text-sm text-slate-400">Loading AST workspace...</span>
        </div>
      }
    >
      <AstPageInner />
    </Suspense>
  );
}
