"use client";

import {
  AlertCircle,
  Check,
  ChevronDown,
  Network,
  RefreshCw,
  Search,
  SearchX,
} from "lucide-react";
import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { NODE_APPEARANCE } from "@/components/graph/CodeGraphNode";
import { GraphCanvas } from "@/components/graph/GraphCanvas";
import { GraphInspector } from "@/components/graph/GraphInspector";
import { GraphToolbar } from "@/components/graph/GraphToolbar";
import { cn } from "@/lib/cn";
import {
  ARCHITECTURAL_NODE_TYPES,
  deriveArchitectureTree,
  getVisibleArchitectureGraph,
  type ArchitectureNode,
} from "@/lib/graphUtils";
import {
  getProjectGraph,
} from "@/services/graph";
import { getProjects } from "@/services/projects";
import type {
  CodeGraphNode,
  GraphNodeType,
  GraphRelationshipType,
  ProjectGraph,
} from "@/types/graph";
import type { Project } from "@/types/project";

const ALL_NODE_TYPES: GraphNodeType[] = ARCHITECTURAL_NODE_TYPES;

const ALL_RELATIONSHIPS: GraphRelationshipType[] = [
  "CONTAINS",
  "HANDLES",
  "IMPORTS",
  "CALLS",
  "EXTENDS",
  "HAS_METHOD",
  "DECLARES",
];

const relationColor = (type: GraphRelationshipType) =>
  type === "CALLS"
    ? "#00e5ff"
    : type === "IMPORTS"
    ? "#a78bfa"
    : type === "EXTENDS"
    ? "#34d399"
    : type === "HANDLES"
    ? "#f43f5e"
    : type === "HAS_METHOD"
    ? "#34d399"
    : type === "DECLARES"
    ? "#6366f1"
    : "#64748b";

function GraphPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [fullGraph, setFullGraph] = useState<ProjectGraph | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingGraph, setIsLoadingGraph] = useState(false);
  const [graphRefresh, setGraphRefresh] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);

  // Search state
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CodeGraphNode[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Progressive Expansion state
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());

  // Focus & Filter state
  const [focusDepth, setFocusDepth] = useState<1 | 2 | 3>(1);
  const [isFocused, setIsFocused] = useState(false);
  const [activeNodeTypes, setActiveNodeTypes] = useState<Set<GraphNodeType>>(
    new Set(ALL_NODE_TYPES)
  );
  const [activeRelationships, setActiveRelationships] = useState<Set<GraphRelationshipType>>(
    new Set(ALL_RELATIONSHIPS)
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [fitViewRequest, setFitViewRequest] = useState(0);
  const [graphVersion, setGraphVersion] = useState(0);

  const graphRequest = useRef<AbortController | null>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? null;

  // Close project dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        projectDropdownRef.current &&
        !projectDropdownRef.current.contains(event.target as Node)
      ) {
        setProjectDropdownOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Fetch projects
  useEffect(() => {
    const controller = new AbortController();
    void getProjects(controller.signal)
      .then((response) => setProjects(response.projects))
      .catch((requestError) => {
        if (
          !(requestError instanceof DOMException && requestError.name === "AbortError")
        ) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Could not load projects."
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingProjects(false);
      });
    return () => controller.abort();
  }, []);

  // Synchronize active project from URL / localStorage
  useEffect(() => {
    if (isLoadingProjects || projects.length === 0) return;

    let resolvedId: number | null = null;

    const urlProjectId = searchParams.get("projectId");
    if (urlProjectId) {
      const parsed = Number(urlProjectId);
      if (Number.isInteger(parsed)) {
        resolvedId = parsed;
      }
    }

    if (resolvedId === null) {
      const localId = localStorage.getItem("activeProjectId");
      if (localId) {
        const parsed = Number(localId);
        if (Number.isInteger(parsed)) {
          resolvedId = parsed;
        }
      }
    }

    if (resolvedId !== null && projects.some((p) => p.id === resolvedId)) {
      setSelectedProjectId(resolvedId);
      localStorage.setItem("activeProjectId", String(resolvedId));
      const name = projects.find((p) => p.id === resolvedId)?.name;
      if (name) localStorage.setItem("activeProjectName", name);
    } else if (projects.length > 0) {
      const fallbackId = projects[0].id;
      setSelectedProjectId(fallbackId);
      localStorage.setItem("activeProjectId", String(fallbackId));
      localStorage.setItem("activeProjectName", projects[0].name);
    }
  }, [projects, searchParams, isLoadingProjects]);

  // Load project graph
  useEffect(() => {
    if (!selectedProjectId) return;
    graphRequest.current?.abort();
    const controller = new AbortController();
    graphRequest.current = controller;
    setIsLoadingGraph(true);
    setError(null);
    setSelectedNodeId(null);
    setExpandedNodeIds(new Set());
    setIsFocused(false);

    void getProjectGraph(selectedProjectId, controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) {
          const completeGraph = {
            nodes: [...response.nodes],
            edges: [...response.edges],
            truncated: response.truncated,
          };
          setFullGraph(completeGraph);
          setExpandedNodeIds(new Set());
          setGraphVersion((value) => value + 1);
          setFitViewRequest((value) => value + 1);
        }
      })
      .catch((requestError) => {
        if (
          !(requestError instanceof DOMException && requestError.name === "AbortError")
        ) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Could not load project graph."
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingGraph(false);
      });
    return () => controller.abort();
  }, [graphRefresh, selectedProjectId]);

  useEffect(() => () => graphRequest.current?.abort(), []);

  // 1. Derive Architecture Tree (Project -> Folders -> Files -> Functions/Methods)
  const architectureTree = useMemo(() => {
    if (!fullGraph) return null;
    return deriveArchitectureTree(
      fullGraph.nodes,
      fullGraph.edges,
      selectedProject?.name ?? "Project",
      selectedProjectId
    );
  }, [fullGraph, selectedProject?.name, selectedProjectId]);

  const nodesById = useMemo(
    () => (architectureTree?.allNodes as Map<string, CodeGraphNode>) ?? new Map<string, CodeGraphNode>(),
    [architectureTree]
  );

  // 2. Compute Visible Nodes & Edges (Strict Depth 1 / 2 / 3 + Progressive Expansion)
  const { visibleNodes, visibleEdges } = useMemo(() => {
    if (!architectureTree) return { visibleNodes: [], visibleEdges: [] };
    return getVisibleArchitectureGraph(
      architectureTree,
      focusDepth,
      expandedNodeIds,
      isFocused,
      selectedNodeId,
      activeNodeTypes,
      activeRelationships
    );
  }, [
    activeNodeTypes,
    activeRelationships,
    architectureTree,
    expandedNodeIds,
    focusDepth,
    isFocused,
    selectedNodeId,
  ]);

  const visibleNodeIds = useMemo(
    () => new Set(visibleNodes.map((node) => node.id)),
    [visibleNodes]
  );

  // 3. Responsive search: search across project, folders, files, and functions
  useEffect(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!selectedProjectId || !normalizedQuery || !architectureTree) {
      setSearchResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const matches: CodeGraphNode[] = [];
    architectureTree.allNodes.forEach((node) => {
      if (matches.length >= 15) return;
      const labelMatch = node.label.toLowerCase().includes(normalizedQuery);
      const pathMatch = (node as ArchitectureNode).filePath?.toLowerCase().includes(normalizedQuery);
      if (labelMatch || pathMatch) {
        matches.push(node);
      }
    });

    setSearchResults(matches);
    setIsSearching(false);
  }, [architectureTree, query, selectedProjectId]);

  // Connected nodes to selected node via visible edges
  const connectedNodeIds = useMemo(() => {
    const ids = new Set<string>();
    if (!selectedNodeId || !visibleEdges.length) return ids;
    visibleEdges.forEach((edge) => {
      if (edge.source === selectedNodeId) ids.add(edge.target);
      if (edge.target === selectedNodeId) ids.add(edge.source);
    });
    return ids;
  }, [selectedNodeId, visibleEdges]);

  const matchingNodeIds = useMemo(
    () => new Set(searchResults.map((node) => node.id)),
    [searchResults]
  );

  const visibleMatchingNodeIds = useMemo(
    () => new Set([...matchingNodeIds].filter((nodeId) => visibleNodeIds.has(nodeId))),
    [matchingNodeIds, visibleNodeIds]
  );

  const selectedNode = selectedNodeId ? nodesById.get(selectedNodeId) ?? null : null;

  // Handle Depth change (Depth 1, 2, 3)
  const handleDepthChange = useCallback(
    (depth: 1 | 2 | 3) => {
      setFocusDepth(depth);
      setGraphVersion((v) => v + 1);
      setFitViewRequest((v) => v + 1);
    },
    []
  );

  // Handle Node Focus
  const handleToggleFocus = useCallback(() => {
    if (!selectedNodeId) return;
    setIsFocused((prev) => {
      const next = !prev;
      setGraphVersion((v) => v + 1);
      setFitViewRequest((v) => v + 1);
      return next;
    });
  }, [selectedNodeId]);

  // Handle Node Selection
  const handleNodeSelect = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setFitViewRequest((v) => v + 1);
  }, []);

  // Handle Expand / Collapse toggle for a node
  const handleToggleExpand = useCallback((nodeId: string) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
    setFitViewRequest((v) => v + 1);
    setGraphVersion((v) => v + 1);
  }, []);

  // Handle Expand All at current depth
  const handleExpandAll = useCallback(() => {
    if (!architectureTree) return;
    const next = new Set<string>();
    architectureTree.allNodes.forEach((node) => {
      if (node.type === "module") {
        next.add(node.id);
      } else if (node.type === "file" && focusDepth >= 3) {
        next.add(node.id);
      }
    });
    setExpandedNodeIds(next);
    setFitViewRequest((v) => v + 1);
    setGraphVersion((v) => v + 1);
  }, [architectureTree, focusDepth]);

  // Handle Collapse All back to initial depth view
  const handleCollapseAll = useCallback(() => {
    setExpandedNodeIds(new Set());
    setFitViewRequest((v) => v + 1);
    setGraphVersion((v) => v + 1);
  }, []);

  // Handle Search Result Select: reveals minimum required ancestor path
  const handleSearchResultSelect = useCallback(
    (node: CodeGraphNode) => {
      setQuery(node.label);
      setSelectedNodeId(node.id);

      if (architectureTree) {
        const ancestors = architectureTree.ancestorsMap.get(node.id) ?? [];
        setExpandedNodeIds((prev) => {
          const next = new Set(prev);
          ancestors.forEach((ancId) => next.add(ancId));
          return next;
        });

        const target = architectureTree.allNodes.get(node.id);
        if (target) {
          if (target.level === 3 && focusDepth < 3) {
            setFocusDepth(3);
          } else if (target.level === 2 && focusDepth < 2) {
            setFocusDepth(2);
          }
        }
      }

      setFitViewRequest((v) => v + 1);
      setGraphVersion((v) => v + 1);
    },
    [architectureTree, focusDepth]
  );

  const handleProjectSelect = useCallback(
    (projectId: number) => {
      graphRequest.current?.abort();
      setSelectedProjectId(projectId);
      setProjectDropdownOpen(false);
      localStorage.setItem("activeProjectId", String(projectId));
      const name = projects.find((p) => p.id === projectId)?.name;
      if (name) localStorage.setItem("activeProjectName", name);

      const params = new URLSearchParams(searchParams.toString());
      params.set("projectId", String(projectId));
      router.push(`${pathname}?${params.toString()}`);

      setFullGraph(null);
      setSelectedNodeId(null);
      setExpandedNodeIds(new Set());
      setSearchResults([]);
      setSearchError(null);
      setIsFocused(false);
      setFocusDepth(1);
    },
    [projects, pathname, router, searchParams]
  );

  const refreshGraph = useCallback(() => setGraphRefresh((value) => value + 1), []);

  const toggleNodeType = (type: GraphNodeType) => {
    setActiveNodeTypes((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
    setFitViewRequest((v) => v + 1);
  };

  const toggleRelationship = (type: GraphRelationshipType) => {
    setActiveRelationships((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
    setFitViewRequest((v) => v + 1);
  };

  // Compute live project architecture statistics
  const totalProjectStats = useMemo(() => {
    if (!architectureTree) return null;
    const all = Array.from(architectureTree.allNodes.values());
    return {
      nodes: all.length,
      edges: architectureTree.allEdges.length,
      folders: all.filter((n) => n.type === "module").length,
      files: all.filter((n) => n.type === "file").length,
      classes: all.filter((n) => n.type === "class").length,
      functions: all.filter((n) => n.type === "function").length,
      methods: all.filter((n) => n.type === "method").length,
      routes: all.filter((n) => n.type === "api_route").length,
    };
  }, [architectureTree]);

  // Loading state
  if (isLoadingProjects) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-[#06070c]">
        <div className="text-center p-8 rounded-2xl border border-white/[0.08] bg-[#0a0d16]/80 backdrop-blur-xl">
          <RefreshCw className="w-7 h-7 text-primary animate-spin mx-auto" />
          <h2 className="mt-4 font-mono text-[14px] text-white font-medium">
            Loading Graph Workspace…
          </h2>
          <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
            Preparing your code visualization environment.
          </p>
        </div>
      </div>
    );
  }

  // No projects available
  if (!projects.length) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-[#06070c] p-6">
        <div className="text-center max-w-md p-8 rounded-2xl border border-white/[0.08] bg-[#0a0d16]/80 backdrop-blur-xl">
          <Network className="w-8 h-8 text-muted-foreground mx-auto" />
          <h2 className="mt-4 text-base font-semibold text-white">No Projects Available</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create or scan a project to explore its code knowledge graph.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden p-3 sm:p-5 lg:p-6 select-none">
      <div className="max-w-[1740px] mx-auto">
        {/* ── Top Header Section (Figma Design) ────────────────────────────── */}
        <section
          className="relative z-30 flex flex-col md:flex-row md:items-end justify-between gap-6 reveal"
          style={{ ["--d" as string]: "80ms" }}
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_#00e5ff]" />
              <span className="cg-label">CodeGraph AI / Architecture & Dependencies</span>
            </div>
            <h1 className="text-4xl md:text-[54px] leading-none font-bold tracking-[-0.035em] text-white">
              Project Graph
            </h1>
            <p className="text-muted-foreground text-[14px] md:text-[15px] mt-3">
              High-level codebase architecture, module dependencies, and call exploration map.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10.5px] text-muted-foreground">
              {totalProjectStats ? (
                <>
                  <span>
                    <strong className="text-white font-medium">{totalProjectStats.nodes}</strong> Architecture Nodes
                  </span>
                  <span>
                    <strong className="text-white font-medium">{totalProjectStats.edges}</strong> Dependencies
                  </span>
                  <span>
                    <strong className="text-white font-medium">{totalProjectStats.folders}</strong> Folders
                  </span>
                  <span>
                    <strong className="text-white font-medium">{totalProjectStats.files}</strong> Files
                  </span>
                  <span>
                    <strong className="text-white font-medium">{totalProjectStats.classes}</strong> Classes
                  </span>
                  <span>
                    <strong className="text-white font-medium">{totalProjectStats.functions}</strong> Functions
                  </span>
                  <span>
                    <strong className="text-white font-medium">{totalProjectStats.methods}</strong> Methods
                  </span>
                  {totalProjectStats.routes > 0 && (
                    <span>
                      <strong className="text-white font-medium">{totalProjectStats.routes}</strong> Routes
                    </span>
                  )}
                </>
              ) : (
                <span>Loading graph statistics…</span>
              )}
            </div>
          </div>

          {/* Active Project Dropdown Context */}
          <div className="relative shrink-0" ref={projectDropdownRef}>
            <div className="cg-label mb-2">Active Project Context</div>
            <button
              type="button"
              onClick={() => setProjectDropdownOpen((open) => !open)}
              className={cn(
                "flex items-center gap-3 justify-between w-full md:w-64 h-10 pl-3 pr-2.5 rounded-lg border bg-white/[0.02] transition-all text-[13px]",
                projectDropdownOpen
                  ? "border-primary/40 shadow-[0_0_0_3px_rgba(0,229,255,0.06),0_0_24px_-6px_rgba(0,229,255,0.35)]"
                  : "border-white/[0.08] hover:border-white/20"
              )}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_#00e5ff]" />
                <span className="text-white font-medium truncate">
                  {selectedProject?.name ?? "Select Project"}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  #{selectedProjectId ?? "—"}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform",
                  projectDropdownOpen && "rotate-180 text-primary"
                )}
              />
            </button>

            {projectDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-full md:w-72 p-1.5 rounded-xl border border-cyan-300/15 bg-[#0a0d16]/95 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] z-50 cg-pop">
                <div className="cg-label px-2.5 pt-1.5 pb-2 !text-[9.5px]">
                  Switch project
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {projects.map((p) => {
                    const active = p.id === selectedProjectId;
                    const sourceText = p.github_url
                      ? p.github_url.replace(/^https?:\/\//, "")
                      : "Local workspace";
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleProjectSelect(p.id)}
                        className={cn(
                          "relative w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-colors",
                          active ? "bg-primary/[0.07]" : "hover:bg-white/[0.04]"
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-primary" />
                        )}
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13px] text-white truncate">
                            {p.name}{" "}
                            <span className="font-mono text-[11px] text-muted-foreground">
                              (#{p.id})
                            </span>
                          </span>
                          <span className="block font-mono text-[10.5px] text-muted-foreground truncate">
                            {sourceText}
                          </span>
                        </span>
                        {active && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Main Graph Workstation Container ────────────────────────────── */}
        <section
          className="relative mt-6 rounded-2xl border border-white/[0.07] overflow-hidden bg-[#070910]/85 backdrop-blur-xl shadow-[0_40px_100px_-40px_rgba(0,0,0,0.95)] reveal"
          style={{ ["--d" as string]: "180ms" }}
        >
          <div className="absolute inset-x-0 top-0 h-px cg-hairline z-30 pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] 2xl:grid-cols-[230px_minmax(600px,1fr)_280px] lg:h-[min(76vh,820px)] lg:min-h-[680px]">
            {/* ── Left Sidebar: Graph Explorer ────────────────────────────── */}
            <aside className="flex flex-col min-h-[500px] lg:min-h-0 border-b lg:border-b-0 lg:border-r border-white/[0.06] bg-gradient-to-b from-[#0b0e18]/95 to-[#080a12]/90">
              <div className="h-12 flex items-center gap-2 px-4 border-b border-white/[0.06] shrink-0">
                <Network className="w-3.5 h-3.5 text-primary" />
                <span className="cg-label !text-foreground/80">Graph Explorer</span>
                <span className="ml-auto font-mono text-[9.5px] text-muted-foreground">
                  {visibleNodes.length} visible
                </span>
              </div>
              <div className="p-3 border-b border-white/[0.05] shrink-0">
                <div className="font-mono text-[12px] text-white truncate">
                  {selectedProject?.name ?? "No Project"}
                </div>
                <div className="mt-1 font-mono text-[9.5px] text-muted-foreground">
                  {visibleNodes.length} of {architectureTree?.allNodes.size ?? 0} architecture nodes · depth {focusDepth}
                  {isFocused && " (focused)"}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                {/* Search input in explorer */}
                <label className="flex items-center gap-2 h-9 px-3 rounded-lg border border-white/[0.07] bg-black/10 focus-within:border-primary/30 transition-all">
                  <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search nodes..."
                    className="w-full min-w-0 bg-transparent outline-none text-[12px] text-white placeholder:text-muted-foreground/60 font-mono"
                  />
                </label>

                {/* Node Types list with count & colored square checkbox */}
                <div className="mt-5 cg-label !text-[9px]">Node Types</div>
                <div className="mt-2 space-y-1">
                  {ALL_NODE_TYPES.map((type) => {
                    const active = activeNodeTypes.has(type);
                    const meta = NODE_APPEARANCE[type];
                    const typeCount =
                      architectureTree
                        ? Array.from(architectureTree.allNodes.values()).filter(
                            (node) => node.type === type
                          ).length
                        : 0;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => toggleNodeType(type)}
                        className={cn(
                          "w-full h-8 flex items-center gap-2.5 px-2 rounded-md transition-colors text-left",
                          active
                            ? "bg-white/[0.035] text-foreground"
                            : "text-muted-foreground/50 hover:bg-white/[0.02]"
                        )}
                      >
                        <span
                          className="w-2 h-2 rounded-sm border shrink-0 transition-all"
                          style={{
                            borderColor: meta.color,
                            background: active ? meta.color : "transparent",
                            boxShadow: active ? `0 0 6px ${meta.color}55` : undefined,
                          }}
                        />
                        <span className="text-[12px] truncate">{meta.plural}</span>
                        <span className="ml-auto font-mono text-[9.5px] text-muted-foreground">
                          {typeCount}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Relationships list with colored line indicator */}
                <div className="mt-5 cg-label !text-[9px]">Relationships</div>
                <div className="mt-2 space-y-1">
                  {ALL_RELATIONSHIPS.map((type) => {
                    const active = activeRelationships.has(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => toggleRelationship(type)}
                        className={cn(
                          "w-full h-8 flex items-center gap-2.5 px-2 rounded-md transition-colors text-left",
                          active
                            ? "bg-white/[0.035] text-foreground"
                            : "text-muted-foreground/50 hover:bg-white/[0.02]"
                        )}
                      >
                        <span
                          className="w-3 h-px shrink-0 transition-all"
                          style={{
                            background: active ? relationColor(type) : "rgba(255,255,255,.15)",
                          }}
                        />
                        <span className="font-mono text-[9.5px] truncate">
                          {type === "HAS_METHOD" ? "HAS METHOD" : type}
                        </span>
                        {active && <Check className="ml-auto w-3 h-3 text-primary/70 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>

            {/* ── Center: Graph Canvas Workstation ────────────────────────── */}
            <div className="relative flex flex-col min-h-[600px] lg:min-h-0 bg-[#04060b] overflow-hidden">
              <GraphToolbar
                activeNodeTypes={activeNodeTypes}
                activeRelationships={activeRelationships}
                canFocus={selectedNodeId !== null}
                focusDepth={focusDepth}
                isFocused={isFocused}
                isFocusing={false}
                isRefreshing={isLoadingGraph}
                onFitView={() => setFitViewRequest((value) => value + 1)}
                onFocus={handleToggleFocus}
                onFocusDepthChange={handleDepthChange}
                onQueryChange={setQuery}
                onRefresh={refreshGraph}
                onSearchResultSelect={handleSearchResultSelect}
                query={query}
                searchError={searchError}
                isSearching={isSearching}
                searchCount={query.trim() ? searchResults.length : null}
                searchResults={searchResults}
                onExpandAll={handleExpandAll}
                onCollapseAll={handleCollapseAll}
              />

              <div className="relative flex-1 overflow-hidden min-h-0">
                {error ? (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#060a10]/90 p-6">
                    <div className="max-w-md p-6 rounded-xl border border-white/[0.08] bg-slate-950/90 text-center">
                      <AlertCircle className="w-7 h-7 text-rose-400 mx-auto" />
                      <h2 className="mt-3 text-base font-semibold text-white">
                        Graph could not be loaded
                      </h2>
                      <p className="mt-1 text-xs text-muted-foreground">{error}</p>
                      <button
                        type="button"
                        onClick={refreshGraph}
                        className="mt-4 graph-action mx-auto"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Try Again
                      </button>
                    </div>
                  </div>
                ) : !visibleNodes.length && fullGraph?.nodes.length ? (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#060a10]/85 p-6">
                    <div className="max-w-md p-6 rounded-xl border border-white/[0.08] bg-slate-950/90 text-center">
                      <SearchX className="w-7 h-7 text-amber-400 mx-auto" />
                      <h2 className="mt-3 text-base font-semibold text-white">
                        Filters hide every node
                      </h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Enable at least one node type or relationship to view the graph.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveNodeTypes(new Set(ALL_NODE_TYPES));
                          setActiveRelationships(new Set(ALL_RELATIONSHIPS));
                        }}
                        className="mt-4 graph-action mx-auto"
                      >
                        Reset Filters
                      </button>
                    </div>
                  </div>
                ) : (
                  <GraphCanvas
                    graphKey={`${selectedProjectId}:${graphVersion}:${focusDepth}:${isFocused ? selectedNodeId : "all"}:${expandedNodeIds.size}`}
                    nodes={visibleNodes}
                    edges={visibleEdges}
                    fitViewRequest={fitViewRequest}
                    focusNodeId={selectedNodeId}
                    isSearching={Boolean(query.trim())}
                    matchedNodeIds={visibleMatchingNodeIds}
                    onNodeSelect={handleNodeSelect}
                    onPaneClick={() => setSelectedNodeId(null)}
                    depth={focusDepth}
                    isLoading={isLoadingGraph}
                    connectedNodeIds={connectedNodeIds}
                    isFocused={isFocused}
                    expandedNodeIds={expandedNodeIds}
                    onToggleExpand={handleToggleExpand}
                  />
                )}

                {/* Truncated notice banner */}
                {fullGraph?.truncated && (
                  <p className="pointer-events-none absolute bottom-4 left-1/2 z-20 max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-md border border-amber-400/25 bg-slate-950/90 px-3 py-1.5 text-center font-mono text-[10px] text-amber-100 shadow-lg shadow-slate-950/50 backdrop-blur">
                    View capped at 500 nodes and 1,000 edges. Search and Focus remain available for the full codebase.
                  </p>
                )}
              </div>
            </div>

            {/* ── Right Sidebar: Node Details ─────────────────────────────── */}
            <aside className="lg:col-start-2 2xl:col-start-auto lg:border-t 2xl:border-t-0 2xl:border-l border-white/[0.06] bg-gradient-to-b from-[#0a0d16]/95 to-[#070910]/95 min-h-[360px] 2xl:min-h-0 2xl:overflow-y-auto">
              <GraphInspector
                className="h-full border-0"
                node={selectedNode}
                edges={architectureTree?.allEdges ?? []}
                nodesById={nodesById}
                projectName={selectedProject?.name ?? null}
                projectId={selectedProjectId}
                depth={focusDepth}
                isExpanded={selectedNodeId ? expandedNodeIds.has(selectedNodeId) : false}
                onToggleExpand={handleToggleExpand}
                onClose={() => setSelectedNodeId(null)}
                onNodeSelect={handleNodeSelect}
              />
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function GraphPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-[#06070c]">
          <div className="text-center p-8 rounded-2xl border border-white/[0.08] bg-[#0a0d16]/80 backdrop-blur-xl">
            <RefreshCw className="w-7 h-7 text-primary animate-spin mx-auto" />
            <p className="mt-4 font-mono text-[12px] text-white">Loading graph workspace…</p>
          </div>
        </div>
      }
    >
      <GraphPageInner />
    </Suspense>
  );
}
