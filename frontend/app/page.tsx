"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Box,
  CheckCircle2,
  ChevronRight,
  Code2,
  Cpu,
  Database,
  FileCode2,
  FolderOpen,
  GitFork,
  GitGraph,
  Network,
  Sparkles,
  Terminal,
} from "lucide-react";
import { DemoCodeGraph } from "@/components/home/DemoCodeGraph";

export default function HomePage() {
  const [terminalLineIndex, setTerminalLineIndex] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Terminal log sequence (STRICTLY MONOCHROME - NO GREEN)
  const terminalLines = [
    { text: "$ codegraph scan ./repository", type: "cmd" },
    { text: "Scanning repository files...", type: "info" },
    { text: "✓ 142 source files discovered (.py, .ts, .tsx)", type: "success" },
    { text: "✓ Tree-sitter AST parsing completed", type: "success" },
    { text: "✓ Extracted 1,284 functions, classes & variables", type: "success" },
    { text: "✓ Mapped 3,840 relationship edges in Neo4j", type: "success" },
    { text: "✓ Qdrant vector index ready (384-dim bge-small)", type: "success" },
    { text: "> Codebase indexed. Ready for analysis & RAG queries.", type: "ready" },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setTerminalLineIndex((prev) => (prev < terminalLines.length ? prev + 1 : prev));
    }, 600);
    return () => clearInterval(timer);
  }, [terminalLines.length]);

  // High-Visibility Qronos-Inspired Technical Network Canvas Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Responsive Node Count (Desktop: ~42, Tablet: ~30, Mobile: ~16)
    const particleCount = Math.min(50, Math.max(16, Math.floor(width / 32)));

    // Generate 3D depth-layered nodes (Soft & Subtle)
    const particles = Array.from({ length: particleCount }, (_, idx) => {
      // Assign depth layer (1: Far, 2: Mid, 3: Foreground)
      const layer = idx % 3 === 0 ? 3 : idx % 2 === 0 ? 2 : 1;
      const radius = layer === 3 ? Math.random() * 0.8 + 2.2 : layer === 2 ? Math.random() * 0.6 + 1.5 : Math.random() * 0.4 + 1.0;
      const baseOpacity = layer === 3 ? 0.48 : layer === 2 ? 0.30 : 0.18;
      const speedMult = layer === 3 ? 0.35 : layer === 2 ? 0.22 : 0.14;

      return {
        id: idx,
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * speedMult,
        vy: (Math.random() - 0.5) * speedMult,
        radius,
        baseOpacity,
        layer,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.012 + Math.random() * 0.015,
        isGlowing: layer === 3 && idx % 4 === 0,
      };
    });

    // Traveling particles along connections
    const travelingParticles = Array.from({ length: 6 }, (_, idx) => ({
      id: idx,
      p1Index: idx % particles.length,
      p2Index: (idx + 5) % particles.length,
      progress: Math.random(),
      speed: 0.002 + Math.random() * 0.004,
    }));

    let isSectionVisible = true;

    // Pause animation when hero is offscreen
    const observer = new IntersectionObserver(
      (entries) => {
        isSectionVisible = entries[0].isIntersecting;
      },
      { threshold: 0.1 }
    );
    observer.observe(canvas);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Update node positions & pulse phases
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!prefersReducedMotion && isSectionVisible) {
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
          if (p.y < -10) p.y = height + 10;
          if (p.y > height + 10) p.y = -10;

          p.pulsePhase += p.pulseSpeed;
        }
      }

      // 2. Draw Connection Lines
      const connectionDist = 150;
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDist) {
            const proximityFactor = 1 - dist / connectionDist;
            const avgLayer = (p1.layer + p2.layer) / 2;
            const lineOpacity = Math.min(0.22, (avgLayer === 3 ? 0.15 : 0.09) * proximityFactor + 0.03);

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${lineOpacity})`;
            ctx.lineWidth = avgLayer === 3 ? 0.85 : 0.65;
            ctx.stroke();
          }
        }
      }

      // 3. Draw Traveling Particles along connections
      if (!prefersReducedMotion && isSectionVisible) {
        for (let k = 0; k < travelingParticles.length; k++) {
          const tp = travelingParticles[k];
          tp.progress += tp.speed;
          if (tp.progress >= 1) {
            tp.progress = 0;
            tp.p1Index = Math.floor(Math.random() * particles.length);
            tp.p2Index = (tp.p1Index + 1 + Math.floor(Math.random() * (particles.length - 1))) % particles.length;
          }

          const p1 = particles[tp.p1Index];
          const p2 = particles[tp.p2Index];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDist + 40) {
            const currentX = p1.x + (p2.x - p1.x) * tp.progress;
            const currentY = p1.y + (p2.y - p1.y) * tp.progress;

            ctx.beginPath();
            ctx.arc(currentX, currentY, 1.4, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
            ctx.fill();
          }
        }
      }

      // 4. Draw Nodes with Soft Glow
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const pulse = Math.sin(p.pulsePhase) * 0.08;
        const currentOpacity = Math.min(0.75, Math.max(0.10, p.baseOpacity + pulse));

        ctx.save();
        if (p.isGlowing) {
          ctx.shadowBlur = 4;
          ctx.shadowColor = "rgba(255, 255, 255, 0.25)";
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity})`;
        ctx.fill();
        ctx.restore();
      }

      if (!prefersReducedMotion && isSectionVisible) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="landing-shell bg-black text-white selection:bg-white selection:text-black">
      {/* Soft & Subtle Background Canvas Particles */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0 opacity-55" />

      {/* Ambient Grid Overlay */}
      <div className="technical-grid" aria-hidden="true" />

      {/* Sticky Qronos-Inspired Header */}
      <header className="sticky top-0 z-50 w-full border-b border-[#252525] bg-black/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto h-16 px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <span className="grid size-8 place-items-center rounded border border-[#333333] bg-[#0A0A0A] font-mono text-xs font-bold text-white group-hover:border-white transition-colors">
              CG
            </span>
            <span className="font-semibold text-sm tracking-wide text-white">CodeGraph AI</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-[#A3A3A3]">
            <a href="#overview" className="hover:text-white transition-colors">
              Overview
            </a>
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#graph" className="hover:text-white transition-colors">
              Knowledge Graph
            </a>
            <a href="#analysis" className="hover:text-white transition-colors">
              Quality Analysis
            </a>
            <a href="#rag" className="hover:text-white transition-colors">
              RAG AI
            </a>
            <Link href="/user-guide" className="hover:text-white transition-colors">
              User Guide
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center justify-center rounded-full border border-[#333333] bg-white px-5 font-sans text-xs font-semibold text-black transition-all hover:bg-[#E5E5E5] hover:scale-[1.02] active:scale-[0.98]"
            >
              Open Console &rarr;
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="overview" className="relative z-10 max-w-7xl mx-auto pt-24 pb-20 px-6 text-center flex flex-col items-center">
        {/* Subtle Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[#252525] bg-[#0A0A0A] px-4 py-1.5 text-xs font-mono text-[#A3A3A3] mb-8">
          <span className="size-1.5 rounded-full bg-white animate-pulse" />
          CODE INTELLIGENCE ENGINE v1.0
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.08]">
          Understand your <br />
          <span className="text-[#A3A3A3]">codebase.</span>
        </h1>

        {/* Hero Description */}
        <p className="mt-6 text-base sm:text-lg text-[#A3A3A3] max-w-2xl leading-relaxed font-normal">
          CodeGraph AI transforms repositories into intelligent code graphs, structural insights, and grounded AI answers.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/graph"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white bg-white px-8 font-sans text-xs font-semibold text-black shadow-lg transition-all hover:bg-[#E5E5E5] hover:-translate-y-0.5 active:translate-y-0"
          >
            Explore Codebase
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#252525] bg-[#0A0A0A] px-8 font-sans text-xs font-semibold text-white transition-all hover:border-[#404040] hover:bg-[#141414] hover:-translate-y-0.5 active:translate-y-0"
          >
            Open Workspace
          </Link>
        </div>
      </section>

      {/* Hero Terminal / Developer IDE Preview (STRICTLY MONOCHROME - NO GREEN) */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 mb-24 w-full">
        <div className="rounded-xl border border-[#252525] bg-[#0A0A0A] shadow-2xl overflow-hidden">
          {/* Terminal Window Header */}
          <div className="h-10 px-4 border-b border-[#252525] bg-[#050505] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-2.5 rounded-full bg-[#333333]" />
              <div className="size-2.5 rounded-full bg-[#333333]" />
              <div className="size-2.5 rounded-full bg-[#333333]" />
              <span className="ml-2 font-mono text-xs text-[#737373]">codegraph-cli v1.0</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono text-[#737373]">
              <span>UTF-8</span>
              <span>FastAPI + Neo4j</span>
            </div>
          </div>

          {/* Terminal Code Content */}
          <div className="p-6 font-mono text-xs sm:text-sm leading-relaxed text-[#A3A3A3] min-h-[220px] flex flex-col justify-start">
            {terminalLines.slice(0, terminalLineIndex).map((line, idx) => (
              <div key={idx} className="flex items-center gap-2 py-0.5">
                {line.type === "cmd" && <span className="text-white font-bold">$</span>}
                <span className={line.type === "cmd" ? "text-white font-semibold" : line.type === "success" || line.type === "ready" ? "text-white" : "text-[#A3A3A3]"}>
                  {line.text}
                </span>
              </div>
            ))}
            {terminalLineIndex < terminalLines.length && (
              <div className="inline-block w-2 h-4 bg-white animate-pulse mt-1" />
            )}
          </div>
        </div>
      </section>

      {/* Interactive CodeGraph AI Knowledge Graph Demonstration */}
      <DemoCodeGraph />

      {/* Architecture Processing Pipeline ("How It Works") */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-[#252525]">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="font-mono text-xs uppercase tracking-widest text-[#737373]">SYSTEM ARCHITECTURE</span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Four Steps to Code Intelligence
          </h2>
          <p className="mt-3 text-sm text-[#A3A3A3]">
            From raw repository files to multi-hop graph nodes and vector RAG context.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              step: "01",
              title: "Connect Repository",
              desc: "Sync remote GitHub URLs or upload local repository ZIP archives.",
              icon: FolderOpen,
            },
            {
              step: "02",
              title: "Tree-sitter Parsing",
              desc: "Extract concrete AST declarations across Python, JS, TS, and TSX files.",
              icon: Code2,
            },
            {
              step: "03",
              title: "Neo4j Graph Index",
              desc: "Project files, classes, functions, and import paths into a graph network.",
              icon: Database,
            },
            {
              step: "04",
              title: "Grounded RAG AI",
              desc: "Execute Qdrant vector search and generate answers with local Ollama LLMs.",
              icon: Cpu,
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-6 rounded-xl border border-[#252525] bg-[#0A0A0A] hover:border-[#404040] hover:bg-[#141414] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs text-[#737373]">{item.step}</span>
                  <item.icon className="size-4 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#A3A3A3]">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Built for Developers / Feature Cards Grid */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-[#252525]">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-[#737373]">DEVELOPER TOOLKIT</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Built for Modern Software Engineering
            </h2>
          </div>
          <p className="mt-4 md:mt-0 text-sm text-[#A3A3A3] max-w-md">
            Dedicated workspace tools for architecture analysis, static diagnostics, and RAG search.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Repository Workspace",
              desc: "Explore repository directories and inspect syntax-highlighted code in an IDE-like editor view.",
              icon: FolderOpen,
              href: "/repository",
            },
            {
              title: "AST Tree-sitter Parser",
              desc: "Inspect abstract syntax tree node hierarchies, parse ranges, and cross-file code tokens.",
              icon: Terminal,
              href: "/ast",
            },
            {
              title: "Symbol Extractor",
              desc: "Automatically locate all declared classes, functions, methods, variables, and imports.",
              icon: Box,
              href: "/symbols",
            },
            {
              title: "Dependency Mapping",
              desc: "Trace file-to-file import relationships and function call pathways visually.",
              icon: GitFork,
              href: "/relationships",
            },
            {
              title: "Neo4j Knowledge Graph",
              desc: "Navigate the interactive 2D graph with depth controls (Depth 1, Depth 2, Depth 3).",
              icon: GitGraph,
              href: "/graph",
            },
            {
              title: "Projects Manager",
              desc: "Manage scanned projects, configure scan exclusions, and trigger repository rescans.",
              icon: Network,
              href: "/projects",
            },
          ].map((feat, idx) => (
            <Link
              href={feat.href}
              key={idx}
              className="group p-6 rounded-xl border border-[#252525] bg-[#0A0A0A] hover:border-[#404040] hover:bg-[#141414] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="size-9 rounded border border-[#333333] bg-[#050505] grid place-items-center mb-4 group-hover:border-white transition-colors">
                  <feat.icon className="size-4 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-white group-hover:text-white">{feat.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#A3A3A3]">{feat.desc}</p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#1c1c1c] flex items-center justify-between font-mono text-[11px] text-[#737373] group-hover:text-white transition-colors">
                <span>Explore tool</span>
                <ChevronRight className="size-3.5" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Code Quality & Static Analysis Showcase */}
      <section id="analysis" className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-[#252525]">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-[#737373]">STATIC CODE DIAGNOSTICS</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Automated Code Quality & Health Scoring
            </h2>
            <p className="mt-4 text-sm text-[#A3A3A3] leading-relaxed">
              Detect architectural flaws before they cause build failures or technical debt. CodeGraph AI computes an aggregate Health Score (0–100) across three key metrics:
            </p>

            <div className="mt-8 space-y-4 font-mono text-xs">
              <div className="p-4 rounded-lg border border-[#252525] bg-[#0A0A0A] flex items-start gap-3">
                <CheckCircle2 className="size-4 text-white shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Dead Code Reachability</div>
                  <div className="text-[#A3A3A3] mt-1">Identifies unreferenced functions, classes, and unused variables across files.</div>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-[#252525] bg-[#0A0A0A] flex items-start gap-3">
                <CheckCircle2 className="size-4 text-white shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Circular Dependency Loop Detection</div>
                  <div className="text-[#A3A3A3] mt-1">DFS import graph traversal detects directed loops ($A \rightarrow B \rightarrow C \rightarrow A$).</div>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-[#252525] bg-[#0A0A0A] flex items-start gap-3">
                <CheckCircle2 className="size-4 text-white shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Cyclomatic Complexity Metric</div>
                  <div className="text-[#A3A3A3] mt-1">Inspects control-flow decision branches to highlight high-risk functions ($V(G) &gt; 10$).</div>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <Link
                href="/quality"
                className="inline-flex h-10 items-center justify-center rounded-full border border-white bg-white px-6 font-sans text-xs font-semibold text-black transition-all hover:bg-[#E5E5E5]"
              >
                View Quality Report &rarr;
              </Link>
            </div>
          </div>

          {/* Qronos-Inspired Quality Card Preview */}
          <div className="p-6 sm:p-8 rounded-xl border border-[#252525] bg-[#0A0A0A] space-y-6">
            <div className="flex items-center justify-between border-b border-[#252525] pb-4">
              <span className="font-mono text-xs font-semibold text-white">PROJECT HEALTH DASHBOARD</span>
              <span className="font-mono text-xs text-[#A3A3A3]">HEALTHY (88 / 100)</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded border border-[#252525] bg-black">
                <div className="font-mono text-[10px] text-[#737373]">DEAD CODE CONFIDENCE</div>
                <div className="mt-2 text-xl font-bold font-mono text-white">2 Items</div>
                <div className="mt-1 text-[11px] font-mono text-[#A3A3A3]">Low severity</div>
              </div>

              <div className="p-4 rounded border border-[#252525] bg-black">
                <div className="font-mono text-[10px] text-[#737373]">CIRCULAR LOOPS</div>
                <div className="mt-2 text-xl font-bold font-mono text-white">1 Cycle</div>
                <div className="mt-1 text-[11px] font-mono text-[#A3A3A3]">3 files involved</div>
              </div>
            </div>

            <div className="p-4 rounded border border-[#252525] bg-black font-mono text-xs space-y-2">
              <div className="text-[#737373] text-[10px] uppercase">Detected Cycle Path</div>
              <div className="text-white">cycle_a.py &rarr; cycle_b.py &rarr; cycle_c.py &rarr; cycle_a.py</div>
            </div>
          </div>
        </div>
      </section>

      {/* Grounded RAG AI Assistant Showcase */}
      <section id="rag" className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-[#252525]">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="font-mono text-xs uppercase tracking-widest text-[#737373]">GROUNDED AI ASSISTANT</span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-white">
            RAG Code Q&A Grounded in Source Code
          </h2>
          <p className="mt-3 text-sm text-[#A3A3A3]">
            Ask questions about repository architecture without hallucinated answers or external cloud APIs.
          </p>
        </div>

        {/* Qronos Agent Inbox-Inspired Dual Panel */}
        <div className="rounded-xl border border-[#252525] bg-[#0A0A0A] overflow-hidden grid lg:grid-cols-12">
          {/* Left Panel: Query List */}
          <div className="lg:col-span-5 p-6 border-b lg:border-b-0 lg:border-r border-[#252525] space-y-4">
            <div className="font-mono text-xs font-semibold text-white mb-4">SAMPLE DEVELOPER QUERIES</div>

            <div className="p-3.5 rounded border border-[#333333] bg-black text-xs font-mono text-white cursor-pointer">
              &quot;Explain how authentication handles user login.&quot;
            </div>

            <div className="p-3.5 rounded border border-[#252525] bg-[#050505] text-xs font-mono text-[#A3A3A3] hover:text-white cursor-pointer transition-colors">
              &quot;Which function has the highest cyclomatic complexity?&quot;
            </div>

            <div className="p-3.5 rounded border border-[#252525] bg-[#050505] text-xs font-mono text-[#A3A3A3] hover:text-white cursor-pointer transition-colors">
              &quot;Show circular dependencies in user_service.&quot;
            </div>
          </div>

          {/* Right Panel: AI Answer Stream Preview */}
          <div className="lg:col-span-7 p-6 flex flex-col justify-between bg-[#050505]">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-mono text-[#737373] border-b border-[#252525] pb-3">
                <span className="flex items-center gap-2 text-white">
                  <Sparkles className="size-3.5" /> Ollama qwen2.5-coder:7b
                </span>
                <span>Vector Qdrant + Neo4j Graph</span>
              </div>

              <p className="text-xs sm:text-sm leading-relaxed text-[#A3A3A3] font-sans">
                User authentication is managed in <code className="font-mono text-white bg-black px-1.5 py-0.5 rounded border border-[#252525]">auth.py</code> using the <code className="font-mono text-white bg-black px-1.5 py-0.5 rounded border border-[#252525]">login()</code> function (Lines 42–78). It queries PostgreSQL via <code className="font-mono text-white bg-black px-1.5 py-0.5 rounded border border-[#252525]">user_service.get_user()</code> and verifies password hashes.
              </p>

              {/* Source Citation Badge */}
              <div className="pt-2 flex flex-wrap gap-2 font-mono text-[11px]">
                <span className="px-2.5 py-1 rounded border border-[#333333] bg-black text-white flex items-center gap-1.5">
                  <FileCode2 className="size-3" /> auth.py (L42-78)
                </span>
                <span className="px-2.5 py-1 rounded border border-[#333333] bg-black text-white flex items-center gap-1.5">
                  <GitGraph className="size-3" /> Graph Context: CALLS
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#252525] flex items-center justify-between">
              <span className="font-mono text-xs text-[#737373]">100% Local Execution</span>
              <Link href="/chat" className="text-xs font-sans font-semibold text-white hover:underline flex items-center gap-1">
                Open AI Assistant <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Ecosystem Marquee */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-16 border-t border-[#252525] text-center">
        <span className="font-mono text-xs uppercase tracking-widest text-[#737373]">POWERED BY OPEN INFRASTRUCTURE</span>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-8 sm:gap-12 font-mono text-xs text-[#A3A3A3] opacity-80">
          <span>Python 3.13</span>
          <span>FastAPI</span>
          <span>Next.js 15</span>
          <span>PostgreSQL 16</span>
          <span>Neo4j 5</span>
          <span>Qdrant</span>
          <span>Ollama</span>
          <span>Tree-sitter</span>
        </div>
      </section>

      {/* Footer Banner */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-24 pt-12 text-center">
        <div className="rounded-xl border border-[#252525] bg-[#0A0A0A] p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 technical-grid pointer-events-none" />
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Ready to analyze your codebase?
          </h2>
          <p className="mt-3 text-sm text-[#A3A3A3] max-w-md mx-auto font-normal">
            Launch the console, clone repositories, and explore structural knowledge graphs.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/dashboard"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white bg-white px-8 font-sans text-xs font-semibold text-black transition-all hover:bg-[#E5E5E5] hover:scale-[1.02] active:scale-[0.98]"
            >
              Open Console &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Qronos-Inspired Footer */}
      <footer className="relative z-10 border-t border-[#252525] bg-black py-16 text-xs text-[#737373]">
        <div className="max-w-7xl mx-auto px-6 grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3">
              <span className="grid size-7 place-items-center rounded border border-[#333333] bg-[#0A0A0A] font-mono text-xs font-bold text-white">
                CG
              </span>
              <span className="font-semibold text-sm text-white">CodeGraph AI</span>
            </div>
            <p className="mt-4 text-xs text-[#737373] max-w-sm leading-relaxed">
              AI-Powered Codebase Knowledge Graph and Intelligent Code Assistant. Parse ASTs, detect dependency cycles, compute complexity, and query code grounded in source files.
            </p>
          </div>

          <div>
            <div className="font-mono text-xs text-white uppercase mb-4">Product</div>
            <ul className="space-y-2.5">
              <li>
                <Link href="/graph" className="hover:text-white transition-colors">
                  Knowledge Graph
                </Link>
              </li>
              <li>
                <Link href="/repository" className="hover:text-white transition-colors">
                  Repository Explorer
                </Link>
              </li>
              <li>
                <Link href="/ast" className="hover:text-white transition-colors">
                  AST Parser
                </Link>
              </li>
              <li>
                <Link href="/symbols" className="hover:text-white transition-colors">
                  Symbol Extractor
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="font-mono text-xs text-white uppercase mb-4">Analysis</div>
            <ul className="space-y-2.5">
              <li>
                <Link href="/quality" className="hover:text-white transition-colors">
                  Health Score
                </Link>
              </li>
              <li>
                <Link href="/dead-code" className="hover:text-white transition-colors">
                  Dead Code
                </Link>
              </li>
              <li>
                <Link href="/circular-dependencies" className="hover:text-white transition-colors">
                  Circular Loops
                </Link>
              </li>
              <li>
                <Link href="/complexity" className="hover:text-white transition-colors">
                  Complexity
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="font-mono text-xs text-white uppercase mb-4">Engine</div>
            <ul className="space-y-2.5">
              <li>
                <Link href="/chat" className="hover:text-white transition-colors">
                  RAG Assistant
                </Link>
              </li>
              <li>
                <Link href="/user-guide" className="hover:text-white transition-colors">
                  User Guide
                </Link>
              </li>
              <li>
                <Link href="/developer" className="hover:text-white transition-colors">
                  Developer Health
                </Link>
              </li>
              <li>
                <Link href="/settings" className="hover:text-white transition-colors">
                  Settings
                </Link>
              </li>
              <li>
                <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                  API Docs &rarr;
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-[#1c1c1c] flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px]">
          <div>&copy; {new Date().getFullYear()} CodeGraph AI. All rights reserved.</div>
          <div>Strictly Monochrome • Qronos Visual Design System</div>
        </div>
      </footer>
    </div>
  );
}
