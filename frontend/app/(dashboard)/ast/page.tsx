"use client";

import { RefreshCw } from "lucide-react";
import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { ASTDetails } from "@/components/analysis/ASTDetails";
import { ASTSearch } from "@/components/analysis/ASTSearch";
import { ASTToolbar } from "@/components/analysis/ASTToolbar";
import { ASTTree, getAstMetrics, getAstSearchMatchCount } from "@/components/analysis/ASTTree";
import { ProjectSelector } from "@/components/developer/ProjectSelector";
import { RepositoryTree } from "@/components/workspace/RepositoryTree";
import { useActiveProject } from "@/hooks/useActiveProject";
import { getFileContent, getRepositoryWorkspace, getFileAnalysis } from "@/services/workspace";
import type { AstNodeData, FileAnalysis, RepositoryFile } from "@/types/workspace";

// Example mock AST for visual empty state
const mockEmptyAst: AstNodeData = {
  type: "module",
  is_named: true,
  start_byte: 0,
  end_byte: 120,
  start_point: { row: 0, column: 0 },
  end_point: { row: 11, column: 0 },
  children: [
    {
      type: "import_statement",
      is_named: true,
      start_byte: 0,
      end_byte: 18,
      start_point: { row: 0, column: 0 },
      end_point: { row: 0, column: 18 },
      children: [
        {
          type: "identifier",
          is_named: true,
          start_byte: 7,
          end_byte: 14,
          start_point: { row: 0, column: 7 },
          end_point: { row: 0, column: 14 },
          children: [],
        },
      ],
    },
    {
      type: "function_definition",
      is_named: true,
      start_byte: 20,
      end_byte: 85,
      start_point: { row: 3, column: 0 },
      end_point: { row: 7, column: 0 },
      children: [
        {
          type: "identifier",
          is_named: true,
          start_byte: 24,
          end_byte: 34,
          start_point: { row: 3, column: 4 },
          end_point: { row: 3, column: 14 },
          children: [],
        },
        {
          type: "parameters",
          is_named: true,
          start_byte: 35,
          end_byte: 48,
          start_point: { row: 3, column: 15 },
          end_point: { row: 3, column: 28 },
          children: [],
        },
        {
          type: "block",
          is_named: true,
          start_byte: 50,
          end_byte: 85,
          start_point: { row: 4, column: 4 },
          end_point: { row: 7, column: 0 },
          children: [],
        },
      ],
    },
    {
      type: "class_definition",
      is_named: true,
      start_byte: 87,
      end_byte: 120,
      start_point: { row: 9, column: 0 },
      end_point: { row: 11, column: 0 },
      children: [
        {
          type: "identifier",
          is_named: true,
          start_byte: 93,
          end_byte: 104,
          start_point: { row: 9, column: 6 },
          end_point: { row: 9, column: 17 },
          children: [],
        },
      ],
    },
  ],
};

const mockSourceText = `import cycle_c\n\ndef function_a(user_id, data):\n    return cycle_c()\n\nclass UserService:\n    pass`;

