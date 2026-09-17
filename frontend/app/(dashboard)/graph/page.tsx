"use client";

import { AlertCircle, FolderTree, Menu, Network, RefreshCw, SearchX, X } from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { GraphCanvas } from "@/components/graph/GraphCanvas";
import { GraphInspector } from "@/components/graph/GraphInspector";
import { GraphToolbar } from "@/components/graph/GraphToolbar";
import { RepositoryTree } from "@/components/workspace/RepositoryTree";
import {
  getProjectGraph,
  getProjectGraphFocus,
  searchProjectGraphNodes,
} from "@/services/graph";
import { getProjects } from "@/services/projects";
import { getRepositoryWorkspace } from "@/services/workspace";
import type { CodeGraphNode, GraphNodeType, GraphRelationshipType, ProjectGraph } from "@/types/graph";
import type { Project } from "@/types/project";
import type { RepositoryFile } from "@/types/workspace";

const allNodeTypes = new Set<GraphNodeType>(["project", "module", "file", "api_route", "function", "class", "method", "variable"]);
const allRelationshipTypes = new Set<GraphRelationshipType>([
  "CONTAINS",
  "HANDLES",
  "IMPORTS",
  "DECLARES",
  "CALLS",
  "EXTENDS",
  "HAS_METHOD",
]);

