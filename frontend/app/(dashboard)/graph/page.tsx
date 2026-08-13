"use client";

import { AlertCircle, Network, RefreshCw, SearchX } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ProjectSelector } from "@/components/developer/ProjectSelector";
import { GraphCanvas } from "@/components/graph/GraphCanvas";
import { GraphInspector } from "@/components/graph/GraphInspector";
import { GraphToolbar } from "@/components/graph/GraphToolbar";
import { PageHeader } from "@/components/ui/PageHeader";
import { RepositoryTree } from "@/components/workspace/RepositoryTree";
import { getProjectGraph } from "@/services/graph";
import { getProjects } from "@/services/projects";
import { getRepositoryWorkspace } from "@/services/workspace";
import type { CodeGraphNode, GraphNodeType, GraphRelationshipType, ProjectGraph } from "@/types/graph";
import type { Project } from "@/types/project";
import type { RepositoryFile } from "@/types/workspace";

const allNodeTypes = new Set<GraphNodeType>(["file", "function", "class", "variable"]);
const allRelationshipTypes = new Set<GraphRelationshipType>(["IMPORTS", "DECLARES", "CALLS"]);

function toggleValue<T>(values: Set<T>, value: T) {
  const next = new Set(values);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export default function GraphPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [files, setFiles] = useState<RepositoryFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  const [graph, setGraph] = useState<ProjectGraph | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isLoadingGraph, setIsLoadingGraph] = useState(false);
  const [workspaceRefresh, setWorkspaceRefresh] = useState(0);
  const [graphRefresh, setGraphRefresh] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeNodeTypes, setActiveNodeTypes] = useState(allNodeTypes);
  const [activeRelationships, setActiveRelationships] = useState(allRelationshipTypes);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [fitViewRequest, setFitViewRequest] = useState(0);
  const [graphVersion, setGraphVersion] = useState(0);
  const graphRequest = useRef<AbortController | null>(null);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;

  useEffect(() => {
    const controller = new AbortController();
    void getProjects(controller.signal)
      .then((response) => setProjects(response.projects))
      .catch((requestError) => {
        if (!(requestError instanceof DOMException && requestError.name === "AbortError")) {
          setError(requestError instanceof Error ? requestError.message : "Could not load projects.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingProjects(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (projects.length && !projects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) return;
    const controller = new AbortController();
    setIsLoadingFiles(true);
    setError(null);
    void getRepositoryWorkspace(selectedProjectId, controller.signal)
      .then((workspace) => {
        if (controller.signal.aborted) return;
        setFiles(workspace.files);
        setSelectedFileId((current) => {
          if (current !== null && workspace.files.some((file) => file.id === current)) return current;
          return workspace.files[0]?.id ?? null;
        });
      })
      .catch((requestError) => {
        if (!(requestError instanceof DOMException && requestError.name === "AbortError")) {
          setError(requestError instanceof Error ? requestError.message : "Could not load repository files.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingFiles(false);
      });
    return () => controller.abort();
  }, [selectedProjectId, workspaceRefresh]);

  useEffect(() => {
    if (!selectedProjectId) return;
    graphRequest.current?.abort();
    const controller = new AbortController();
    graphRequest.current = controller;
    setIsLoadingGraph(true);
    setError(null);
    setSelectedNodeId(null);
    void getProjectGraph(selectedProjectId, controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) {
          setGraph({ nodes: [...response.nodes], edges: [...response.edges] });
          setGraphVersion((value) => value + 1);
          setFitViewRequest((value) => value + 1);
        }
      })
      .catch((requestError) => {
        if (!(requestError instanceof DOMException && requestError.name === "AbortError")) {
          setError(requestError instanceof Error ? requestError.message : "Could not load project graph.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingGraph(false);
      });
    return () => controller.abort();
  }, [graphRefresh, selectedProjectId]);

  useEffect(() => () => graphRequest.current?.abort(), []);

  const matchingNodeIds = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery || !graph) return new Set<string>();
    return new Set(
      graph.nodes
        .filter((node) => `${node.label} ${node.type}`.toLowerCase().includes(normalizedQuery))
        .map((node) => node.id),
    );
  }, [graph, query]);

  const searchResults = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery || !graph) return [];
    return graph.nodes
      .filter((node) => `${node.label} ${node.type}`.toLowerCase().includes(normalizedQuery))
      .slice(0, 10);
  }, [graph, query]);

  const filteredNodes = useMemo(
    () => graph?.nodes.filter((node) => activeNodeTypes.has(node.type)) ?? [],
    [activeNodeTypes, graph],
  );
  const visibleNodeIds = useMemo(() => new Set(filteredNodes.map((node) => node.id)), [filteredNodes]);
  const filteredEdges = useMemo(
    () =>
      graph?.edges.filter(
        (edge) =>
          activeRelationships.has(edge.type) &&
          visibleNodeIds.has(edge.source) &&
          visibleNodeIds.has(edge.target),
      ) ?? [],
    [activeRelationships, graph, visibleNodeIds],
  );
  const visibleMatchingNodeIds = useMemo(
    () => new Set([...matchingNodeIds].filter((nodeId) => visibleNodeIds.has(nodeId))),
    [matchingNodeIds, visibleNodeIds],
  );
  const nodesById = useMemo(
    () => new Map(graph?.nodes.map((node) => [node.id, node]) ?? []),
    [graph],
  );
  const selectedNode = selectedNodeId ? nodesById.get(selectedNodeId) ?? null : null;

  const handleSelectFile = useCallback((file: RepositoryFile) => {
    setSelectedFileId(file.id);
    setSelectedNodeId(`file_${file.id}`);
  }, []);

  const handleSearchResultSelect = useCallback((node: CodeGraphNode) => {
    setQuery(node.label);
    setSelectedNodeId(node.id);
    if (node.type === "file") {
      const fileId = Number(/^file_(\d+)$/.exec(node.id)?.[1]);
      if (Number.isFinite(fileId)) setSelectedFileId(fileId);
    }
  }, []);

  const handleProjectSelect = useCallback((projectId: number) => {
    graphRequest.current?.abort();
    setSelectedProjectId(projectId);
    setFiles([]);
    setSelectedFileId(null);
    setGraph(null);
    setSelectedNodeId(null);
  }, []);

  const refreshGraph = useCallback(() => setGraphRefresh((value) => value + 1), []);

  const toolbar = (
    <GraphToolbar
      activeNodeTypes={activeNodeTypes}
      activeRelationships={activeRelationships}
      isRefreshing={isLoadingGraph}
      onFitView={() => setFitViewRequest((value) => value + 1)}
      onQueryChange={setQuery}
      onRefresh={refreshGraph}
      onSearchResultSelect={handleSearchResultSelect}
      onToggleNodeType={(type) => setActiveNodeTypes((current) => toggleValue(current, type))}
      onToggleRelationship={(type) => setActiveRelationships((current) => toggleValue(current, type))}
      query={query}
      searchCount={query.trim() ? matchingNodeIds.size : null}
      searchResults={searchResults}
    />
  );

  if (isLoadingProjects) {
    return (
      <main className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8">
        <StateCard icon={RefreshCw} title="Loading graph workspace" message="Preparing your repository explorer…" loading />
      </main>
    );
  }

  if (!projects.length) {
    return (
      <main className="mx-auto w-full max-w-screen-2xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <PageHeader title="Code Observatory" description="Explore the complete project graph with search, filters, and node inspection." showStatusBadge={false} />
        <StateCard icon={Network} title="No project available" message="Create or scan a project before opening its graph workspace." />
      </main>
    );
  }

  const graphContent = error ? (
    <StateCard icon={AlertCircle} title="Project graph could not be loaded" message={error} actionLabel="Try again" onAction={refreshGraph} />
  ) : isLoadingGraph && !graph ? (
    <StateCard icon={RefreshCw} title="Loading project graph" message="Fetching the complete code graph for this project…" loading />
  ) : !graph?.nodes.length ? (
    <StateCard icon={Network} title="No graph data yet" message="This project has no graph records yet. Scan the project to discover declarations and relationships." />
  ) : query.trim() && !visibleMatchingNodeIds.size ? (
    <StateCard icon={SearchX} title="No matching nodes" message="Try a different file, class, function, or variable name." />
  ) : !filteredNodes.length ? (
    <StateCard icon={Network} title="Filters hide every node" message="Enable at least one node type to display the project graph." />
  ) : (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <GraphCanvas
        graphKey={`${selectedProjectId}:${graphVersion}`}
        nodes={filteredNodes}
        edges={filteredEdges}
        fitViewRequest={fitViewRequest}
        focusNodeId={selectedNodeId}
        isSearching={Boolean(query.trim())}
        matchedNodeIds={visibleMatchingNodeIds}
        onNodeSelect={setSelectedNodeId}
      />
      <GraphInspector
        node={selectedNode}
        edges={graph.edges}
        nodesById={nodesById}
        projectName={selectedProject?.name ?? null}
        onClose={() => setSelectedNodeId(null)}
        onNodeSelect={setSelectedNodeId}
      />
    </div>
  );

  return (
    <main className="mx-auto w-full max-w-screen-2xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Code Observatory" description="Explore the complete project graph with search, filters, and node inspection." showStatusBadge={false} />
      <ProjectSelector onSelect={handleProjectSelect} projects={projects} selectedProjectId={selectedProjectId} />
      <section className="grid min-h-[42rem] overflow-hidden rounded-xl border border-slate-800 bg-slate-950/65 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <RepositoryTree
          files={files}
          selectedFileId={selectedFileId}
          isLoading={isLoadingFiles}
          onSelectFile={handleSelectFile}
          onRefresh={() => setWorkspaceRefresh((value) => value + 1)}
        />
        <div className="min-w-0 space-y-4 p-4 sm:p-5">
          {toolbar}
          <GraphSummary
            edgeCount={filteredEdges.length}
            isLoading={isLoadingGraph}
            nodeCount={filteredNodes.length}
            totalEdges={graph?.edges.length ?? 0}
            totalNodes={graph?.nodes.length ?? 0}
          />
          {graphContent}
        </div>
      </section>
    </main>
  );
}

