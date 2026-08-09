"use client";

import { AlertCircle, AlertTriangle, FileCode2, Network, RefreshCw, SearchX } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ProjectSelector } from "@/components/developer/ProjectSelector";
import { GraphCanvas } from "@/components/graph/GraphCanvas";
import { GraphInspector } from "@/components/graph/GraphInspector";
import { GraphToolbar } from "@/components/graph/GraphToolbar";
import { PageHeader } from "@/components/ui/PageHeader";
import { RepositoryTree } from "@/components/workspace/RepositoryTree";
import { getFocusedProjectGraph } from "@/services/graph";
import { getProjects } from "@/services/projects";
import { getRepositoryWorkspace } from "@/services/workspace";
import type { CodeGraphNode, GraphNodeType, GraphRelationshipType, ProjectGraph } from "@/types/graph";
import type { Project } from "@/types/project";
import type { RepositoryFile } from "@/types/workspace";

const GRAPH_NODE_LIMIT = 150;
const allNodeTypes = new Set<GraphNodeType>(["file", "function", "class", "variable"]);
const allRelationshipTypes = new Set<GraphRelationshipType>(["IMPORTS", "DECLARES", "CALLS"]);
const depthLabels = ["File context", "Direct calls", "Call chain"];

function toggleValue<T>(values: Set<T>, value: T) {
  const next = new Set(values);
  if (next.has(value)) next.delete(value); else next.add(value);
  return next;
}

function fileIdFromNodeId(nodeId: string) {
  const match = /^file_(\d+)$/.exec(nodeId);
  return match ? Number(match[1]) : null;
}

function boundFocusedGraph(graph: ProjectGraph, focusedFileId: number | null): ProjectGraph {
  if (graph.nodes.length <= GRAPH_NODE_LIMIT) return graph;
  const preferredNodeId = focusedFileId ? `file_${focusedFileId}` : null;
  const adjacentNodeIds = new Set<string>();
  graph.edges.forEach((edge) => {
    if (edge.source === preferredNodeId) adjacentNodeIds.add(edge.target);
    if (edge.target === preferredNodeId) adjacentNodeIds.add(edge.source);
  });
  const priority = (node: CodeGraphNode) => node.id === preferredNodeId ? 0 : adjacentNodeIds.has(node.id) ? 1 : node.type === "file" ? 2 : node.type === "class" || node.type === "function" ? 3 : 4;
  const nodes = graph.nodes.slice().sort((left, right) => priority(left) - priority(right) || left.label.localeCompare(right.label) || left.id.localeCompare(right.id)).slice(0, GRAPH_NODE_LIMIT);
  const nodeIds = new Set(nodes.map((node) => node.id));
  return { nodes, edges: graph.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)) };
}

