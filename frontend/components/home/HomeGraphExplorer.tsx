"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { homeDemoGraph } from "./homeDemoGraph";
import {
  homeLayoutGraph,
  homeNeighbors,
  homeSubgraph,
} from "./homeGraphLayout";

interface View {
  x: number;
  y: number;
  k: number;
}

const MIN_K = 0.25,
  MAX_K = 3;

/**
 * Home-page interactive graph showcase.
 * Uses static demo data only — no backend dependency.
 * The production knowledge graph is at /graph.
 */
export default function HomeGraphExplorer() {
  const graph = homeDemoGraph;

  const [selected, setSelected] = useState<string | null>(null);
  const [depth, setDepth] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 820 ? 1 : 2
  );
  const [hover, setHover] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"details" | "related">("details");
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const [dragging, setDragging] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ sx: number; sy: number; vx: number; vy: number } | null>(null);

  // Pre-compute degrees for the full graph
  const degrees = useMemo(() => {
    const d = new Map<string, number>();
    for (const e of graph.edges) {
      d.set(e.source, (d.get(e.source) ?? 0) + 1);
      d.set(e.target, (d.get(e.target) ?? 0) + 1);
    }
    return d;
  }, [graph]);

  // Pick default selected node (highest degree)
  useEffect(() => {
    const top = [...degrees.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top) setSelected(top[0]);
  }, [degrees]);

  const visible = useMemo(
    () => homeSubgraph(graph, selected, depth),
    [graph, selected, depth]
  );
  const layout = useMemo(
    () => homeLayoutGraph(visible, degrees),
    [visible, degrees]
  );
  const byId = useMemo(
    () => new Map(graph.nodes.map((n) => [n.id, n])),
    [graph]
  );
  const node = selected ? byId.get(selected) : undefined;
  const links = useMemo(
    () => (selected ? homeNeighbors(graph, selected) : null),
    [graph, selected]
  );

  const importantThreshold = useMemo(() => {
    const sorted = [...degrees.values()].sort((a, b) => b - a);
    return sorted[Math.min(4, sorted.length - 1)] ?? Infinity;
  }, [degrees]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) =>
      setSize({
        w: entry.contentRect.width,
        h: entry.contentRect.height,
      })
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fit = useCallback(() => {
    if (!layout || !size.w || !layout.width) return;
    const k = Math.min(size.w / layout.width, size.h / layout.height, 1.4);
    setView({
      k,
      x: (size.w - layout.width * k) / 2,
      y: (size.h - layout.height * k) / 2,
    });
  }, [layout, size]);

  useEffect(fit, [fit]);

  const zoomAt = useCallback((f: number, cx: number, cy: number) => {
    setView((v) => {
      const k = Math.min(MAX_K, Math.max(MIN_K, v.k * f));
      const r = k / v.k;
      return { k, x: cx - (cx - v.x) * r, y: cy - (cy - v.y) * r };
    });
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomAt(
        e.deltaY < 0 ? 1.12 : 1 / 1.12,
        e.clientX - rect.left,
        e.clientY - rect.top
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const select = (id: string) => {
    setSelected(id);
    setQuery("");
  };

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return graph.nodes
      .filter(
        (n) =>
          n.label.toLowerCase().includes(q) ||
          n.path.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [query, graph]);

  const onPointerDown = (e: React.PointerEvent) => {
    setHover(null);
    drag.current = { sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (d)
      setView((v) => ({
        ...v,
        x: d.vx + e.clientX - d.sx,
        y: d.vy + e.clientY - d.sy,
      }));
  };
  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };

  const hoverLinks = hover ? homeNeighbors(graph, hover).all : null;
  const connected = links?.all ?? new Set<string>();
  const isRelated = (id: string) => id === selected || connected.has(id);
  const direct = (a: string, b: string) =>
    (a === selected && connected.has(b)) ||
    (b === selected && connected.has(a));

  return (
    <>
      {/* Graph Toolbar */}
      <div className="graph-toolbar">
        <div className="search-wrap">
          <label className="search-field">
            <svg
              aria-hidden
              width="15"
              height="15"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <circle cx="9" cy="9" r="6" />
              <path d="m14 14 4 4" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search nodes, files, or symbols..."
              aria-label="Search graph nodes"
            />
            {query && (
              <button
                type="button"
                className="search-clear"
                aria-label="Clear search"
                onClick={() => setQuery("")}
              >
                ×
              </button>
            )}
          </label>
          {query.trim() && (
            <ul className="search-results">
              {matches.length === 0 && (
                <li className="empty">No matching nodes</li>
              )}
              {matches.map((n) => (
                <li key={n.id}>
                  <button type="button" onClick={() => select(n.id)}>
                    <b>{n.label}</b>
                    <small>{n.path}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="depth-control" role="group" aria-label="Graph depth">
          <span>Depth</span>
          {[1, 2, 3].map((d) => (
            <button
              key={d}
              type="button"
              className={depth === d ? "on" : ""}
              aria-pressed={depth === d}
              onClick={() => setDepth(d)}
            >
              {d}
            </button>
          ))}
        </div>

        {selected && (
          <button type="button" onClick={() => setSelected(null)}>
            Clear
          </button>
        )}

        <button
          type="button"
          aria-label={expanded ? "Collapse graph" : "Expand graph"}
          onClick={() => setExpanded(!expanded)}
        >
          <svg
            aria-hidden
            width="15"
            height="15"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7 3H3v4M13 3h4v4M7 17H3v-4M13 17h4v-4" />
          </svg>
        </button>
      </div>

      {/* Graph Shell */}
      <div className={expanded ? "graph-shell expanded" : "graph-shell"}>
        {/* Graph Canvas */}
        <div className="graph-canvas" ref={canvasRef}>
          {/* Zoom Controls */}
          <div className="graph-zoom">
            <button
              type="button"
              aria-label="Zoom in"
              onClick={() => zoomAt(1.25, size.w / 2, size.h / 2)}
            >
              +
            </button>
            <button
              type="button"
              aria-label="Zoom out"
              onClick={() => zoomAt(0.8, size.w / 2, size.h / 2)}
            >
              −
            </button>
            <button type="button" aria-label="Fit graph to view" onClick={fit}>
              <svg
                aria-hidden
                width="14"
                height="14"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 3H3v4M13 3h4v4M7 17H3v-4M13 17h4v-4" />
              </svg>
            </button>
          </div>

          <span className="graph-source">
            Demo · example-project · {layout.nodes.length} nodes
          </span>
          <span className="graph-hint">Drag to pan · Ctrl + scroll to zoom</span>

          {/* SVG Graph */}
          <svg
            className={
              (dragging ? "dragging " : "") + (hover ? "hovering" : "")
            }
            aria-label="Code relationship graph showcase"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <defs>
              <marker
                id="home-arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M0,1 L9,5 L0,9 z" fill="#16afa3" fillOpacity="0.6" />
              </marker>
              <marker
                id="home-arrow-hot"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M0,1 L9,5 L0,9 z" fill="#63d9ff" />
              </marker>
            </defs>

            <g
              className="viewport"
              style={{
                transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
              }}
            >
              {layout.edges.map((e) => (
                <path
                  key={`${e.source}-${e.target}`}
                  d={e.d}
                  markerEnd={
                    direct(e.source, e.target) ||
                    (hover && (e.source === hover || e.target === hover))
                      ? "url(#home-arrow-hot)"
                      : "url(#home-arrow)"
                  }
                  style={{ d: `path("${e.d}")` } as React.CSSProperties}
                  className={
                    "edge" +
                    (direct(e.source, e.target) ? " active" : "") +
                    (hover && (e.source === hover || e.target === hover)
                      ? " hot"
                      : "")
                  }
                />
              ))}

              {layout.nodes.map((n) => {
                const isSel = n.id === selected;
                const cls = isSel
                  ? "node selected"
                  : isRelated(n.id) || n.degree >= importantThreshold
                  ? "node important"
                  : "node";
                const lit =
                  !hover ||
                  n.id === hover ||
                  hoverLinks?.has(n.id) ||
                  isSel;
                const d = n.r * 1.25;
                return (
                  <g
                    key={n.id}
                    className={"node-group" + (lit ? "" : " dim")}
                    style={{ transform: `translate(${n.x}px, ${n.y}px)` }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${n.label}, ${n.kind}`}
                    aria-pressed={isSel}
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerEnter={() => setHover(n.id)}
                    onPointerLeave={() => setHover(null)}
                    onFocus={() => setHover(n.id)}
                    onBlur={() => setHover(null)}
                    onClick={() => select(n.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        select(n.id);
                      }
                    }}
                  >
                    <circle r={n.r + 8} fill="transparent" />
                    {isSel && <circle r={n.r + 7} className="sel-ring" />}
                    {n.kind === "file" ? (
                      <circle r={n.r} className={cls} />
                    ) : n.kind === "class" ? (
                      <rect
                        x={-n.r}
                        y={-n.r}
                        width={n.r * 2}
                        height={n.r * 2}
                        rx={3}
                        className={cls}
                      />
                    ) : (
                      <polygon
                        points={`0,${-d} ${d},0 0,${d} ${-d},0`}
                        className={cls}
                      />
                    )}
                    <text
                      y={n.r + 14}
                      textAnchor="middle"
                      className={
                        isSel || n.id === hover
                          ? "node-label active"
                          : "node-label"
                      }
                    >
                      {n.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Node Inspector */}
        <aside className="node-inspector">
          <div className="inspector-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "details"}
              className={tab === "details" ? "on" : ""}
              onClick={() => setTab("details")}
            >
              Node Details
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "related"}
              className={tab === "related" ? "on" : ""}
              onClick={() => setTab("related")}
            >
              Related Nodes{links ? ` (${links.all.size})` : ""}
            </button>
          </div>

          <div className="inspector-content">
            {!node || !links ? (
              <p className="inspector-empty">
                Select a node in the graph to inspect its details and
                relationships.
              </p>
            ) : tab === "details" ? (
              <>
                <div className="node-file">
                  <span>
                    <svg
                      aria-hidden
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 2h8l4 4v12H4z" />
                      <path d="M12 2v5h4M7 11h6M7 14h4" />
                    </svg>
                  </span>
                  <div>
                    <b>{node.label}</b>
                    <small>
                      {node.kind[0].toUpperCase() + node.kind.slice(1)} ·{" "}
                      {node.language}
                    </small>
                  </div>
                </div>
                <dl>
                  <dt>Path</dt>
                  <dd>{node.path}</dd>
                  <dt>Language</dt>
                  <dd>{node.language}</dd>
                  <dt>Connections</dt>
                  <dd>
                    {links.all.size} nodes
                    <br />
                    {links.incoming.size} incoming
                    <br />
                    {links.outgoing.size} outgoing
                  </dd>
                </dl>
              </>
            ) : (
              <ul className="related-list">
                {links.all.size === 0 && (
                  <li className="inspector-empty">No connected nodes.</li>
                )}
                {[...links.outgoing]
                  .map((id) => ({ id, dir: "→" }))
                  .concat([...links.incoming].map((id) => ({ id, dir: "←" })))
                  .map(({ id, dir }) => {
                    const relNode = byId.get(id);
                    if (!relNode) return null;
                    return (
                      <li key={`${dir}${id}`}>
                        <button type="button" onClick={() => select(id)}>
                          <i>{dir}</i>
                          <span>
                            <b>{relNode.label}</b>
                            <small>{relNode.path}</small>
                          </span>
                        </button>
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