function AstPageInner() {
  const { projects, activeProjectId, isLoadingProjects, errorLoadingProjects, selectProject } =
    useActiveProject();

  const [files, setFiles] = useState<RepositoryFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<RepositoryFile | null>(null);
  const [analysis, setAnalysis] = useState<FileAnalysis | null>(null);
  const [sourceText, setSourceText] = useState<string | null>(null);

  // Selected node state
  const [selectedNode, setSelectedNode] = useState<AstNodeData | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState("0");

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
    setSelectedNode(null);
    setSelectedNodeId("0");
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
    if (activeProjectId) void loadWorkspace();
  }, [activeProjectId, loadWorkspace, refreshTrigger]);

  const loadAnalysis = useCallback(async () => {
    if (!activeProjectId || !selectedFile) return;
    setIsLoadingAnalysis(true);
    setAnalysisError(null);
    void analysisRefresh;
    try {
      const [analysisData, fileContent] = await Promise.all([
        getFileAnalysis(selectedFile.id),
        getFileContent(activeProjectId, selectedFile.id).catch(() => null),
      ]);
      setAnalysis(analysisData);
      setSourceText(fileContent ? fileContent.content : null);
      setSelectedNode(analysisData.ast);
      setSelectedNodeId("0");
    } catch (error) {
      setAnalysisError(
        error instanceof Error ? error.message : "Could not load AST for this file."
      );
    } finally {
      setIsLoadingAnalysis(false);
    }
  }, [activeProjectId, selectedFile, analysisRefresh]);

  useEffect(() => {
    if (selectedFile) void loadAnalysis();
  }, [selectedFile, loadAnalysis]);

  const handleSelectNode = useCallback((node: AstNodeData, id: string) => {
    setSelectedNode(node);
    setSelectedNodeId(id);
  }, []);

  const astMetrics = useMemo(() => {
    if (!analysis) return { nodeCount: 0, maximumDepth: 0 };
    return getAstMetrics(analysis.ast);
  }, [analysis]);

  const astSearchMatchCount = useMemo(() => {
    if (!analysis) return 0;
    return getAstSearchMatchCount(analysis.ast, searchTerm, sourceText);
  }, [analysis, searchTerm, sourceText]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-0 h-full overflow-hidden bg-[#000000]">
      {/* ── Page Header ── */}
      <header className="relative z-20 shrink-0 border-b border-[#242424] bg-[#050505] px-6 py-4">
        <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#737373]">
          CODEGRAPH AI &nbsp;/&nbsp; STRUCTURAL ANALYSIS
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Abstract Syntax Tree
            </h1>
            <p className="mt-0.5 text-[13px] text-[#A3A3A3]">
              Inspect how CodeGraph AI understands the structure of your source code.
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
              Select an active project from the dropdown above to view AST trees.
            </p>
          </div>
        </div>
      ) : (
        /* 3-Column Container: Left File Explorer | Center Visual AST Canvas | Right Node Details */
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* LEFT COLUMN: File Explorer */}
          <RepositoryTree
            files={files}
            selectedFileId={selectedFile?.id ?? null}
            isLoading={isLoadingWorkspace}
            onSelectFile={(f) => {
              setSelectedFile(f);
              setSearchTerm("");
            }}
            onRefresh={() => setRefreshTrigger((p) => p + 1)}
            className="w-[250px] shrink-0 border-r border-[#242424] bg-[#050505]"
          />

          {/* CENTER COLUMN: Interactive AST Canvas */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#050505] relative min-w-0">
            {workspaceError ? (
              <div className="flex flex-1 items-center justify-center p-6 text-center font-mono text-xs text-[#737373]">
                <p>{workspaceError}</p>
              </div>
            ) : !selectedFile ? (
              /* Intentional Visual Example Tree for Empty State */
              <div className="flex flex-1 flex-col min-h-0 overflow-hidden relative">
                <div className="absolute inset-x-0 top-3 z-10 text-center pointer-events-none">
                  <span className="inline-block rounded-md border border-[#292929] bg-[#080808]/90 px-3 py-1 font-mono text-[11px] font-medium text-[#E5E5E5] shadow-lg backdrop-blur">
                    Select a file from Explorer to inspect its AST
                  </span>
                </div>
                <ASTTree
                  ast={mockEmptyAst}
                  searchTerm=""
                  sourceText={mockSourceText}
                  filePath="example.py"
                  selectedNode={mockEmptyAst}
                  selectedNodeId="0"
                  onSelectNode={() => {}}
                />
              </div>
            ) : isLoadingAnalysis ? (
              <div className="flex flex-1 items-center justify-center gap-2 font-mono text-xs text-[#737373]">
                <RefreshCw className="size-4 animate-spin text-[#A3A3A3]" />
                <span>Parsing source file structure…</span>
              </div>
            ) : analysisError ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center font-mono text-xs">
                <p className="text-white font-medium">Unable to parse file AST</p>
                <p className="text-[#737373]">{analysisError}</p>
                <button
                  type="button"
                  onClick={() => setAnalysisRefresh((p) => p + 1)}
                  className="rounded border border-[#292929] bg-[#080808] px-3 py-1.5 text-[#A3A3A3] hover:border-[#555555] hover:text-white transition-all"
                >
                  Retry Parse
                </button>
              </div>
            ) : analysis ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <ASTToolbar
                  nodeCount={astMetrics.nodeCount}
                  maximumDepth={astMetrics.maximumDepth}
                  isParsing={isLoadingAnalysis}
                  onRefresh={() => setAnalysisRefresh((p) => p + 1)}
                />
                <ASTSearch
                  value={searchTerm}
                  matchCount={astSearchMatchCount}
                  onChange={setSearchTerm}
                />
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden relative">
                  <ASTTree
                    ast={analysis.ast}
                    searchTerm={searchTerm}
                    sourceText={sourceText}
                    projectId={activeProjectId}
                    fileId={selectedFile?.id}
                    filePath={selectedFile?.path}
                    selectedNode={selectedNode}
                    selectedNodeId={selectedNodeId}
                    onSelectNode={handleSelectNode}
                  />
                </div>
              </div>
            ) : null}
          </div>

          {/* RIGHT COLUMN: Node Details / Source Inspector */}
          <ASTDetails
            node={selectedNode}
            nodeId={selectedNodeId}
            sourceText={sourceText}
            projectId={activeProjectId}
            fileId={selectedFile?.id}
            filePath={selectedFile?.path}
            className="w-[280px] lg:w-[300px] shrink-0 border-l border-[#242424] bg-[#080808] hidden lg:flex flex-col h-full overflow-y-auto"
          />
        </div>
      )}
    </div>
  );
}

export default function AstPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center gap-2 font-mono text-xs text-[#737373]">
          <RefreshCw className="size-4 animate-spin text-[#A3A3A3]" />
          <span>Loading AST workspace…</span>
        </div>
      }
    >
      <AstPageInner />
    </Suspense>
  );
}
