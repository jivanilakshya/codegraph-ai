"use client";

import React from "react";

function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

const HERO_GRAPH = (() => {
  const r = seeded(42);
  const nodes = Array.from({ length: 30 }, (_, i) => ({
    x: 360 + r() * 640,
    y: 20 + r() * 300,
    r: i % 7 === 0 ? 3.2 : 1.4 + r() * 1.2,
    d: r() * 4.5,
  }));
  const edges: [number, number][] = [];
  nodes.forEach((a, i) => {
    nodes
      .map((b, j) => ({ j, dist: Math.hypot(a.x - b.x, a.y - b.y) }))
      .filter((o) => o.j > i)
      .sort((p, q) => p.dist - q.dist)
      .slice(0, 2)
      .forEach((o) => edges.push([i, o.j]));
  });
  return { nodes, edges };
})();

export function HeroGraph() {
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
      <svg
        className="absolute inset-0 w-full h-full cg-drift"
        viewBox="0 0 1000 340"
        preserveAspectRatio="xMaxYMid slice"
      >
        <defs>
          <radialGradient id="hg-fade" cx="75%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#fff" stopOpacity="1" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <mask id="hg-mask">
            <rect width="1000" height="340" fill="url(#hg-fade)" />
          </mask>
        </defs>
        <g mask="url(#hg-mask)">
          {HERO_GRAPH.edges.map(([a, b], i) => {
            const A = HERO_GRAPH.nodes[a];
            const B = HERO_GRAPH.nodes[b];
            return (
              <g key={i}>
                <line
                  x1={A.x}
                  y1={A.y}
                  x2={B.x}
                  y2={B.y}
                  stroke="#7dd3fc"
                  strokeOpacity="0.12"
                  strokeWidth="0.7"
                />
                {i % 5 === 0 && (
                  <line
                    x1={A.x}
                    y1={A.y}
                    x2={B.x}
                    y2={B.y}
                    stroke="#00e5ff"
                    strokeOpacity="0.55"
                    strokeWidth="0.9"
                    className="cg-edge-live"
                    style={{ animationDelay: `${i * 0.37}s` }}
                  />
                )}
              </g>
            );
          })}
          {HERO_GRAPH.nodes.map((n, i) => (
            <g key={i}>
              {n.r > 3 && <circle cx={n.x} cy={n.y} r={10} fill="#00e5ff" opacity="0.06" />}
              <circle
                cx={n.x}
                cy={n.y}
                r={n.r}
                fill={i % 9 === 0 ? "#a78bfa" : "#67e8f9"}
                className="cg-node"
                style={{ animationDelay: `${n.d}s` }}
              />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
