import Link from "next/link";
import { ArrowRight, Box, Code2, Database, FolderOpen, GitFork, GitGraph, Network, Terminal } from "lucide-react";

export default function HomePage() {
  return (
    <main className="landing-shell min-h-screen bg-[#06101f] text-slate-100 relative overflow-hidden select-none">
      {/* Decorative Styles */}
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.15); opacity: 0.15; }
          100% { transform: scale(0.95); opacity: 0.5; }
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
          100% { transform: translateY(0px); }
        }
        @keyframes dash {
          to { stroke-dashoffset: -20; }
        }
        .animated-node {
          animation: float 6s ease-in-out infinite;
        }
        .animated-node-delayed {
          animation: float 6s ease-in-out infinite;
          animation-delay: 2s;
        }
        .animated-edge {
          stroke-dasharray: 5;
          animation: dash 2s linear infinite;
        }
        .glowing-node {
          transition: all 0.3s ease;
        }
        .glowing-node:hover {
          filter: drop-shadow(0 0 8px rgba(34, 211, 238, 0.8));
          r: 10px;
        }
      `}</style>

      <div className="ambient-grid" aria-hidden="true" />
      <div className="ambient-orb ambient-orb-left" aria-hidden="true" />
      <div className="ambient-orb ambient-orb-right" aria-hidden="true" />

      {/* Header / Brand */}
      <nav className="absolute top-0 inset-x-0 h-16 flex items-center justify-between px-8 border-b border-slate-800/40 bg-slate-950/20 backdrop-blur-md z-30">
        <div className="flex items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 text-sm font-bold text-slate-950">
            CG
          </span>
          <span className="font-semibold tracking-tight text-slate-100">CodeGraph AI</span>
        </div>
        <Link
          href="/dashboard"
          className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          Open Console
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto pt-32 pb-16 px-6 lg:px-8 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-3 py-1 text-xs font-medium text-cyan-300">
          <span className="size-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Frontend Visual Redesign v1.0
        </div>

        <h1 className="mt-8 text-slate-100 text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight max-w-4xl">
          Understand your codebase as a <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent">living knowledge graph</span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
          Analyze repositories, parse Tree-sitter abstract syntax structures, extract symbols, map declarations, and explore code dependencies interactively.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-8 text-sm font-semibold text-slate-950 shadow-[0_4px_25px_rgba(34,211,238,0.3)] transition hover:-translate-y-0.5 hover:shadow-[0_4px_30px_rgba(34,211,238,0.5)] active:translate-y-0"
          >
            Open Workspace
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/graph"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-8 text-sm font-semibold text-slate-200 transition hover:-translate-y-0.5 hover:border-slate-600 hover:bg-slate-900/80 active:translate-y-0"
          >
            Explore Graph
          </Link>
        </div>
      </section>

      {/* Decorative Interactive Graph Preview */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 mb-24 w-full">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-6 shadow-[0_30px_70px_rgba(0,0,0,0.7)] backdrop-blur-md overflow-hidden relative min-h-[380px] flex items-center justify-center">
          {/* Radial grid backdrop */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.06),transparent_70%)] pointer-events-none" />

          <div className="relative w-full h-[360px] select-none">
            {/* SVG Graph Animation */}
            <svg viewBox="0 0 1000 360" className="w-full h-full text-slate-800/40" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                </radialGradient>
              </defs>
              
              {/* Background glow zones */}
              <circle cx="500" cy="180" r="140" fill="url(#glowGrad)" />

              {/* Edges */}
              <line x1="500" y1="180" x2="380" y2="130" className="animated-edge text-cyan-500/20" stroke="currentColor" strokeWidth="1.5" />
              <line x1="500" y1="180" x2="500" y2="40" className="animated-edge text-slate-700/40" stroke="currentColor" strokeWidth="1.5" />
              <line x1="500" y1="180" x2="620" y2="120" className="animated-edge text-cyan-500/20" stroke="currentColor" strokeWidth="1.5" />
              <line x1="380" y1="130" x2="260" y2="100" className="animated-edge text-slate-700/40" stroke="currentColor" strokeWidth="1.5" />
              <line x1="380" y1="130" x2="340" y2="240" className="animated-edge text-slate-700/40" stroke="currentColor" strokeWidth="1.5" />
              <path d="M 260 100 C 240 180, 280 200, 340 240" fill="none" className="animated-edge text-cyan-500/35" stroke="currentColor" strokeWidth="1.5" />
              <line x1="620" y1="120" x2="740" y2="60" className="animated-edge text-slate-700/40" stroke="currentColor" strokeWidth="1.5" />
              <line x1="620" y1="120" x2="680" y2="220" className="animated-edge text-slate-700/40" stroke="currentColor" strokeWidth="1.5" />
              <line x1="680" y1="220" x2="800" y2="240" className="animated-edge text-slate-700/40" stroke="currentColor" strokeWidth="1.5" />
              <line x1="800" y1="240" x2="900" y2="180" className="animated-edge text-violet-500/20" stroke="currentColor" strokeWidth="1.5" />
              <line x1="800" y1="240" x2="880" y2="300" className="animated-edge text-violet-500/20" stroke="currentColor" strokeWidth="1.5" />
              <line x1="340" y1="240" x2="200" y2="270" className="animated-edge text-slate-700/40" stroke="currentColor" strokeWidth="1.5" />
              <line x1="200" y1="270" x2="100" y2="200" className="animated-edge text-slate-700/40" stroke="currentColor" strokeWidth="1.5" />
              <path d="M 200 270 C 350 320, 650 300, 800 240" fill="none" className="animated-edge text-violet-500/35" stroke="currentColor" strokeWidth="1.5" />

              {/* Edge labels */}
              <text x="270" y="165" fill="#64748b" fontSize="7" fontFamily="monospace">IMPORTS</text>
              <text x="540" y="270" fill="#64748b" fontSize="7" fontFamily="monospace">CALLS</text>
              <text x="850" y="200" fill="#64748b" fontSize="7" fontFamily="monospace">DECLARES</text>

              {/* Nodes */}
              {/* Node 1: workspace (Project) */}
              <g className="animated-node">
                <circle className="glowing-node text-cyan-400 cursor-pointer" cx="500" cy="180" r="10" fill="currentColor" />
                <circle className="text-cyan-400/30" cx="500" cy="180" r="20" stroke="currentColor" strokeWidth="1" fill="none" style={{ animation: 'pulse-ring 2.5s infinite' }} />
                <text x="500" y="208" textAnchor="middle" fill="#f1f5f9" fontSize="10" fontFamily="monospace" fontWeight="bold">codegraph-ai</text>
                <text x="500" y="217" textAnchor="middle" fill="#22d3ee" fontSize="7" fontFamily="sans-serif" letterSpacing="0.5">PROJECT</text>
              </g>

              {/* Node 2: src/ (Folder) */}
              <g className="animated-node-delayed">
                <circle className="glowing-node text-sky-400 cursor-pointer" cx="380" cy="130" r="8" fill="currentColor" />
                <text x="380" y="114" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="monospace">src/</text>
                <text x="380" y="121" textAnchor="middle" fill="#38bdf8" fontSize="7" fontFamily="sans-serif">DIRECTORY</text>
              </g>

              {/* Node 3: main.py (File) */}
              <g className="animated-node">
                <circle className="glowing-node text-sky-400 cursor-pointer" cx="260" cy="100" r="7" fill="currentColor" />
                <text x="260" y="85" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">main.py</text>
                <text x="260" y="92" textAnchor="middle" fill="#38bdf8" fontSize="6" fontFamily="sans-serif">FILE</text>
              </g>

              {/* Node 4: database.py (File) */}
              <g className="animated-node-delayed">
                <circle className="glowing-node text-sky-400 cursor-pointer" cx="620" cy="120" r="8" fill="currentColor" />
                <text x="620" y="104" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="monospace">database.py</text>
                <text x="620" y="111" textAnchor="middle" fill="#38bdf8" fontSize="7" fontFamily="sans-serif">FILE</text>
              </g>

              {/* Node 5: models.py (File) */}
              <g className="animated-node">
                <circle className="glowing-node text-sky-400 cursor-pointer" cx="680" cy="220" r="7" fill="currentColor" />
                <text x="680" y="205" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">models.py</text>
                <text x="680" y="212" textAnchor="middle" fill="#38bdf8" fontSize="6" fontFamily="sans-serif">FILE</text>
              </g>

              {/* Node 6: User (Class) */}
              <g className="animated-node-delayed">
                <circle className="glowing-node text-violet-400 cursor-pointer" cx="800" cy="240" r="8" fill="currentColor" />
                <circle className="text-violet-400/20" cx="800" cy="240" r="16" stroke="currentColor" strokeWidth="1" fill="none" style={{ animation: 'pulse-ring 3s infinite' }} />
                <text x="800" y="260" textAnchor="middle" fill="#f1f5f9" fontSize="10" fontFamily="monospace">User</text>
                <text x="800" y="267" textAnchor="middle" fill="#818cf8" fontSize="7" fontFamily="sans-serif">CLASS</text>
              </g>

              {/* Node 7: save (Method) */}
              <g className="animated-node">
                <circle className="glowing-node text-fuchsia-400 cursor-pointer" cx="900" cy="180" r="6" fill="currentColor" />
                <text x="912" y="183" fill="#cbd5e1" fontSize="9" fontFamily="monospace">save()</text>
                <text x="912" y="190" fill="#f472b6" fontSize="6" fontFamily="sans-serif">METHOD</text>
              </g>

              {/* Node 8: validate (Method) */}
              <g className="animated-node-delayed">
                <circle className="glowing-node text-fuchsia-400 cursor-pointer" cx="880" cy="300" r="6" fill="currentColor" />
                <text x="892" y="303" fill="#cbd5e1" fontSize="9" fontFamily="monospace">validate()</text>
                <text x="892" y="310" fill="#f472b6" fontSize="6" fontFamily="sans-serif">METHOD</text>
              </g>

              {/* Node 9: db_conn (Variable) */}
              <g className="animated-node">
                <circle className="glowing-node text-amber-400 cursor-pointer" cx="740" cy="60" r="6" fill="currentColor" />
                <text x="740" y="46" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">db_conn</text>
                <text x="740" y="53" textAnchor="middle" fill="#fbbf24" fontSize="6" fontFamily="sans-serif">VARIABLE</text>
              </g>

              {/* Node 10: auth.py (File) */}
              <g className="animated-node-delayed">
                <circle className="glowing-node text-sky-400 cursor-pointer" cx="340" cy="240" r="7" fill="currentColor" />
                <text x="340" y="225" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="monospace">auth.py</text>
                <text x="340" y="232" textAnchor="middle" fill="#38bdf8" fontSize="6" fontFamily="sans-serif">FILE</text>
              </g>

              {/* Node 11: login (Function) */}
              <g className="animated-node">
                <circle className="glowing-node text-emerald-400 cursor-pointer" cx="200" cy="270" r="7" fill="currentColor" />
                <circle className="text-emerald-400/20" cx="200" cy="270" r="14" stroke="currentColor" strokeWidth="1" fill="none" style={{ animation: 'pulse-ring 2.8s infinite' }} />
                <text x="200" y="290" textAnchor="middle" fill="#f1f5f9" fontSize="10" fontFamily="monospace">login()</text>
                <text x="200" y="297" textAnchor="middle" fill="#34d399" fontSize="7" fontFamily="sans-serif">FUNCTION</text>
              </g>

              {/* Node 12: hash_password (Function) */}
              <g className="animated-node-delayed">
                <circle className="glowing-node text-emerald-400 cursor-pointer" cx="100" cy="200" r="6" fill="currentColor" />
                <text x="100" y="186" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">hash_password()</text>
                <text x="100" y="193" textAnchor="middle" fill="#34d399" fontSize="6" fontFamily="sans-serif">FUNCTION</text>
              </g>

              {/* Node 13: config.json (File) */}
              <g className="animated-node">
                <circle className="glowing-node text-sky-400 cursor-pointer" cx="500" cy="40" r="7" fill="currentColor" />
                <text x="500" y="25" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="monospace">config.json</text>
                <text x="500" y="32" textAnchor="middle" fill="#38bdf8" fontSize="6" fontFamily="sans-serif">FILE</text>
              </g>
            </svg>

            <div className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-lg bg-slate-900/90 px-3 py-1.5 font-mono text-[10px] text-cyan-400 border border-slate-800 shadow-md">
              <Network className="size-3.5 animate-spin" /> Interactive Preview
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-16 border-t border-slate-900 bg-slate-950/20">
        <h2 className="text-center text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
          How it Works
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400 max-w-md mx-auto">
          Four steps to construct and visualize code relationships.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              step: "01",
              title: "Connect Repository",
              desc: "Sync with a remote GitHub URL or upload a local project ZIP archive.",
              icon: FolderOpen,
              color: "border-cyan-500/10 hover:border-cyan-500/30 text-cyan-300",
            },
            {
              step: "02",
              title: "Analyze Code",
              desc: "Fast Tree-sitter parsers scan abstract syntax trees and extract metadata declarations.",
              icon: Code2,
              color: "border-blue-500/10 hover:border-blue-500/30 text-blue-300",
            },
            {
              step: "03",
              title: "Build Graph",
              desc: "Declarations and call pathways are compiled and resolved inside a Neo4j database.",
              icon: Database,
              color: "border-violet-500/10 hover:border-violet-500/30 text-violet-300",
            },
            {
              step: "04",
              title: "Explore Codebase",
              desc: "Search, filter, and trace full dependencies and code entities interactively.",
              icon: GitFork,
              color: "border-emerald-500/10 hover:border-emerald-500/30 text-emerald-300",
            },
          ].map((item, idx) => (
            <article
              key={idx}
              className={`flex flex-col p-6 rounded-xl border bg-slate-950/60 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 ${item.color}`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs text-slate-500">{item.step}</span>
                <item.icon className="size-5 opacity-80" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">{item.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Features Grid - Built for Developers */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-20 border-t border-slate-900">
        <h2 className="text-center text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
          Built for Developers
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400 max-w-md mx-auto">
          Explore complete codebase structure with specialized visualization.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Repository Explorer",
              desc: "Navigate through scanned directories and view syntax-highlighted source code in a lightweight, IDE-like workspace.",
              icon: FolderOpen,
              href: "/repository",
            },
            {
              title: "AST Tree-sitter Parser",
              desc: "Visualize abstract syntax tree structures, explore parse node parameters, and search across code tokens.",
              icon: Terminal,
              href: "/ast",
            },
            {
              title: "Symbol Extractor",
              desc: "Locate defined imports, exports, functions, classes, methods, and variables automatically mapped per file.",
              icon: Box,
              href: "/symbols",
            },
            {
              title: "Dependency Mapping",
              desc: "Track imports and function call flows between files and symbols as visual relationship connections.",
              icon: GitFork,
              href: "/relationships",
            },
            {
              title: "Neo4j Knowledge Graph",
              desc: "Open the interactive 2D/3D code network visualizer showing files, entities, and call chains.",
              icon: GitGraph,
              href: "/graph",
            },
            {
              title: "Projects Manager",
              desc: "Scan repository assets, delete workspace configurations, and configure clone hooks.",
              icon: Network,
              href: "/projects",
            },
          ].map((feat, idx) => (
            <Link
              href={feat.href}
              key={idx}
              className="group flex flex-col p-6 rounded-xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-sm transition hover:border-cyan-500/30 hover:bg-slate-950/80"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 group-hover:border-cyan-500/20 group-hover:text-cyan-300 transition-colors">
                  <feat.icon className="size-4.5" />
                </span>
                <h3 className="text-sm font-semibold text-slate-200 group-hover:text-slate-100">{feat.title}</h3>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-slate-400">{feat.desc}</p>
              <span className="mt-auto pt-6 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 group-hover:text-cyan-400 transition-colors">
                Explore feature <ArrowRight className="size-3" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer Banner */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-32 pt-12 text-center">
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-950/40 to-slate-950/80 p-8 sm:p-12 shadow-[0_16px_50px_rgba(0,0,0,0.8)] backdrop-blur-md relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.06),transparent_60%)]" aria-hidden="true" />
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100">Ready to explore your codebase?</h2>
          <p className="mt-3 text-slate-400 text-sm max-w-sm mx-auto">
            Open the workspace terminal and start scanning repositories.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/dashboard"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-8 text-sm font-semibold text-slate-950 shadow-[0_4px_25px_rgba(34,211,238,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_4px_30px_rgba(34,211,238,0.4)] active:translate-y-0"
            >
              Open Workspace
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
