"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, GitBranch } from "lucide-react";

export type DemoNodeType = "PROJECT" | "FILE" | "CLASS" | "FUNCTION" | "API" | "DATABASE" | "SERVICE";

export interface DemoNode {
  id: string;
  type: DemoNodeType;
  label: string;
  sublabel?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  layer: number; // 1 to 5 for step-by-step reveal
}

export interface DemoEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  layer: number;
}

export function DemoCodeGraph() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [animationStep, setAnimationStep] = useState(0); // 0 -> 5
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Nodes dataset (26 Nodes)
  const nodes: DemoNode[] = useMemo(
    () => [
      // Layer 1: Root Project
      { id: "project", type: "PROJECT", label: "codegraph-ai", sublabel: "Repository Root", x: 500, y: 45, width: 140, height: 44, layer: 1 },

      // Layer 2: Directories & Files
      { id: "dir_backend", type: "FILE", label: "backend/", sublabel: "Directory", x: 260, y: 130, width: 110, height: 38, layer: 2 },
      { id: "dir_frontend", type: "FILE", label: "frontend/", sublabel: "Directory", x: 740, y: 130, width: 110, height: 38, layer: 2 },
      { id: "file_auth", type: "FILE", label: "auth.py", sublabel: "Python File", x: 120, y: 215, width: 105, height: 38, layer: 2 },
      { id: "file_user", type: "FILE", label: "user_service.py", sublabel: "Python File", x: 300, y: 215, width: 125, height: 38, layer: 2 },
      { id: "file_graph", type: "FILE", label: "graph_service.py", sublabel: "Python File", x: 500, y: 215, width: 135, height: 38, layer: 2 },
      { id: "file_api", type: "FILE", label: "api_router.py", sublabel: "FastAPI Router", x: 700, y: 215, width: 125, height: 38, layer: 2 },
      { id: "file_app", type: "FILE", label: "page.tsx", sublabel: "Next.js Page", x: 880, y: 215, width: 105, height: 38, layer: 2 },

      // Layer 3: Services & Classes
      { id: "cls_auth", type: "CLASS", label: "AuthService", sublabel: "Class", x: 120, y: 305, width: 115, height: 38, layer: 3 },
      { id: "cls_user", type: "CLASS", label: "UserService", sublabel: "Class", x: 300, y: 305, width: 115, height: 38, layer: 3 },
      { id: "cls_graph", type: "CLASS", label: "GraphService", sublabel: "Class", x: 500, y: 305, width: 120, height: 38, layer: 3 },
      { id: "cls_rag", type: "SERVICE", label: "RAGEngine", sublabel: "Service", x: 700, y: 305, width: 115, height: 38, layer: 3 },
      { id: "cls_react", type: "CLASS", label: "GraphCanvas", sublabel: "React Flow", x: 880, y: 305, width: 115, height: 38, layer: 3 },

      // Layer 4: Functions & Endpoints
      { id: "fn_login", type: "FUNCTION", label: "login()", sublabel: "Function", x: 70, y: 395, width: 90, height: 36, layer: 4 },
      { id: "fn_verify", type: "FUNCTION", label: "verifyToken()", sublabel: "Function", x: 180, y: 395, width: 105, height: 36, layer: 4 },
      { id: "fn_getUser", type: "FUNCTION", label: "getUser()", sublabel: "Function", x: 300, y: 395, width: 95, height: 36, layer: 4 },
      { id: "fn_syncGraph", type: "FUNCTION", label: "syncGraph()", sublabel: "Function", x: 420, y: 395, width: 100, height: 36, layer: 4 },
      { id: "fn_cypher", type: "FUNCTION", label: "readCypher()", sublabel: "Function", x: 540, y: 395, width: 105, height: 36, layer: 4 },
      { id: "fn_rag", type: "FUNCTION", label: "askStream()", sublabel: "Function", x: 660, y: 395, width: 95, height: 36, layer: 4 },
      { id: "api_users", type: "API", label: "GET /users", sublabel: "API Endpoint", x: 775, y: 395, width: 105, height: 36, layer: 4 },
      { id: "api_graph", type: "API", label: "GET /graph", sublabel: "API Endpoint", x: 900, y: 395, width: 105, height: 36, layer: 4 },

      // Layer 5: Databases & Runtimes
      { id: "db_postgres", type: "DATABASE", label: "PostgreSQL", sublabel: "Relational DB", x: 240, y: 485, width: 115, height: 40, layer: 5 },
      { id: "db_neo4j", type: "DATABASE", label: "Neo4j 5", sublabel: "Graph DB", x: 480, y: 485, width: 105, height: 40, layer: 5 },
      { id: "db_qdrant", type: "DATABASE", label: "Qdrant", sublabel: "Vector Store", x: 660, y: 485, width: 100, height: 40, layer: 5 },
      { id: "llm_ollama", type: "SERVICE", label: "Ollama LLM", sublabel: "qwen2.5-coder", x: 830, y: 485, width: 115, height: 40, layer: 5 },
    ],
    []
  );

  // Edges dataset
  const edges: DemoEdge[] = useMemo(
    () => [
      { id: "e1", source: "project", target: "dir_backend", label: "CONTAINS", layer: 2 },
      { id: "e2", source: "project", target: "dir_frontend", label: "CONTAINS", layer: 2 },
      { id: "e3", source: "dir_backend", target: "file_auth", label: "CONTAINS", layer: 2 },
      { id: "e4", source: "dir_backend", target: "file_user", label: "CONTAINS", layer: 2 },
      { id: "e5", source: "dir_backend", target: "file_graph", label: "CONTAINS", layer: 2 },
      { id: "e6", source: "dir_backend", target: "file_api", label: "CONTAINS", layer: 2 },
      { id: "e7", source: "dir_frontend", target: "file_app", label: "CONTAINS", layer: 2 },
      { id: "e8", source: "file_auth", target: "cls_auth", label: "DECLARES", layer: 3 },
      { id: "e9", source: "file_user", target: "cls_user", label: "DECLARES", layer: 3 },
      { id: "e10", source: "file_graph", target: "cls_graph", label: "DECLARES", layer: 3 },
      { id: "e11", source: "file_api", target: "cls_rag", label: "DECLARES", layer: 3 },
      { id: "e12", source: "file_app", target: "cls_react", label: "DECLARES", layer: 3 },
      { id: "e13", source: "cls_auth", target: "fn_login", label: "HAS_METHOD", layer: 4 },
      { id: "e14", source: "cls_auth", target: "fn_verify", label: "HAS_METHOD", layer: 4 },
      { id: "e15", source: "cls_user", target: "fn_getUser", label: "HAS_METHOD", layer: 4 },
      { id: "e16", source: "cls_graph", target: "fn_syncGraph", label: "HAS_METHOD", layer: 4 },
      { id: "e17", source: "cls_graph", target: "fn_cypher", label: "HAS_METHOD", layer: 4 },
      { id: "e18", source: "cls_rag", target: "fn_rag", label: "HAS_METHOD", layer: 4 },
      { id: "e19", source: "file_api", target: "api_users", label: "HANDLES", layer: 4 },
      { id: "e20", source: "file_api", target: "api_graph", label: "HANDLES", layer: 4 },
      { id: "e21", source: "fn_getUser", target: "db_postgres", label: "USES", layer: 5 },
      { id: "e22", source: "fn_syncGraph", target: "db_neo4j", label: "USES", layer: 5 },
      { id: "e23", source: "fn_cypher", target: "db_neo4j", label: "USES", layer: 5 },
      { id: "e24", source: "fn_rag", target: "db_qdrant", label: "USES", layer: 5 },
      { id: "e25", source: "fn_rag", target: "llm_ollama", label: "CALLS", layer: 5 },
      { id: "e26", source: "api_users", target: "fn_getUser", label: "CALLS", layer: 4 },
      { id: "e27", source: "api_graph", target: "fn_cypher", label: "CALLS", layer: 4 },
      { id: "e28", source: "cls_react", target: "api_graph", label: "FETCHES", layer: 4 },
    ],
    []
  );

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  // Connected mapping for hover states
  const connectedMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    nodes.forEach((n) => map.set(n.id, new Set([n.id])));
    edges.forEach((e) => {
      map.get(e.source)?.add(e.target);
      map.get(e.target)?.add(e.source);
    });
    return map;
  }, [nodes, edges]);

  // IntersectionObserver to trigger animation when scrolled into view
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Step-by-step progressive reveal animation
  useEffect(() => {
    if (!isVisible) return;

    const steps = [
      setTimeout(() => setAnimationStep(1), 200), // Step 1: Project Node
      setTimeout(() => setAnimationStep(2), 600), // Step 2: Directories & Files
      setTimeout(() => setAnimationStep(3), 1100), // Step 3: Classes & Services
      setTimeout(() => setAnimationStep(4), 1600), // Step 4: Functions & APIs
      setTimeout(() => setAnimationStep(5), 2100), // Step 5: Full Graph Active
    ];

    return () => steps.forEach(clearTimeout);
  }, [isVisible]);

  const activeConnectedSet = useMemo(() => {
    if (!hoveredNodeId) return null;
    return connectedMap.get(hoveredNodeId) ?? null;
  }, [hoveredNodeId, connectedMap]);

  const hoveredNode = useMemo(() => {
    if (!hoveredNodeId) return null;
    return nodeMap.get(hoveredNodeId) ?? null;
  }, [hoveredNodeId, nodeMap]);

  const activeEdges = useMemo(() => {
    if (!hoveredNodeId) return null;
    return new Set(
      edges.filter((e) => e.source === hoveredNodeId || e.target === hoveredNodeId).map((e) => e.id)
    );
  }, [hoveredNodeId, edges]);

  return (
    <section id="graph" ref={containerRef} className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-[#252525]">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#737373] mb-3">
          <span className="size-1.5 rounded-full bg-white animate-ping" />
          STRUCTURAL CODE INTELLIGENCE
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
          Multi-Layer Code Understanding
        </h2>
        <p className="mt-4 text-sm sm:text-base text-[#A3A3A3] leading-relaxed">
          CodeGraph AI maps repositories into connected relationships between files, symbols, functions, APIs, and dependencies.
        </p>
      </div>

      {/* Main Graph Canvas Frame */}
      <div className="relative w-full rounded-2xl border border-[#252525] bg-[#050505] p-4 sm:p-6 shadow-2xl overflow-hidden min-h-[560px] sm:min-h-[620px] flex flex-col justify-between">
        {/* Subtle Background Grid */}
        <div className="absolute inset-0 technical-grid opacity-30 pointer-events-none" />

        {/* Header Bar inside Canvas */}
        <div className="relative z-20 flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1c1c1c] text-xs font-mono text-[#737373]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-white font-semibold">
              <GitBranch className="size-3.5" /> codegraph-ai / main
            </span>
            <span>•</span>
            <span className="text-[#A3A3A3]">26 AST Nodes</span>
            <span>•</span>
            <span className="text-[#A3A3A3]">28 Relationship Edges</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-white" /> Live Pipeline Stream
            </span>
            <span className="hidden sm:inline">Neo4j Cypher + Qdrant</span>
          </div>
        </div>

        {/* Interactive SVG Canvas */}
        <div className="relative w-full h-[460px] sm:h-[500px] my-auto overflow-hidden">
          <svg
            viewBox="0 0 1000 520"
            className="w-full h-full select-none"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#737373" stopOpacity="0.15" />
              </linearGradient>
            </defs>

            {/* Render Edges */}
            {edges.map((edge) => {
              const src = nodeMap.get(edge.source);
              const tgt = nodeMap.get(edge.target);
              if (!src || !tgt) return null;

              // Hide edges before layer step is reached
              if (animationStep < edge.layer) return null;

              const isHighlighted = activeEdges ? activeEdges.has(edge.id) : false;
              const isDimmed = activeEdges !== null && !isHighlighted;

              // Curved path calculation
              const dy = tgt.y - src.y;
              const controlY = src.y + dy * 0.5;
              const pathD = `M ${src.x} ${src.y + 18} C ${src.x} ${controlY}, ${tgt.x} ${controlY}, ${tgt.x} ${tgt.y - 18}`;

              return (
                <g key={edge.id} className="transition-all duration-300">
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isHighlighted ? "#ffffff" : isDimmed ? "#1c1c1c" : "rgba(255, 255, 255, 0.15)"}
                    strokeWidth={isHighlighted ? "2" : "1"}
                    className="transition-all duration-300"
                  />

                  {/* Flowing Particle along Path when active */}
                  {animationStep >= 4 && !isDimmed && (
                    <circle
                      r={isHighlighted ? "3" : "1.8"}
                      fill="#ffffff"
                      opacity={isHighlighted ? "0.9" : "0.5"}
                    >
                      <animateMotion
                        path={pathD}
                        dur={`${3.5 + (src.x % 3)}s`}
                        repeatCount="indefinite"
                        begin={`${(src.y % 2) * 0.5}s`}
                      />
                    </circle>
                  )}
                </g>
              );
            })}

            {/* Render Nodes */}
            {nodes.map((node) => {
              if (animationStep < node.layer) return null;

              const isSelected = hoveredNodeId === node.id;
              const isConnected = activeConnectedSet ? activeConnectedSet.has(node.id) : true;
              const isDimmed = activeConnectedSet !== null && !isConnected;

              const width = node.width ?? 110;
              const height = node.height ?? 38;
              const halfW = width / 2;
              const halfH = height / 2;

              const badgeText = node.type;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  className="cursor-pointer transition-all duration-300"
                  style={{
                    opacity: isDimmed ? 0.25 : 1,
                    transform: isSelected ? `translate(${node.x}px, ${node.y - 2}px) scale(1.05)` : `translate(${node.x}px, ${node.y}px)`,
                    transformOrigin: "center center",
                  }}
                >
                  {/* Node Outer Box */}
                  <rect
                    x={-halfW}
                    y={-halfH}
                    width={width}
                    height={height}
                    rx="6"
                    fill={isSelected ? "#141414" : "#0D0D0D"}
                    stroke={isSelected ? "#ffffff" : isConnected && hoveredNodeId ? "#555555" : "#252525"}
                    strokeWidth={isSelected ? "1.5" : "1"}
                    className="transition-all duration-200"
                  />

                  {/* Node Header Badge Type */}
                  <text
                    x={-halfW + 8}
                    y={-halfH + 13}
                    fill={isSelected ? "#ffffff" : "#737373"}
                    fontSize="7.5"
                    fontFamily="monospace"
                    fontWeight="600"
                    letterSpacing="0.5"
                  >
                    {badgeText}
                  </text>

                  {/* Node Title Label */}
                  <text
                    x={-halfW + 8}
                    y={-halfH + 27}
                    fill="#ffffff"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="600"
                  >
                    {node.label}
                  </text>

                  {/* Subtle Indicator Icon Dot */}
                  <circle
                    cx={halfW - 10}
                    cy={-halfH + 12}
                    r="2"
                    fill={isSelected ? "#ffffff" : "#404040"}
                  />
                </g>
              );
            })}
          </svg>

          {/* Interactive Tooltip Card on Hover */}
          {hoveredNode && (
            <div className="absolute top-4 right-4 z-30 p-4 rounded-xl border border-[#333333] bg-black/90 backdrop-blur-md shadow-2xl max-w-xs font-mono text-xs text-white animate-fade-in pointer-events-none">
              <div className="flex items-center justify-between pb-2 border-b border-[#252525]">
                <span className="text-[10px] text-[#737373] uppercase font-bold">{hoveredNode.type}</span>
                <span className="text-[10px] text-white bg-[#141414] px-1.5 py-0.5 rounded border border-[#252525]">
                  Layer {hoveredNode.layer}
                </span>
              </div>
              <div className="mt-2.5 font-bold text-sm text-white">{hoveredNode.label}</div>
              <div className="mt-1 text-[11px] text-[#A3A3A3]">{hoveredNode.sublabel || "Extracted AST Node"}</div>
              <div className="mt-3 pt-2 border-t border-[#1c1c1c] text-[10px] text-[#737373] flex items-center justify-between">
                <span>Active Hops: {connectedMap.get(hoveredNode.id)?.size ?? 1} Nodes</span>
                <ArrowUpRight className="size-3 text-white" />
              </div>
            </div>
          )}
        </div>

        {/* Footer Pipeline Step Progress Indicators */}
        <div className="relative z-20 pt-4 border-t border-[#1c1c1c] flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-[#737373]">
          <div className="flex items-center gap-6">
            <span className={`flex items-center gap-1.5 transition-colors ${animationStep >= 1 ? "text-white font-semibold" : ""}`}>
              <span className={`size-1.5 rounded-full ${animationStep >= 1 ? "bg-white" : "bg-[#333333]"}`} /> 01. Repository
            </span>
            <span className={`flex items-center gap-1.5 transition-colors ${animationStep >= 2 ? "text-white font-semibold" : ""}`}>
              <span className={`size-1.5 rounded-full ${animationStep >= 2 ? "bg-white" : "bg-[#333333]"}`} /> 02. Files & AST
            </span>
            <span className={`flex items-center gap-1.5 transition-colors ${animationStep >= 3 ? "text-white font-semibold" : ""}`}>
              <span className={`size-1.5 rounded-full ${animationStep >= 3 ? "bg-white" : "bg-[#333333]"}`} /> 03. Classes & Functions
            </span>
            <span className={`flex items-center gap-1.5 transition-colors ${animationStep >= 4 ? "text-white font-semibold" : ""}`}>
              <span className={`size-1.5 rounded-full ${animationStep >= 4 ? "bg-white" : "bg-[#333333]"}`} /> 04. Graph & Vector AI
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-[#A3A3A3] hidden lg:inline">Hover nodes to inspect pathways</span>
            <Link href="/graph" className="text-white hover:underline flex items-center gap-1 font-semibold">
              Open Interactive Graph <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
