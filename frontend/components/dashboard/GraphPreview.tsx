"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Network, X, ArrowUpRight } from "lucide-react";

type GNode = {
  id: string;
  label: string;
  kind: "file" | "function" | "class";
  x: number;
  y: number;
};

const PREVIEW_NODES: GNode[] = [
  { id: "main", label: "main.py", kind: "file", x: 120, y: 200 },
  { id: "routes", label: "api/routes.py", kind: "file", x: 300, y: 80 },
  { id: "builder", label: "graph/builder.py", kind: "file", x: 470, y: 210 },
  { id: "walker", label: "parser/ast_walker.py", kind: "file", x: 300, y: 330 },
  { id: "neo", label: "db/neo4j.py", kind: "file", x: 680, y: 110 },
  { id: "GraphBuilder", label: "GraphBuilder", kind: "class", x: 600, y: 300 },
  { id: "ASTWalker", label: "ASTWalker", kind: "class", x: 170, y: 380 },
  { id: "Neo4jClient", label: "Neo4jClient", kind: "class", x: 800, y: 230 },
  { id: "parse_file", label: "parse_file()", kind: "function", x: 440, y: 400 },
  { id: "build_graph", label: "build_graph()", kind: "function", x: 470, y: 60 },
  { id: "resolve_calls", label: "resolve_calls()", kind: "function", x: 760, y: 380 },
  { id: "scan_repo", label: "scan_repo()", kind: "function", x: 110, y: 70 },
];

const PREVIEW_EDGES: [string, string][] = [
  ["main", "routes"],
  ["main", "walker"],
  ["main", "scan_repo"],
  ["routes", "build_graph"],
  ["routes", "builder"],
  ["builder", "GraphBuilder"],
  ["builder", "neo"],
  ["walker", "ASTWalker"],
  ["walker", "parse_file"],
  ["GraphBuilder", "resolve_calls"],
  ["GraphBuilder", "parse_file"],
  ["neo", "Neo4jClient"],
  ["Neo4jClient", "resolve_calls"],
  ["build_graph", "neo"],
  ["scan_repo", "routes"],
];

const KIND_COLOR = {
  file: "#38bdf8",
  function: "#00e5ff",
  class: "#a78bfa",
};

