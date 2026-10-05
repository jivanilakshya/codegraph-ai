"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import HomeIntelligenceField from "@/components/home/HomeIntelligenceField";
import HeroNetwork from "@/components/home/HeroNetwork";
import HomeTerminal from "@/components/home/HomeTerminal";
import HomeGraphExplorer from "@/components/home/HomeGraphExplorer";

// ─── Inline Icon component (no extra dependencies) ──────────────────────────

type IconName =
  | "repo"
  | "code"
  | "graph"
  | "chat"
  | "folder"
  | "database"
  | "layers"
  | "file"
  | "cycle"
  | "gauge";

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    repo: (
      <>
        <path d="M5 5.5a2.5 2.5 0 1 1-2-2.45" />
        <path d="M5 2.5v6M5 8.5c0 3 3 4 5 4M15 5.5a2.5 2.5 0 1 0 2-2.45" />
        <path d="M15 2.5v6M15 8.5c0 3-3 4-5 4M10 12.5v5" />
        <circle cx="10" cy="18" r="1.5" />
      </>
    ),
    code: (
      <>
        <path d="m7 5-5 5 5 5M13 5l5 5-5 5M12 2 8 18" />
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
    chat: (
      <>
        <path d="M3 4h14v10H9l-4 3v-3H3z" />
        <path d="M7 8h.01M10 8h.01M13 8h.01" />
      </>
    ),
    folder: <path d="M2 5h7l2 2h7v10H2z" />,
    database: (
      <>
        <ellipse cx="10" cy="4" rx="7" ry="2.5" />
        <path d="M3 4v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V4M3 10v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" />
      </>
    ),
    layers: (
      <>
        <path d="m10 2 8 4-8 4-8-4z" />
        <path d="m2 10 8 4 8-4M2 14l8 4 8-4" />
      </>
    ),
    file: (
      <>
        <path d="M4 2h8l4 4v12H4z" />
        <path d="M12 2v5h4M7 11h6M7 14h4" />
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

// ─── Logo ────────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <div className="brand">
      <span className="logo-mark">CG</span>
      <span className="brand-name">CodeGraph AI</span>
    </div>
  );
}

const stagger = (i: number) => ({ "--i": i }) as React.CSSProperties;
const stages = ["CODE", "AST", "GRAPH", "AI"];

// ─── Static content arrays ───────────────────────────────────────────────────

const workflow = [
  {
    icon: "repo" as const,
    title: "Connect Repository",
    text: "Clone from GitHub or upload a ZIP archive to ingest your codebase.",
  },
  {
    icon: "file" as const,
    title: "Tree-sitter",
    text: "Parse source code with tree-sitter for accurate AST generation.",
  },
  {
    icon: "graph" as const,
    title: "Neo4j Graph",
    text: "Extract symbols, relationships and store in a graph database.",
  },
  {
    icon: "chat" as const,
    title: "Grounded RAG",
    text: "Combine graph context with LLM for accurate, source-grounded answers.",
  },
];

const toolkit = [
  {
    icon: "folder" as const,
    title: "Repository Workspace",
    text: "Browse and explore your codebase with a powerful file viewer.",
    href: "/repository",
  },
  {
    icon: "code" as const,
    title: "AST Parser",
    text: "Generate abstract syntax trees with tree-sitter.",
    href: "/ast",
  },
  {
    icon: "graph" as const,
    title: "Symbol Extractor",
    text: "Extract functions, classes, methods and variables.",
    href: "/symbols",
  },
  {
    icon: "repo" as const,
    title: "Dependency Mapping",
    text: "Visualize relationships and dependencies between components.",
    href: "/relationships",
  },
  {
    icon: "database" as const,
    title: "Neo4j Knowledge Graph",
    text: "Store and query code structure in a graph database.",
    href: "/graph",
  },
  {
    icon: "layers" as const,
    title: "Projects Manager",
    text: "Manage multiple codebases and analysis configurations.",
    href: "/projects",
  },
];

// ─── Nav items (corrected anchors/routes) ────────────────────────────────────

const navItems: [string, string][] = [
  ["overview", "Overview"],
  ["features", "Features"],
  ["graph", "Knowledge Graph"],
  ["analysis", "Quality Analysis"],
  ["rag", "RAG AI"],
];

// ─── RAG Showcase ─────────────────────────────────────────────────────────────

const ragQuestions = [
  "Where is authentication handled?",
  "Show dependencies of api.py",
  "Why is this function unreachable?",
];