export default function GraphPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [files, setFiles] = useState<RepositoryFile[]>([]);
  const [focusedFile, setFocusedFile] = useState<RepositoryFile | null>(null);
  const [depth, setDepth] = useState(1);
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
  const focusRequest = useRef<AbortController | null>(null);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;

  useEffect(() => {
    const controller = new AbortController();
    void getProjects(controller.signal)
      .then((response) => setProjects(response.projects))
      .catch((requestError) => { if (!(requestError instanceof DOMException && requestError.name === "AbortError")) setError(requestError instanceof Error ? requestError.message : "Could not load projects."); })
      .finally(() => { if (!controller.signal.aborted) setIsLoadingProjects(false); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (projects.length && !projects.some((project) => project.id === selectedProjectId)) setSelectedProjectId(projects[0].id);
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) return;
    const controller = new AbortController();
    setIsLoadingFiles(true);
    setError(null);
    setGraph(null);
    setSelectedNodeId(null);
    void getRepositoryWorkspace(selectedProjectId, controller.signal)
      .then((workspace) => {
        if (controller.signal.aborted) return;
        setFiles(workspace.files);
        setFocusedFile((current) => workspace.files.find((file) => file.id === current?.id) ?? workspace.files[0] ?? null);
      })
      .catch((requestError) => { if (!(requestError instanceof DOMException && requestError.name === "AbortError")) setError(requestError instanceof Error ? requestError.message : "Could not load repository files."); })
      .finally(() => { if (!controller.signal.aborted) setIsLoadingFiles(false); });
    return () => controller.abort();
  }, [selectedProjectId, workspaceRefresh]);

  const focusedFileId = focusedFile?.id ?? null;

  useEffect(() => {
    if (!selectedProjectId || focusedFileId === null) return;
    focusRequest.current?.abort();
    const controller = new AbortController();
    focusRequest.current = controller;
    setIsLoadingGraph(true);
    setError(null);
    setSelectedNodeId(null);
    void getFocusedProjectGraph(selectedProjectId, { fileId: focusedFileId, depth }, controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) {
          console.log("nodes:", response.nodes.length);
          console.log("edges:", response.edges.length);
          // React Flow keeps internal node state, so replace both collections
          // rather than retaining any response array references.
          setGraph({ nodes: [...response.nodes], edges: [...response.edges] });
          setGraphVersion((value) => value + 1);
          setFitViewRequest((value) => value + 1);
        }
      })
      .catch((requestError) => { if (!(requestError instanceof DOMException && requestError.name === "AbortError")) setError(requestError instanceof Error ? requestError.message : "Could not load focused graph."); })
      .finally(() => { if (!controller.signal.aborted) setIsLoadingGraph(false); });
    return () => controller.abort();
  }, [depth, focusedFileId, graphRefresh, selectedProjectId]);

  useEffect(() => () => focusRequest.current?.abort(), []);

  const renderedGraph = useMemo(() => graph ? boundFocusedGraph(graph, focusedFile?.id ?? null) : null, [focusedFile?.id, graph]);
  const wasTruncated = Boolean(graph && renderedGraph && graph.nodes.length > renderedGraph.nodes.length);
  const matchingNodeIds = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery || !renderedGraph) return new Set<string>();
    return new Set(renderedGraph.nodes.filter((node) => `${node.label} ${node.type}`.toLowerCase().includes(normalizedQuery)).map((node) => node.id));
  }, [query, renderedGraph]);
  const filteredNodes = useMemo(() => renderedGraph?.nodes.filter((node) => activeNodeTypes.has(node.type)) ?? [], [activeNodeTypes, renderedGraph]);
  const visibleNodeIds = useMemo(() => new Set(filteredNodes.map((node) => node.id)), [filteredNodes]);
  const filteredEdges = useMemo(() => renderedGraph?.edges.filter((edge) => activeRelationships.has(edge.type) && visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)) ?? [], [activeRelationships, renderedGraph, visibleNodeIds]);
  const visibleCallCount = useMemo(() => filteredEdges.filter((edge) => edge.type === "CALLS").length, [filteredEdges]);
  const visibleMatchingNodeIds = useMemo(() => new Set([...matchingNodeIds].filter((nodeId) => visibleNodeIds.has(nodeId))), [matchingNodeIds, visibleNodeIds]);
  const nodesById = useMemo(() => new Map(renderedGraph?.nodes.map((node) => [node.id, node]) ?? []), [renderedGraph]);
  const selectedNode = selectedNodeId ? nodesById.get(selectedNodeId) ?? null : null;

  const handleFileFocus = useCallback((nodeId: string, label: string) => {
    const fileId = fileIdFromNodeId(nodeId);
    if (fileId === null) return;
    setFocusedFile(files.find((file) => file.id === fileId) ?? { id: fileId, path: label, language: null, size: 0 });
  }, [files]);
  const handleProjectSelect = useCallback((projectId: number) => {
    focusRequest.current?.abort();
    setSelectedProjectId(projectId);
    setFiles([]);
    setFocusedFile(null);
    setGraph(null);
    setSelectedNodeId(null);
  }, []);
  const refreshGraph = useCallback(() => setGraphRefresh((value) => value + 1), []);
  const toolbar = <GraphToolbar activeNodeTypes={activeNodeTypes} activeRelationships={activeRelationships} isRefreshing={isLoadingGraph} isSearching={false} onFitView={() => setFitViewRequest((value) => value + 1)} onQueryChange={setQuery} onRefresh={refreshGraph} onToggleNodeType={(type) => setActiveNodeTypes((current) => toggleValue(current, type))} onToggleRelationship={(type) => setActiveRelationships((current) => toggleValue(current, type))} query={query} searchCount={query.trim() ? matchingNodeIds.size : null} />;

  if (isLoadingProjects) return <main className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8"><StateCard icon={RefreshCw} title="Loading graph workspace" message="Preparing your repository explorer…" loading /></main>;
  if (!projects.length) return <main className="mx-auto w-full max-w-screen-2xl space-y-6 px-4 py-6 sm:px-6 lg:px-8"><PageHeader title="Code Observatory" description="Explore one file at a time with a depth-controlled relationship map." showStatusBadge={false} /><StateCard icon={Network} title="No project available" message="Create or scan a project before opening its graph workspace." /></main>;

  const graphContent = error
    ? <StateCard icon={AlertCircle} title="Focused graph could not be loaded" message={error} actionLabel="Try again" onAction={refreshGraph} />
    : isLoadingGraph && !graph
      ? <StateCard icon={RefreshCw} title="Tracing focused file" message="Expanding only the relationships for the selected depth…" loading />
      : !focusedFile
        ? <StateCard icon={FileCode2} title="No scannable files" message="This repository has no files available to focus. Scan or import source files, then refresh this workspace." />
        : !renderedGraph?.nodes.length
          ? <StateCard icon={Network} title="No focused graph data yet" message="The selected file has no graph records yet. Scan the project to discover declarations and relationships." />
          : query.trim() && !visibleMatchingNodeIds.size
            ? <StateCard icon={SearchX} title="No matching nodes" message="Try a different file, class, function, or variable name." />
            : !filteredNodes.length
              ? <StateCard icon={Network} title="Filters hide every node" message="Enable at least one node type to display the focused graph." />
              : <div className="space-y-3">{wasTruncated ? <div role="status" className="flex items-center gap-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-100"><AlertTriangle className="size-4 shrink-0 text-amber-300" />Rendering {renderedGraph.nodes.length} of {graph?.nodes.length} focused nodes. Reduce depth or refine filters to inspect the complete neighborhood.</div> : null}<div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]"><GraphCanvas graphKey={`${selectedProjectId}:${focusedFileId}:${depth}:${graphVersion}`} nodes={filteredNodes} edges={filteredEdges} fitViewRequest={fitViewRequest} focusNodeId={selectedNodeId} isSearching={Boolean(query.trim())} matchedNodeIds={visibleMatchingNodeIds} onFileFocus={handleFileFocus} onNodeSelect={setSelectedNodeId} /><GraphInspector node={selectedNode} edges={renderedGraph.edges} nodesById={nodesById} projectName={selectedProject?.name ?? null} onClose={() => setSelectedNodeId(null)} onNodeSelect={setSelectedNodeId} /></div></div>;

  return <main className="mx-auto w-full max-w-screen-2xl space-y-6 px-4 py-6 sm:px-6 lg:px-8"><PageHeader title="Code Observatory" description="Choose a file, set the call-chain horizon, and inspect a quiet architectural lane." showStatusBadge={false} /><ProjectSelector onSelect={handleProjectSelect} projects={projects} selectedProjectId={selectedProjectId} /><section className="grid min-h-[42rem] overflow-hidden rounded-xl border border-slate-800 bg-slate-950/65 lg:grid-cols-[17rem_minmax(0,1fr)]"><RepositoryTree files={files} selectedFileId={focusedFile?.id ?? null} isLoading={isLoadingFiles} onSelectFile={setFocusedFile} onRefresh={() => setWorkspaceRefresh((value) => value + 1)} /><div className="min-w-0 space-y-4 p-4 sm:p-5">{toolbar}<DepthControl depth={depth} filePath={focusedFile?.path ?? null} isLoading={isLoadingGraph} nodeCount={filteredNodes.length} edgeCount={filteredEdges.length} callCount={visibleCallCount} onChange={setDepth} />{graphContent}</div></section></main>;
}

