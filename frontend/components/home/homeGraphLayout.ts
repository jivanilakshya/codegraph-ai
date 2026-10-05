/**
 * Graph layout utilities for the home page demo GraphExplorer.
 * Uses the existing `dagre` package (already in package.json).
 * Isolated from production graph services.
 */

import dagre from "dagre";

import type { HomeGraphData, HomeGraphEdge, HomeGraphNode } from "./homeDemoGraph";

export interface LaidNode extends HomeGraphNode {
  x: number;
  y: number;
  r: number;
  degree: number;
}

export interface LaidEdge extends HomeGraphEdge {
  d: string;
}

export interface HomeLayout {
  nodes: LaidNode[];
  edges: LaidEdge[];
  width: number;
  height: number;
}

export function homeNeighbors(graph: HomeGraphData, id: string) {
  const incoming = new Set<string>(),
    outgoing = new Set<string>();
  for (const e of graph.edges) {
    if (e.target === id && e.source !== id) incoming.add(e.source);
    if (e.source === id && e.target !== id) outgoing.add(e.target);
  }
  return { incoming, outgoing, all: new Set([...incoming, ...outgoing]) };
}

export function homeSubgraph(
  graph: HomeGraphData,
  center: string | null,
  depth: number
): HomeGraphData {
  if (!center) return graph;
  const seen = new Set([center]);
  let frontier = [center];
  for (let i = 0; i < depth; i++) {
    const next: string[] = [];
    for (const id of frontier)
      for (const n of homeNeighbors(graph, id).all)
        if (!seen.has(n)) {
          seen.add(n);
          next.push(n);
        }
    frontier = next;
  }
  return {
    ...graph,
    nodes: graph.nodes.filter((n) => seen.has(n.id)),
    edges: graph.edges.filter(
      (e) => seen.has(e.source) && seen.has(e.target)
    ),
  };
}

export function homeLayoutGraph(
  graph: HomeGraphData,
  degrees: Map<string, number>
): HomeLayout {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 26, ranksep: 90, marginx: 30, marginy: 30 });
  g.setDefaultEdgeLabel(() => ({}));
  const radius = (id: string) =>
    5 + Math.min(7, (degrees.get(id) ?? 0) * 0.8);
  for (const n of graph.nodes)
    g.setNode(n.id, {
      width: Math.max(n.label.length * 6.6, radius(n.id) * 2),
      height: radius(n.id) * 2 + 18,
    });
  for (const e of graph.edges) g.setEdge(e.source, e.target);
  dagre.layout(g);

  const pos = new Map<string, LaidNode>();
  const nodes = graph.nodes.map((n) => {
    const p = g.node(n.id);
    const laid: LaidNode = {
      ...n,
      x: p.x,
      y: p.y - 7,
      r: radius(n.id),
      degree: degrees.get(n.id) ?? 0,
    };
    pos.set(n.id, laid);
    return laid;
  });

  const edges = graph.edges.map((e) => {
    const a = pos.get(e.source)!;
    const b = pos.get(e.target)!;
    const dir = b.x >= a.x ? 1 : -1;
    const sx = a.x + dir * (a.r + 1),
      ex = b.x - dir * (b.r + 5);
    const mx = (sx + ex) / 2;
    return { ...e, d: `M${sx},${a.y} C${mx},${a.y} ${mx},${b.y} ${ex},${b.y}` };
  });

  const info = g.graph();
  return { nodes, edges, width: info.width ?? 0, height: info.height ?? 0 };
}