export function GraphPreview({
  projectName,
  projectId,
  totalNodes = 43,
  onClose,
}: {
  projectName: string;
  projectId?: number | null;
  totalNodes?: number;
  onClose: () => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>("builder");

  const focus = hover ?? selected;
  const neighbors = useMemo(() => {
    const s = new Set<string>([focus]);
    PREVIEW_EDGES.forEach(([a, b]) => {
      if (a === focus) s.add(b);
      if (b === focus) s.add(a);
    });
    return s;
  }, [focus]);

  const byId = useMemo(
    () => Object.fromEntries(PREVIEW_NODES.map((n) => [n.id, n])),
    []
  );
  const sel = byId[selected] || PREVIEW_NODES[0];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-8 animate-fade-in">
      <div
        className="absolute inset-0 bg-[#03040a]/85 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative w-full max-w-6xl h-[82vh] rounded-2xl border border-cyan-300/15 bg-[#070910]/95 shadow-[0_0_80px_-20px_rgba(0,229,255,0.35)] flex flex-col overflow-hidden reveal">
        <div className="absolute inset-x-0 top-0 h-px cg-hairline" />

        {/* Top Header */}
        <div className="h-12 px-4 border-b border-white/[0.06] flex justify-between items-center">
          <div className="flex items-center gap-3 min-w-0">
            <Network className="w-4 h-4 text-primary" />
            <span className="cg-label !text-foreground">Knowledge Graph</span>
            <span className="font-mono text-[11px] text-muted-foreground truncate">
              / {projectName}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4 font-mono text-[10.5px] text-muted-foreground">
              {(["file", "function", "class"] as const).map((k) => (
                <span key={k} className="flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: KIND_COLOR[k] }}
                  />
                  {k}
                </span>
              ))}
            </div>

            {projectId && (
              <Link
                href={`/graph?projectId=${projectId}`}
                className="hidden sm:inline-flex items-center gap-1 font-mono text-[11px] text-primary hover:underline"
              >
                <span>Open Full Graph</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Close graph preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Graph Visual Area */}
        <div className="flex-1 flex min-h-0">
          <div className="relative flex-1 overflow-hidden">
            <div className="absolute inset-0 cg-grid opacity-60" />
            <svg viewBox="0 0 920 460" className="absolute inset-0 w-full h-full">
              {PREVIEW_EDGES.map(([a, b], i) => {
                const A = byId[a];
                const B = byId[b];
                if (!A || !B) return null;
                const lit =
                  neighbors.has(a) &&
                  neighbors.has(b) &&
                  (a === focus || b === focus);
                return (
                  <g key={i}>
                    <line
                      x1={A.x}
                      y1={A.y}
                      x2={B.x}
                      y2={B.y}
                      stroke={lit ? "#00e5ff" : "#94a3b8"}
                      strokeOpacity={lit ? 0.7 : 0.14}
                      strokeWidth={lit ? 1.4 : 1}
                      className="transition-all duration-300"
                    />
                    {lit && (
                      <line
                        x1={A.x}
                        y1={A.y}
                        x2={B.x}
                        y2={B.y}
                        stroke="#e0fbff"
                        strokeWidth={1.6}
                        className="cg-edge-live"
                      />
                    )}
                  </g>
                );
              })}
              {PREVIEW_NODES.map((n) => {
                const dim = !neighbors.has(n.id);
                const isSel = n.id === selected;
                const c = KIND_COLOR[n.kind];
                return (
                  <g
                    key={n.id}
                    transform={`translate(${n.x},${n.y})`}
                    className="cursor-pointer"
                    onMouseEnter={() => setHover(n.id)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => setSelected(n.id)}
                    opacity={dim ? 0.3 : 1}
                  >
                    {isSel && (
                      <circle
                        r="18"
                        fill={c}
                        opacity="0.12"
                        className="cg-node"
                      />
                    )}
                    {n.kind === "class" ? (
                      <rect
                        x="-7"
                        y="-7"
                        width="14"
                        height="14"
                        rx="3"
                        fill="#0b0e18"
                        stroke={c}
                        strokeWidth="1.5"
                        transform="rotate(45)"
                      />
                    ) : (
                      <circle
                        r={n.kind === "file" ? 8 : 5.5}
                        fill="#0b0e18"
                        stroke={c}
                        strokeWidth="1.5"
                      />
                    )}
                    <circle r="2" fill={c} />
                    <text
                      y={n.kind === "function" ? -12 : -15}
                      textAnchor="middle"
                      className="font-mono select-none"
                      fontSize="11"
                      fill={isSel ? "#fff" : "#9aa6b8"}
                    >
                      {n.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            <div className="absolute bottom-4 left-4 font-mono text-[10.5px] text-muted-foreground flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.06] bg-black/40 backdrop-blur">
              <span className="w-1.5 h-1.5 rounded-full bg-primary cg-node" />
              preview · 12 of {totalNodes} nodes · click a node to inspect
            </div>
          </div>

          {/* Right Inspector Panel */}
          <aside className="hidden md:flex w-64 border-l border-white/[0.06] p-5 flex-col gap-5">
            <div>
              <div className="cg-label mb-2">Selected</div>
              <div className="text-white font-medium font-mono text-sm break-all">
                {sel.label}
              </div>
              <div
                className="mt-1 inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-wider"
                style={{ color: KIND_COLOR[sel.kind] }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: KIND_COLOR[sel.kind] }}
                />
                {sel.kind}
              </div>
            </div>

            <div>
              <div className="cg-label mb-2">Relationships</div>
              <ul className="space-y-1.5">
                {PREVIEW_EDGES.filter(
                  ([a, b]) => a === selected || b === selected
                ).map(([a, b]) => {
                  const other = byId[a === selected ? b : a];
                  if (!other) return null;
                  return (
                    <li key={a + b}>
                      <button
                        onClick={() => setSelected(other.id)}
                        className="w-full flex items-center gap-2 text-left font-mono text-[12px] text-foreground/80 hover:text-primary transition-colors"
                      >
                        <span className="text-white/25">
                          {a === selected ? "→" : "←"}
                        </span>
                        {other.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {projectId && (
              <div className="mt-auto pt-4 border-t border-white/[0.06]">
                <Link
                  href={`/graph?projectId=${projectId}`}
                  className="w-full inline-flex items-center justify-center gap-2 h-9 px-3 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-mono font-medium hover:bg-primary/20 transition-all"
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>Launch Full Graph</span>
                </Link>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
