"use client";

import { useEffect, useRef, useState } from "react";

/** Static terminal output lines — demo data only, no backend calls */
const COMMAND = "codegraph analyze repository";
const OUTPUT = [
  "Scanning repository...",
  "142 files indexed",
  "Tree-sitter AST generated",
  "1,284 code entities extracted",
  "Neo4j graph synchronized",
  "Grounded RAG ready",
];

function TerminalIcon({ name, size = 16 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    file: (
      <>
        <path d="M4 2h8l4 4v12H4z" />
        <path d="M12 2v5h4M7 11h6M7 14h4" />
      </>
    ),
    graph: (
      <>
        <circle cx="10" cy="3" r="2" />
        <circle cx="4" cy="16" r="2" />
        <circle cx="16" cy="16" r="2" />
        <path d="m9 5-4 9M11 5l4 9M6 16h8" />
      </>
    ),
    cycle: (
      <>
        <path d="M16 7a7 7 0 0 0-12-2L2 7" />
        <path d="M2 3v4h4M4 13a7 7 0 0 0 12 2l2-2" />
        <path d="M18 17v-4h-4" />
      </>
    ),
    gauge: (
      <>
        <path d="M3 16a8 8 0 1 1 14 0" />
        <path d="m10 12 4-4M6 16h8" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

const stagger = (i: number) => ({ "--i": i }) as React.CSSProperties;

const reducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Home page terminal showcase.
 * Animates a static demo scan sequence — no backend calls.
 * Includes "Replay Analysis" functionality.
 */
export default function HomeTerminal() {
  const ref = useRef<HTMLDivElement>(null);
  const [typed, setTyped] = useState(reducedMotion ? COMMAND.length : 0);
  const [lines, setLines] = useState(reducedMotion ? OUTPUT.length : 0);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    setTyped(0);
    setLines(0);
    const timers: ReturnType<typeof setTimeout>[] = [];

    const play = () => {
      let t = 250;
      for (let i = 1; i <= COMMAND.length; i++)
        timers.push(setTimeout(() => setTyped(i), (t += 36)));
      t += 320;
      OUTPUT.forEach((_, i) =>
        timers.push(
          setTimeout(
            () => setLines(i + 1),
            (t += i === 0 ? 450 : 360)
          )
        )
      );
    };

    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          io.disconnect();
          play();
        }
      },
      { threshold: 0.35 }
    );

    if (ref.current) io.observe(ref.current);
    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
    };
  }, [run]);

  const typing = typed < COMMAND.length;
  const done = lines === OUTPUT.length;

  const handleReplay = () => {
    setTyped(0);
    setLines(0);
    setRun((r) => r + 1);
  };

  return (
    <div className="terminal" ref={ref}>
      {/* Terminal Title Bar */}
      <div className="terminal-bar">
        <div className="window-dots">
          <i />
          <i />
          <i />
        </div>
        <span>CodeGraph AI</span>
        <div className="terminal-status">
          <span>UTF-8</span>
          <span>main</span>
          <button
            type="button"
            className={done ? "status ready" : "status"}
            onClick={handleReplay}
            aria-label="Replay analysis"
          >
            {done ? "Ready ↻" : "Running"}
          </button>
        </div>
      </div>

      {/* Terminal Body */}
      <div className="terminal-body">
        <div className="terminal-lines" aria-live="polite">
          <p>
            <span>$</span>{" "}
            <strong>
              {COMMAND.slice(0, typed)
                .split(/( )/)
                .map((w, i) => (
                  <span key={i} className={"t" + Math.min(2, (i / 2) | 0)}>
                    {w}
                  </span>
                ))}
            </strong>
            {typing && <i className="caret" />}
          </p>
          {OUTPUT.slice(0, lines).map((line, i) =>
            i === 0 ? (
              <p key={line} className="muted line-in">
                {line}
              </p>
            ) : (
              <p key={line} className="line-in">
                <b>✓</b>{" "}
                {line.split(/(\d[\d,]*)/).map((p, j) =>
                  j % 2 ? <em key={j}>{p}</em> : p
                )}
              </p>
            )
          )}
          {done && (
            <p className="cursor line-in">
              $ <i className="caret" />
            </p>
          )}
        </div>

        {/* Analysis Summary Panel */}
        <aside className={done ? "analysis-summary on" : "analysis-summary"}>
          <p className="summary-title">ANALYSIS COMPLETE</p>
          <div style={stagger(0)}>
            <TerminalIcon name="file" size={16} />
            <span>
              <b>142</b>Files indexed
            </span>
          </div>
          <div style={stagger(1)}>
            <TerminalIcon name="graph" size={16} />
            <span>
              <b>1,284</b>Code entities
            </span>
          </div>
          <div style={stagger(2)}>
            <TerminalIcon name="cycle" size={16} />
            <span>
              <b>56</b>Relationships
            </span>
          </div>
          <div style={stagger(3)}>
            <TerminalIcon name="gauge" size={16} />
            <span>
              <b>4.2s</b>Analysis time
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
