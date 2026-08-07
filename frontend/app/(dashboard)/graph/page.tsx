"use client";

import { AlertCircle, Network, RefreshCw, SearchX } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { GraphCanvas } from "@/components/graph/GraphCanvas";
import { GraphInspector } from "@/components/graph/GraphInspector";
import { GraphStatsBar } from "@/components/graph/GraphStatsBar";
import { GraphToolbar } from "@/components/graph/GraphToolbar";
import { ProjectSelector } from "@/components/developer/ProjectSelector";
import { PageHeader } from "@/components/ui/PageHeader";
import { getProjectGraph, getProjectGraphStats } from "@/services/graph";
import { getProjects } from "@/services/projects";
import type { GraphNodeType, GraphRelationshipType, GraphStats, ProjectGraph } from "@/types/graph";
import type { Project } from "@/types/project";

const allNodeTypes = new Set<GraphNodeType>(["file", "class", "function", "method", "variable", "module"]);
const allRelationshipTypes = new Set<GraphRelationshipType>(["IMPORTS", "EXPORTS", "CALLS", "HAS_METHOD", "EXTENDS", "CONTAINS"]);

function toggleValue<T>(values: Set<T>, value: T) {
  const next = new Set(values);
  if (next.has(value)) next.delete(value); else next.add(value);
  return next;
}