const ragAnswers = [
  {
    answer:
      "Authentication is handled in the `src/app/auth.py` file. This module contains the main authentication logic, including JWT token validation, user session management, and login/logout endpoints.",
    code: `src/app/auth.py
def authenticate_user(token: str) -> Optional[User]:
  try:
    payload = jwt.decode(token, settings.SECRET_KEY)
    return db.users.get(payload.get("sub"))`,
    sources: [
      "src/app/auth.py",
      "src/app/routes.py",
      "src/app/models.py",
      "src/core/security.py",
    ],
  },
  {
    answer:
      "The file `api.py` imports from `routes.py`, `middleware.py`, `auth.py`, `database.py`, and `config.py`. It serves as the main entry point for all FastAPI route registration.",
    code: `src/app/main.py
from .routes import router
from .middleware import setup_middleware
from .database import init_db`,
    sources: [
      "src/app/main.py",
      "src/app/routes.py",
      "src/app/middleware.py",
      "src/app/config.py",
    ],
  },
  {
    answer:
      "The function `legacy_handler()` in `src/utils/helpers.py` is unreachable because it is never imported or called by any other module in the codebase. Dead code detection flagged it with 0 references.",
    code: `src/utils/helpers.py
# Dead code — 0 inbound references
def legacy_handler(data):
    return process_old_format(data)`,
    sources: [
      "src/utils/helpers.py",
      "src/app/routes.py",
      "src/services/user_service.py",
    ],
  },
];

// ─── Footer link map ──────────────────────────────────────────────────────────