function GraphSummary({
  edgeCount,
  isLoading,
  nodeCount,
  totalEdges,
  totalNodes,
}: {
  edgeCount: number;
  isLoading: boolean;
  nodeCount: number;
  totalEdges: number;
  totalNodes: number;
}) {
  return (
    <section aria-label="Graph summary" className="border-y border-slate-800 bg-slate-900/35 px-3 py-3">
      <p className="text-sm text-slate-400">
        {isLoading ? (
          "Refreshing graph…"
        ) : (
          <>
            Showing <strong className="text-slate-200">{nodeCount}</strong> of{" "}
            <strong className="text-slate-200">{totalNodes}</strong> nodes and{" "}
            <strong className="text-slate-200">{edgeCount}</strong> of{" "}
            <strong className="text-slate-200">{totalEdges}</strong> edges
          </>
        )}
      </p>
    </section>
  );
}

function StateCard({
  actionLabel,
  icon: Icon,
  loading = false,
  message,
  onAction,
  title,
}: {
  actionLabel?: string;
  icon: typeof Network;
  loading?: boolean;
  message: string;
  onAction?: () => void;
  title: string;
}) {
  return (
    <section className="grid min-h-72 place-items-center rounded-xl border border-slate-800 bg-slate-950/65 p-6 text-center">
      <div>
        <Icon className={`mx-auto size-7 ${loading ? "animate-spin text-cyan-300" : "text-slate-500"}`} />
        <h2 className="mt-3 text-base font-semibold text-slate-200">{title}</h2>
        <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">{message}</p>
        {onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-700 px-3 text-sm font-semibold text-slate-300 hover:border-cyan-500/60 hover:text-cyan-200"
          >
            <RefreshCw className="size-4" />
            {actionLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}