export default function GraphPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [graph, setGraph] = useState<ProjectGraph | null>(null);
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingGraph, setIsLoadingGraph] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeNodeTypes, setActiveNodeTypes] = useState(allNodeTypes);
  const [activeRelationships, setActiveRelationships] = useState(allRelationshipTypes);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [fitViewRequest, setFitViewRequest] = useState(0);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await getProjects(controller.signal);
        setProjects(response.projects);
      } catch (requestError) {
        if (!(requestError instanceof DOMException && requestError.name === "AbortError")) setError(requestError instanceof Error ? requestError.message : "Could not load projects.");
      } finally { if (!controller.signal.aborted) setIsLoadingProjects(false); }
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (projects.length && !projects.some((project) => project.id === selectedProjectId)) setSelectedProjectId(projects[0].id);
  }, [projects, selectedProjectId]);

  const loadGraph = useCallback(async (projectId: number, signal?: AbortSignal) => {
    setIsLoadingGraph(true); setIsLoadingStats(true); setError(null); setSelectedNodeId(null); setFocusNodeId(null);
    try {
      const [graphResult, statsResult] = await Promise.allSettled([getProjectGraph(projectId, signal), getProjectGraphStats(projectId, signal)]);
      if (signal?.aborted) return;
      if (graphResult.status === "fulfilled") setGraph(graphResult.value); else { setGraph(null); setError(graphResult.reason instanceof Error ? graphResult.reason.message : "Could not load graph data."); }
      if (statsResult.status === "fulfilled") setStats(statsResult.value); else setStats(null);
    } finally { if (!signal?.aborted) { setIsLoadingGraph(false); setIsLoadingStats(false); } }
  }, []);

  useEffect(() => {
    if (!selectedProjectId) { setGraph(null); setStats(null); return; }
    const controller = new AbortController();
    void loadGraph(selectedProjectId, controller.signal);
    return () => controller.abort();
  }, [loadGraph, selectedProjectId]);

  const fileLabels = useMemo(() => new Map(graph?.nodes.filter((node) => node.type === "file").map((node) => [node.file_id, node.label]) ?? []), [graph]);
  const matchingNodeIds = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery || !graph) return new Set<string>();
    return new Set(graph.nodes.filter((node) => `${node.label} ${node.type} ${fileLabels.get(node.file_id) ?? ""}`.toLowerCase().includes(normalizedQuery)).map((node) => node.id));
  }, [fileLabels, graph, query]);
  // Type filters control visibility. Search preserves surrounding code context
  // and marks matching symbols in that visible graph instead of removing it.
  const filteredNodes = useMemo(() => graph?.nodes.filter((node) => activeNodeTypes.has(node.type)) ?? [], [activeNodeTypes, graph]);
  const visibleNodeIds = useMemo(() => new Set(filteredNodes.map((node) => node.id)), [filteredNodes]);
  const filteredEdges = useMemo(() => graph?.edges.filter((edge) => activeRelationships.has(edge.relationship) && visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)) ?? [], [activeRelationships, graph, visibleNodeIds]);
  const visibleMatchingNodeIds = useMemo(() => new Set([...matchingNodeIds].filter((nodeId) => visibleNodeIds.has(nodeId))), [matchingNodeIds, visibleNodeIds]);
  const nodesById = useMemo(() => new Map(graph?.nodes.map((node) => [node.id, node]) ?? []), [graph]);
  const selectedNode = selectedNodeId ? nodesById.get(selectedNodeId) ?? null : null;

  useEffect(() => {
    if (!query.trim()) return;
    const firstMatch = filteredNodes.find((node) => visibleMatchingNodeIds.has(node.id));
    if (firstMatch) { setSelectedNodeId(firstMatch.id); setFocusNodeId(firstMatch.id); }
  }, [filteredNodes, query, visibleMatchingNodeIds]);

  const handleProjectSelect = (projectId: number) => { setSelectedProjectId(projectId); setQuery(""); setSelectedNodeId(null); setFocusNodeId(null); };
  const handleRefresh = () => { if (selectedProjectId) void loadGraph(selectedProjectId); };
  const selectNode = (nodeId: string) => { setSelectedNodeId(nodeId); setFocusNodeId(nodeId); };

  return <main className="mx-auto w-full max-w-screen-2xl space-y-6 px-4 py-6 sm:px-6 lg:px-8"><PageHeader title="Graph Workspace" description="Explore the code intelligence graph across files, symbols, and relationships." showStatusBadge={false} /><ProjectSelector onSelect={handleProjectSelect} projects={projects} selectedProjectId={selectedProjectId} /><GraphStatsBar isLoading={isLoadingStats} stats={stats} />{isLoadingProjects ? <StateCard icon={RefreshCw} title="Loading projects" message="Preparing your available code graphs…" loading /> : !projects.length ? <StateCard icon={Network} title="No project available" message="Create or scan a project before opening its graph workspace." /> : error ? <StateCard icon={AlertCircle} title="Graph could not be loaded" message={error} actionLabel="Try again" onAction={handleRefresh} /> : <><GraphToolbar activeNodeTypes={activeNodeTypes} activeRelationships={activeRelationships} isRefreshing={isLoadingGraph} onFitView={() => setFitViewRequest((value) => value + 1)} onQueryChange={setQuery} onRefresh={handleRefresh} onToggleNodeType={(type) => setActiveNodeTypes((current) => toggleValue(current, type))} onToggleRelationship={(type) => setActiveRelationships((current) => toggleValue(current, type))} query={query} searchCount={query.trim() ? matchingNodeIds.size : null} />{isLoadingGraph ? <StateCard icon={RefreshCw} title="Loading graph" message="Mapping repository nodes and relationships…" loading /> : !graph?.nodes.length ? <StateCard icon={Network} title="No graph data yet" message="Scan or analyze this project, then refresh the graph workspace." /> : query.trim() && !filteredNodes.length ? <StateCard icon={SearchX} title="No matching nodes" message="Try a different name, file, class, or function search." /> : !filteredNodes.length ? <StateCard icon={Network} title="Filters hide every node" message="Enable at least one node type to display the graph." /> : <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_22rem]"><GraphCanvas nodes={filteredNodes} edges={filteredEdges} fitViewRequest={fitViewRequest} focusNodeId={focusNodeId} isSearching={Boolean(query.trim())} matchedNodeIds={visibleMatchingNodeIds} onNodeSelect={selectNode} /><GraphInspector node={selectedNode} edges={graph.edges} nodesById={nodesById} projectName={selectedProject?.name ?? null} onClose={() => { setSelectedNodeId(null); setFocusNodeId(null); }} /></div>}</>}</main>;
}

function StateCard({ actionLabel, icon: Icon, loading = false, message, onAction, title }: { actionLabel?: string; icon: typeof Network; loading?: boolean; message: string; onAction?: () => void; title: string }) {
  return <section className="grid min-h-72 place-items-center rounded-xl border border-slate-800 bg-slate-950/65 p-6 text-center"><div><Icon className={`mx-auto size-7 ${loading ? "animate-spin text-cyan-300" : "text-slate-500"}`} /><h2 className="mt-3 text-base font-semibold text-slate-200">{title}</h2><p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">{message}</p>{onAction ? <button type="button" onClick={onAction} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-700 px-3 text-sm font-semibold text-slate-300 hover:border-cyan-500/60 hover:text-cyan-200"><RefreshCw className="size-4" />{actionLabel}</button> : null}</div></section>;
}