const footerColumns = [
  {
    title: "Product",
    links: [
      { label: "Overview", href: "#overview" },
      { label: "Features", href: "#features" },
      { label: "Projects", href: "/projects" },
      { label: "Documentation", href: "/user-guide" },
    ],
  },
  {
    title: "Analysis",
    links: [
      { label: "Code Quality", href: "/quality" },
      { label: "Dead Code", href: "/dead-code" },
      { label: "Dependencies", href: "/relationships" },
      { label: "Complexity", href: "/complexity" },
    ],
  },
  {
    title: "Engine",
    links: [
      { label: "Knowledge Graph", href: "/graph" },
      { label: "RAG AI", href: "/chat" },
      { label: "AST Parser", href: "/ast" },
      { label: "Symbol Extractor", href: "/symbols" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "User Guide", href: "/user-guide" },
      { label: "API Reference", href: "/developer" },
    ],
  },
];

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState("overview");
  const [ragActive, setRagActive] = useState(0);
  const navRef = useRef<HTMLElement>(null);

  // Active section tracking for nav indicator
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = 140;
      let current = "overview";
      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4
      ) {
        current = "rag";
      } else {
        for (const [id] of navItems) {
          const el = document.getElementById(id);
          if (el && el.getBoundingClientRect().top <= y) current = id;
        }
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Animated nav indicator position
  useLayoutEffect(() => {
    const nav = navRef.current;
    const link = nav?.querySelector<HTMLElement>("a.active");
    if (nav && link) {
      nav.style.setProperty("--ind-x", `${link.offsetLeft}px`);
      nav.style.setProperty("--ind-w", `${link.offsetWidth}px`);
    }
  }, [active, menuOpen]);

  // Pointer spotlight for cards
  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (
      reduced ||
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches
    )
      return;
    const sel =
      ".workflow-card,.tool-card,.health-card,.rag-panel,.terminal,.graph-shell,.final-cta,.tech-row>span";
    const onMove = (e: PointerEvent) => {
      const el = (e.target as Element).closest<HTMLElement>(sel);
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => document.removeEventListener("pointermove", onMove);
  }, []);

  // Scroll-reveal animation
  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const els = document.querySelectorAll("[data-reveal]");
    if (reduced || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const currentAnswer = ragAnswers[ragActive];

  return (
    <div className="home-app">
      {/* Decorative background particle field */}
      <HomeIntelligenceField />

      {/* ── Sticky Header ─────────────────────────────────────────────────── */}
      <header>
        <div className="header-inner">
          <Link href="/" aria-label="CodeGraph AI home">
            <Logo />
          </Link>

          <nav
            ref={navRef}
            className={menuOpen ? "open" : ""}
            onClick={() => setMenuOpen(false)}
          >
            {navItems.map(([id, label]) => (
              <a
                key={id}
                className={active === id ? "active" : ""}
                href={`#${id}`}
              >
                {label}
              </a>
            ))}
            <Link href="/user-guide" className="nav-standalone">
              User Guide
            </Link>
            <i className="nav-indicator" />
          </nav>

          <Link
            className="primary-button header-cta"
            href="/dashboard"
          >
            Open Console <span>→</span>
          </Link>

          <button
            className="menu-button"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      <main id="overview">
        {/* ── Hero Section ──────────────────────────────────────────────────── */}
        <section className="hero">
          <div className="hero-grid">
            <div className="hero-copy">
              <div className="hero-badge">
                <i /> CODE INTELLIGENCE ENGINE
              </div>
              <h1>
                CodeGraph <span>AI</span>
              </h1>
              <h2 className="hero-tag">
                Understand your codebase.
                <br />
                Visually. Intelligently.
              </h2>
              <p>
                Transform your repository into an understandable knowledge graph
                with code intelligence, static analysis, and grounded AI
                assistance.
              </p>
              <div className="hero-actions">
                <Link href="/projects" className="primary-button">
                  Get Started <span>→</span>
                </Link>
                <Link href="/dashboard" className="secondary-button">
                  Open Workspace
                </Link>
              </div>
            </div>
            <div className="hero-visual">
              <HeroNetwork />
            </div>
          </div>

          {/* Terminal Showcase */}
          <HomeTerminal />
        </section>

        {/* ── Knowledge Graph Showcase ───────────────────────────────────── */}
        <section id="graph" className="section">
          <div className="section-heading" data-reveal>
            <div>
              <p className="eyebrow">Knowledge graph</p>
              <h2>See how your code connects.</h2>
            </div>
            <p className="section-copy">
              Explore the relationships between files, functions, classes, and
              modules in an interactive knowledge graph.
            </p>
          </div>
          <div data-reveal>
            <HomeGraphExplorer />
          </div>
        </section>

        {/* ── How It Works ──────────────────────────────────────────────────── */}
        <section className="section" id="workflow">
          <div className="section-heading" data-reveal>
            <div>
              <p className="eyebrow">How it works</p>
              <h2>From code to intelligence.</h2>
            </div>
            <p className="section-copy">
              A comprehensive pipeline that transforms your repository into a
              queryable knowledge graph with AI capabilities.
            </p>
          </div>
          <div className="workflow-grid">
            {workflow.map((item, index) => (
              <article
                className="workflow-card"
                key={item.title}
                data-reveal
                style={stagger(index)}
              >
                <div className="card-top">
                  <span className="step">0{index + 1}</span>
                  <Icon name={item.icon} size={27} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <b className="card-arrow">{stages[index]}</b>
              </article>
            ))}
          </div>
        </section>

        {/* ── Developer Toolkit ─────────────────────────────────────────────── */}
        <section className="section" id="features">
          <div className="section-heading" data-reveal>
            <div>
              <p className="eyebrow">Developer toolkit</p>
              <h2>Everything you need to understand your code.</h2>
            </div>
          </div>
          <div className="toolkit-grid">
            {toolkit.map((item, index) => (
              <Link
                href={item.href}
                key={item.title}
                className="tool-card"
                data-reveal
                style={stagger(index % 3)}
              >
                <span className="tool-icon">
                  <Icon name={item.icon} />
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
                <b aria-hidden="true">→</b>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Code Diagnostics ──────────────────────────────────────────────── */}
        <section id="analysis" className="section diagnostics-section">
          {/* Left: Diagnostics copy */}
          <div className="diagnostic-copy" data-reveal>
            <p className="eyebrow">Code diagnostics</p>
            <h2>
              Find issues before
              <br />
              they become problems.
            </h2>
            <p className="lead">
              Detect dead code, circular dependencies, cyclomatic complexity and
              more.
            </p>

            {(
              [
                [
                  "file",
                  "Dead Code Detection",
                  "Identify unreachable code and unused symbols.",
                  "/dead-code",
                ],
                [
                  "cycle",
                  "Circular Dependency Detection",
                  "Find and resolve circular import loops.",
                  "/circular-dependencies",
                ],
                [
                  "gauge",
                  "Cyclomatic Complexity",
                  "Spot complex functions that need refactoring.",
                  "/complexity",
                ],
              ] as [IconName, string, string, string][]
            ).map(([icon, title, text, href]) => (
              <Link href={href} key={title} className="diagnostic-item">
                <span>
                  <Icon name={icon} />
                </span>
                <div>
                  <b>{title}</b>
                  <p>{text}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Right: Health card preview (demo data) */}
          <div className="health-card" data-reveal style={stagger(1)}>
            <div className="panel-heading">
              <b>Project Health</b>
              <span>example-project⌄</span>
              <small>
                Last scanned 2 hours ago <i />
              </small>
            </div>
            <div className="health-overview">
              <div className="score-ring">
                <div>
                  <strong>88</strong>
                  <span>/ 100</span>
                  <small>HEALTH SCORE</small>
                </div>
              </div>
              <div className="issue-list">
                <p>
                  <Icon name="file" size={15} />
                  <span>Dead Code</span>
                  <b>12 issues</b>
                </p>
                <p>
                  <Icon name="cycle" size={15} />
                  <span>Circular Dependencies</span>
                  <b>3 issues</b>
                </p>
                <p>
                  <Icon name="gauge" size={15} />
                  <span>High Complexity</span>
                  <b>8 functions</b>
                </p>
                <p>
                  <Icon name="folder" size={15} />
                  <span>Large Files</span>
                  <b>5 files</b>
                </p>
              </div>
            </div>
            <div className="health-lower">
              <div className="trend">
                <b>Complexity Trend</b>
                <svg viewBox="0 0 300 90" preserveAspectRatio="none">
                  <path d="M0 67 C25 55 32 60 49 62 S78 42 96 53 S122 60 143 46 S170 52 191 39 S218 45 241 31 S270 38 300 17" />
                  <path
                    className="area"
                    d="M0 67 C25 55 32 60 49 62 S78 42 96 53 S122 60 143 46 S170 52 191 39 S218 45 241 31 S270 38 300 17 V90 H0Z"
                  />
                </svg>
                <div>
                  <span>Jan</span>
                  <span>Feb</span>
                  <span>Mar</span>
                  <span>Apr</span>
                  <span>May</span>
                  <span>Jun</span>
                </div>
              </div>
              <div className="top-issues">
                <b>Top Issues</b>
                <p>
                  src/api/helpers.py <span>12.4</span>
                </p>
                <p>
                  src/core/auth.py <span>8.7</span>
                </p>
                <p>
                  models/user.py <span>7.1</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── RAG AI Showcase ───────────────────────────────────────────────── */}
        <section id="rag" className="section">
          <div className="section-heading" data-reveal>
            <div>
              <p className="eyebrow">Grounded RAG AI assistant</p>
              <h2>Ask questions about your codebase.</h2>
            </div>
            <p className="section-copy">
              Get accurate, source-grounded answers with full code context.
            </p>
          </div>

          <div className="rag-panel" data-reveal>
            {/* Question Chips */}
            <aside className="questions">
              <p>Sample questions</p>
              {ragQuestions.map((question, index) => (
                <button
                  key={question}
                  type="button"
                  className={ragActive === index ? "active" : ""}
                  onClick={() => setRagActive(index)}
                >
                  {question}
                  <span>→</span>
                </button>
              ))}
            </aside>

            {/* AI Answer */}
            <div className="ai-answer">
              <div className="answer-header">
                <Logo />
                <span>Ollama + Graph RAG⌄</span>
              </div>
              <p>{currentAnswer.answer}</p>
              <pre>
                <span>{currentAnswer.code.split("\n")[0]}</span>
                {"\n"}
                {currentAnswer.code.split("\n").slice(1).join("\n")}
              </pre>
            </div>

            {/* Source Files */}
            <aside className="sources">
              <p>Sources</p>
              {currentAnswer.sources.map((source) => (
                <span key={source}>
                  <Icon name="file" size={13} />
                  {source}
                </span>
              ))}
            </aside>
          </div>
        </section>

        {/* ── Tech Stack ────────────────────────────────────────────────────── */}
        <section className="section ecosystem">
          <p className="eyebrow">Built with a modern tech stack</p>
          <div className="tech-row" data-reveal>
            {(
              [
                "Python",
                "FastAPI",
                "Next.js",
                "PostgreSQL",
                "Neo4j",
                "Qdrant",
                "Ollama",
                "Tree-sitter",
              ] as string[]
            ).map((tech, index) => (
              <span key={tech}>
                <Icon
                  name={
                    index % 3 === 0
                      ? "code"
                      : index % 3 === 1
                      ? "database"
                      : "graph"
                  }
                  size={15}
                />
                {tech}
              </span>
            ))}
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────────────────── */}
        <section className="final-cta" data-reveal>
          <div>
            <h2>
              Ready to analyze your <span>codebase?</span>
            </h2>
            <p>
              Join developers who use CodeGraph AI to understand, analyze and
              improve their codebases.
            </p>
          </div>
          <Link className="primary-button" href="/dashboard">
            Open Workspace <span>→</span>
          </Link>
        </section>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer id="footer">
        <div className="footer-main">
          <div>
            <Logo />
            <p>AI-powered code intelligence for modern development.</p>
          </div>

          {footerColumns.map(({ title, links }) => (
            <div className="footer-column" key={title}>
              <b>{title}</b>
              {links.map(({ label, href }) =>
                href.startsWith("/") ? (
                  <Link key={label} href={href}>
                    {label}
                  </Link>
                ) : (
                  <a key={label} href={href}>
                    {label}
                  </a>
                )
              )}
            </div>
          ))}
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} CodeGraph AI. All rights reserved.</span>
          <span>Designed for developers. Built with precision.</span>
        </div>
      </footer>
    </div>
  );
}