function DepthControl({ callCount, depth, edgeCount, filePath, isLoading, nodeCount, onChange }: { callCount: number; depth: number; edgeCount: number; filePath: string | null; isLoading: boolean; nodeCount: number; onChange: (value: number) => void }) {
  return <section aria-label="Focus depth" className="border-y border-slate-800 bg-slate-900/35 px-1 py-3 sm:px-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="flex items-center gap-2 text-sm text-slate-400"><FileCode2 className={`size-4 ${isLoading ? "animate-pulse text-cyan-300" : "text-cyan-500"}`} /><span>Focused file:</span><span className="max-w-[24rem] truncate font-medium text-slate-200">{filePath ?? "Choose a file from Explorer"}</span></p><div className="flex items-center gap-2"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-300">Depth {depth} · {depthLabels[depth - 1]}</span><span aria-label={`${nodeCount} nodes, ${edgeCount} edges, ${callCount} calls`} className="flex items-center gap-1.5 rounded-md border border-slate-700/80 bg-slate-950/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400"><span><strong className="text-slate-200">{nodeCount}</strong> nodes</span><span className="text-slate-700">/</span><span><strong className="text-slate-200">{edgeCount}</strong> edges</span><span className="text-slate-700">/</span><span className="text-emerald-300"><strong>{callCount}</strong> calls</span></span></div></div><div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4"><input aria-label="Call chain depth" className="h-2 w-full cursor-pointer appearance-none rounded bg-slate-700 accent-cyan-400" type="range" min="1" max="3" step="1" value={depth} onChange={(event) => onChange(Number(event.target.value))} /><div className="flex gap-3 text-[11px] font-medium text-slate-400 sm:gap-5">{depthLabels.map((label, index) => <button key={label} type="button" onClick={() => onChange(index + 1)} className={`transition-colors ${depth === index + 1 ? "text-cyan-200" : "hover:text-slate-200"}`}><span className="mr-1 text-slate-500">{index + 1}</span>{label}</button>)}</div></div></section>;
}

function StateCard({ actionLabel, icon: Icon, loading = false, message, onAction, title }: { actionLabel?: string; icon: typeof Network; loading?: boolean; message: string; onAction?: () => void; title: string }) {
  return <section className="grid min-h-72 place-items-center rounded-xl border border-slate-800 bg-slate-950/65 p-6 text-center"><div><Icon className={`mx-auto size-7 ${loading ? "animate-spin text-cyan-300" : "text-slate-500"}`} /><h2 className="mt-3 text-base font-semibold text-slate-200">{title}</h2><p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">{message}</p>{onAction ? <button type="button" onClick={onAction} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-700 px-3 text-sm font-semibold text-slate-300 hover:border-cyan-500/60 hover:text-cyan-200"><RefreshCw className="size-4" />{actionLabel}</button> : null}</div></section>;
}