function toggleValue<T>(values: Set<T>, value: T) {
  const next = new Set(values);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function GraphPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [files, setFiles] = useState<RepositoryFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  const [fullGraph, setFullGraph] = useState<ProjectGraph | null>(null);
  const [graph, setGraph] = useState<ProjectGraph | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isLoadingGraph, setIsLoadingGraph] = useState(false);
  const [workspaceRefresh, setWorkspaceRefresh] = useState(0);
  const [graphRefresh, setGraphRefresh] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CodeGraphNode[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [focusError, setFocusError] = useState<string | null>(null);
  const [focusDepth, setFocusDepth] = useState<1 | 2 | 3>(1);
  const [isFocused, setIsFocused] = useState(false);
  const [isFocusing, setIsFocusing] = useState(false);
  const [activeNodeTypes, setActiveNodeTypes] = useState(allNodeTypes);
  const [activeRelationships, setActiveRelationships] = useState(allRelationshipTypes);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [fitViewRequest, setFitViewRequest] = useState(0);
  const [graphVersion, setGraphVersion] = useState(0);
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const graphRequest = useRef<AbortController | null>(null);
  const focusRequest = useRef<AbortController | null>(null);

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
    if (isLoadingProjects || projects.length === 0) return;

    let resolvedId: number | null = null;

    // 1. URL search parameters
    const urlProjectId = searchParams.get("projectId");
    if (urlProjectId) {
      const parsed = Number(urlProjectId);
      if (Number.isInteger(parsed)) {
        resolvedId = parsed;
      }
    }

    // 2. localStorage fallback
    if (resolvedId === null) {
      const localId = localStorage.getItem("activeProjectId");
      if (localId) {
        const parsed = Number(localId);
        if (Number.isInteger(parsed)) {
          resolvedId = parsed;
        }
      }
    }

    // Verify if resolved project ID actually exists in the fetched projects list
    if (resolvedId !== null && projects.some((p) => p.id === resolvedId)) {
      setSelectedProjectId(resolvedId);
      localStorage.setItem("activeProjectId", String(resolvedId));
      const name = projects.find((p) => p.id === resolvedId)?.name;
      if (name) localStorage.setItem("activeProjectName", name);
    } else {
      setSelectedProjectId(null);
    }
  }, [projects, searchParams, isLoadingProjects]);

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
          const completeGraph = {
            nodes: [...response.nodes],
            edges: [...response.edges],
            truncated: response.truncated,
          };
          setFullGraph(completeGraph);
          setGraph(completeGraph);
          setIsFocused(false);
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

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (!selectedProjectId || !normalizedQuery) {
      setSearchResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    setSearchResults([]);
    setSearchError(null);
    setIsSearching(true);
    const timeout = window.setTimeout(() => {
      void searchProjectGraphNodes(selectedProjectId, normalizedQuery, controller.signal)
        .then((response) => {
          if (!controller.signal.aborted) setSearchResults(response.nodes);
        })
        .catch((requestError) => {
          if (!(requestError instanceof DOMException && requestError.name === "AbortError")) {
            setSearchResults([]);
            setSearchError(
              requestError instanceof Error ? requestError.message : "Could not search graph nodes.",
            );
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsSearching(false);
        });
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query, selectedProjectId]);

  useEffect(() => () => focusRequest.current?.abort(), []);

  const graphStats = useMemo(() => {
    if (!graph) return null;
    return {
      nodes: graph.nodes.length,
      edges: graph.edges.length,
      files: graph.nodes.filter((node) => node.type === "file").length,
      functions: graph.nodes.filter((node) => node.type === "function").length,
      classes: graph.nodes.filter((node) => node.type === "class").length,
      methods: graph.nodes.filter((node) => node.type === "method").length,
      variables: graph.nodes.filter((node) => node.type === "variable").length,
    };
  }, [graph]);

  const matchingNodeIds = useMemo(
    () => new Set(searchResults.map((node) => node.id)),
    [searchResults],
  );

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

  const loadFocusedGraph = useCallback((nodeId: string) => {
    if (!selectedProjectId) return;
    focusRequest.current?.abort();
    const controller = new AbortController();
    focusRequest.current = controller;
    setIsFocusing(true);
    setFocusError(null);
    setSelectedNodeId(nodeId);
    void getProjectGraphFocus(selectedProjectId, nodeId, focusDepth, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return;
        setGraph({ nodes: [...response.nodes], edges: [...response.edges], truncated: response.truncated });
        setIsFocused(true);
        setGraphVersion((value) => value + 1);
        setFitViewRequest((value) => value + 1);
        if (!response.nodes.some((node) => node.id === nodeId)) setSelectedNodeId(null);
      })
      .catch((requestError) => {
        if (!(requestError instanceof DOMException && requestError.name === "AbortError")) {
          setFocusError(
            requestError instanceof Error ? requestError.message : "Could not focus the selected node.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsFocusing(false);
      });
  }, [focusDepth, selectedProjectId]);

  const handleSelectFile = useCallback((file: RepositoryFile) => {
    setSelectedFileId(file.id);
    loadFocusedGraph(`file_${file.id}`);
    setIsExplorerOpen(false);
  }, [loadFocusedGraph]);

  const handleSearchResultSelect = useCallback((node: CodeGraphNode) => {
    setQuery(node.label);
    loadFocusedGraph(node.id);
    if (node.type === "file") {
      const fileId = Number(/^file_(\d+)$/.exec(node.id)?.[1]);
      if (Number.isFinite(fileId)) setSelectedFileId(fileId);
    }
  }, [loadFocusedGraph]);

  const focusSelectedNode = useCallback(() => {
    if (selectedNodeId) loadFocusedGraph(selectedNodeId);
  }, [loadFocusedGraph, selectedNodeId]);

  const showFullGraph = useCallback(() => {
    if (!fullGraph) return;
    setGraph(fullGraph);
    setIsFocused(false);
    setGraphVersion((value) => value + 1);
    setFitViewRequest((value) => value + 1);
  }, [fullGraph]);

  const handleProjectSelect = useCallback((projectId: number) => {
    graphRequest.current?.abort();
    focusRequest.current?.abort();
    setSelectedProjectId(projectId);
    localStorage.setItem("activeProjectId", String(projectId));
    const name = projects.find(p => p.id === projectId)?.name;
    if (name) localStorage.setItem("activeProjectName", name);

    // Update URL query parameters
    const params = new URLSearchParams(searchParams.toString());
    params.set("projectId", String(projectId));
    router.push(`${pathname}?${params.toString()}`);

    setFiles([]);
    setSelectedFileId(null);
    setFullGraph(null);
    setGraph(null);
    setSelectedNodeId(null);
    setSearchResults([]);
    setSearchError(null);
    setFocusError(null);
    setIsFocused(false);
    setIsExplorerOpen(false);
  }, [projects, pathname, router, searchParams]);

  const refreshGraph = useCallback(() => setGraphRefresh((value) => value + 1), []);

  if (isLoadingProjects) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-[#060a10]">
        <StateCard icon={RefreshCw} title="Loading graph workspace" message="Preparing your code visualization workspace…" loading />
      </div>
    );
  }

  if (!projects.length) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-[#060a10] p-6">
        <StateCard icon={Network} title="No project available" message="Create or scan a project before opening its graph workspace." />
      </div>
    );
  }

  if (!selectedProjectId) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center bg-[#060a10] p-6 text-center">
        <Network className="size-12 text-slate-600 animate-pulse" />
        <h2 className="mt-4 text-lg font-semibold text-slate-300">No Active Project Selected</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
          Please select a project to visualize its codebase knowledge graph.
        </p>
        <div className="mt-6 w-80">
          <label className="sr-only" htmlFor="graph-no-project-select">Select a project</label>
          <select
            id="graph-no-project-select"
            className="w-full rounded-md border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/60"
            value=""
            onChange={(event) => handleProjectSelect(Number(event.target.value))}
          >
            <option value="" disabled>Select a project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id} className="bg-slate-950">
                {project.name} (#{project.id})
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  const showEmptyFilters = graph?.nodes.length && !filteredNodes.length;
  const showNoSearchMatches = graph?.nodes.length && query.trim() && !isSearching && !searchError && !searchResults.length;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-[#060a10]">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-800/80 bg-[#080d14]/95 px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setIsExplorerOpen(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-700/80 px-2.5 text-xs font-medium text-slate-300 hover:border-cyan-500/50 hover:text-cyan-100 lg:hidden"
            aria-label="Open repository explorer"
          >
            <Menu className="size-3.5" />
            Files
          </button>
          <button
            type="button"
            onClick={() => setIsExplorerOpen((open) => !open)}
            className="hidden h-8 items-center gap-1.5 rounded-md border border-slate-700/80 px-2.5 text-xs font-medium text-slate-300 hover:border-cyan-500/50 hover:text-cyan-100 lg:inline-flex"
            aria-pressed={isExplorerOpen}
          >
            <FolderTree className="size-3.5" />
            Explorer
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-400/90">Project Graph</p>
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-sm font-semibold text-slate-100 sm:text-base">{selectedProject?.name ?? "Select project"}</h1>
              <label className="sr-only" htmlFor="graph-project-select">Active project</label>
              <select
                id="graph-project-select"
                className="max-w-[9rem] truncate rounded-md border border-slate-700/80 bg-slate-900/80 px-2 py-1 text-[11px] text-slate-200 outline-none focus:border-cyan-500/60 sm:max-w-[12rem]"
                value={selectedProjectId ?? ""}
                onChange={(event) => handleProjectSelect(Number(event.target.value))}
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id} className="bg-slate-950">
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <p className="hidden min-w-0 truncate text-xs text-slate-400 xl:block">
          {graphStats ? (
            <>
              <span className="text-slate-200">{graphStats.nodes}</span> Nodes ·{" "}
              <span className="text-slate-200">{graphStats.edges}</span> Edges ·{" "}
              <span className="text-slate-200">{graphStats.files}</span> Files ·{" "}
              <span className="text-slate-200">{graphStats.functions}</span> Functions ·{" "}
              <span className="text-slate-200">{graphStats.classes}</span> Class ·{" "}
              <span className="text-slate-200">{graphStats.methods}</span> Methods ·{" "}
              <span className="text-slate-200">{graphStats.variables}</span> Variables
            </>
          ) : (
            "Loading graph statistics…"
          )}
        </p>

        <p className="truncate text-[11px] text-slate-400 xl:hidden">
          {graphStats ? `${graphStats.nodes} nodes · ${graphStats.edges} edges` : "Loading…"}
        </p>
      </header>

      <div className="relative min-h-0 flex-1">
        {error ? (
          <div className="absolute inset-0 z-10 grid place-items-center bg-[#060a10]/90 p-6">
            <StateCard icon={AlertCircle} title="Project graph could not be loaded" message={error} actionLabel="Try again" onAction={refreshGraph} />
          </div>
        ) : null}

        {isLoadingGraph && !graph ? (
          <div className="absolute inset-0 z-10 grid place-items-center bg-[#060a10]">
            <StateCard icon={RefreshCw} title="Loading project graph" message="Fetching the project graph overview…" loading />
          </div>
        ) : null}

        {!graph?.nodes.length && !isLoadingGraph && !error ? (
          <div className="absolute inset-0 z-10 grid place-items-center bg-[#060a10] p-6">
            <StateCard icon={Network} title="No graph data yet" message="Scan this project to discover declarations and relationships." />
          </div>
        ) : null}

        {showNoSearchMatches ? (
          <div className="absolute inset-0 z-10 grid place-items-center bg-[#060a10]/85 p-6">
            <StateCard icon={SearchX} title="No matching nodes" message="Try a different file, class, function, or variable name." />
          </div>
        ) : null}

        {showEmptyFilters ? (
          <div className="absolute inset-0 z-10 grid place-items-center bg-[#060a10]/85 p-6">
            <StateCard icon={Network} title="Filters hide every node" message="Enable at least one node type to display the project graph." />
          </div>
        ) : null}

        {graph && filteredNodes.length ? (
          <>
            <GraphToolbar
              activeNodeTypes={activeNodeTypes}
              activeRelationships={activeRelationships}
              canFocus={selectedNodeId !== null}
              focusError={focusError}
              focusDepth={focusDepth}
              isFocused={isFocused}
              isFocusing={isFocusing}
              isRefreshing={isLoadingGraph}
              onFitView={() => setFitViewRequest((value) => value + 1)}
              onFocus={focusSelectedNode}
              onFocusDepthChange={setFocusDepth}
              onQueryChange={setQuery}
              onRefresh={refreshGraph}
              onSearchResultSelect={handleSearchResultSelect}
              onShowFullGraph={showFullGraph}
              onToggleNodeType={(type) => setActiveNodeTypes((current) => toggleValue(current, type))}
              onToggleRelationship={(type) => setActiveRelationships((current) => toggleValue(current, type))}
              query={query}
              searchError={searchError}
              isSearching={isSearching}
              searchCount={query.trim() ? searchResults.length : null}
              searchResults={searchResults}
            />
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
            {graph.truncated ? (
              <p className="pointer-events-none absolute bottom-4 left-1/2 z-20 max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-md border border-amber-400/25 bg-slate-950/90 px-3 py-2 text-center text-xs text-amber-100 shadow-lg shadow-slate-950/50">
                This view is capped at 500 nodes and 1,000 edges. Search and Focus remain available for the rest of the project.
              </p>
            ) : null}
          </>
        ) : null}

        {isExplorerOpen ? (
          <>
            <button
              type="button"
              className="absolute inset-0 z-30 bg-slate-950/40 backdrop-blur-[1px] lg:bg-slate-950/20"
              aria-label="Close repository explorer"
              onClick={() => setIsExplorerOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 z-40 flex w-[min(20rem,88vw)] flex-col border-r border-slate-700/80 bg-[#0a1019]/95 shadow-2xl shadow-slate-950/60 backdrop-blur-md">
              <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-800 px-3">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Repository Explorer</span>
                <button type="button" onClick={() => setIsExplorerOpen(false)} className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-200" aria-label="Close explorer">
                  <X className="size-4" />
                </button>
              </div>
              <RepositoryTree
                className="h-full border-0"
                files={files}
                selectedFileId={selectedFileId}
                isLoading={isLoadingFiles}
                onSelectFile={handleSelectFile}
                onRefresh={() => setWorkspaceRefresh((value) => value + 1)}
              />
            </div>
          </>
        ) : null}

        {selectedNode ? (
          <>
            <button
              type="button"
              className="absolute inset-0 z-30 bg-slate-950/20 lg:bg-transparent"
              aria-label="Close node inspector"
              onClick={() => setSelectedNodeId(null)}
            />
            <div className="absolute inset-y-0 right-0 z-40 w-[min(22.5rem,92vw)] border-l border-slate-700/80 shadow-2xl shadow-slate-950/60">
              <GraphInspector
                className="h-full border-0"
                node={selectedNode}
                edges={graph?.edges ?? []}
                nodesById={nodesById}
                projectName={selectedProject?.name ?? null}
                onClose={() => setSelectedNodeId(null)}
                onNodeSelect={setSelectedNodeId}
              />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function GraphPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-[#060a10]">
          <StateCard icon={RefreshCw} title="Loading graph workspace" message="Preparing your code visualization workspace…" loading />
        </div>
      }
    >
      <GraphPageInner />
    </Suspense>
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
    <section className="max-w-md rounded-xl border border-slate-800 bg-slate-950/80 p-6 text-center backdrop-blur-sm">
      <Icon className={`mx-auto size-7 ${loading ? "animate-spin text-cyan-300" : "text-slate-500"}`} />
      <h2 className="mt-3 text-base font-semibold text-slate-200">{title}</h2>
      <p className="mx-auto mt-1 text-sm leading-6 text-slate-500">{message}</p>
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
    </section>
  );
}
