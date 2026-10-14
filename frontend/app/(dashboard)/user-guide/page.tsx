"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  Cpu,
  Database,
  FileCode2,
  FileText,
  FolderGit2,
  FolderKanban,
  GitFork,
  GitGraph,
  HelpCircle,
  Layers,
  Lightbulb,
  Network,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  TreePine,
  Wrench,
  X,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/cn";

// Topic Navigation Items (for quick-jump pills & search indexing)
const TOPIC_ITEMS = [
  { id: "quick-start", number: "01", label: "Quick Start", icon: Zap, keywords: "quick start 11 steps setup process workflow console repo ingestion" },
  { id: "project-setup", number: "02", label: "Project Context", icon: FolderKanban, keywords: "project creation active context useActiveProject workspace priority resolution" },
  { id: "repository-ingestion", number: "03", label: "Adding Repositories", icon: FolderGit2, keywords: "repository ingestion git zip upload github clone archive" },
  { id: "explorer-ast", number: "04", label: "Explorer & Code", icon: FileText, keywords: "repository explorer code viewer tree view file syntax inline symbols" },
  { id: "ast-treesitter", number: "05", label: "AST Engine", icon: TreePine, keywords: "tree-sitter ast parsing parser language support python javascript typescript tsx" },
  { id: "extracted-symbols", number: "06", label: "Symbols", icon: Code2, keywords: "extracted symbols entities functions classes variables parameters route handlers" },
  { id: "graph-relationships", number: "07", label: "Graph Edges", icon: GitFork, keywords: "graph relationships edge taxonomy imports declares calls extends has_method handles neo4j" },
  { id: "knowledge-graph", number: "08", label: "Knowledge Graph", icon: GitGraph, keywords: "knowledge graph canvas depth hops react flow dagre layout" },
  { id: "quality-analysis", number: "09", label: "Code Quality", icon: ShieldCheck, keywords: "quality analysis static dead code circular complexity health score cyclomatic tarjan" },
  { id: "rag-assistant", number: "10", label: "RAG Assistant", icon: Sparkles, keywords: "rag grounded ai assistant chat vector qdrant neo4j ollama hybrid retrieval" },
  { id: "rag-tips", number: "11", label: "RAG Prompting", icon: Lightbulb, keywords: "rag tips prompting guidance questions best practices jwt caller ast" },
  { id: "dev-diagnostics", number: "12", label: "Diagnostics", icon: Wrench, keywords: "developer tools diagnostics internal health pool postgresql neo4j qdrant" },
  { id: "end-to-end-workflow", number: "13", label: "Visual Workflow", icon: Network, keywords: "end to end visual workflow pipeline architecture diagram source treesitter ollama" },
  { id: "troubleshooting", number: "14", label: "Troubleshooting", icon: ShieldAlert, keywords: "troubleshooting errors issues neo4j ollama zip extraction empty graph nodes" },
  { id: "faq", number: "15", label: "FAQs", icon: HelpCircle, keywords: "faq frequently asked questions local offline security cloud license" },
];

// Quick Start Sequence Steps
const QUICK_START_STEPS = [
  { step: "01", title: "Access Console", desc: "Navigate to the CodeGraph AI console overview.", link: "/dashboard" },
  { step: "02", title: "Create or Select Project", desc: "Use the project selector dropdown or create a new workspace.", link: "/projects" },
  { step: "03", title: "Ingest Repository", desc: "Provide a public GitHub HTTPS clone URL or upload a local ZIP archive.", link: "/repository" },
  { step: "04", title: "Tree-sitter AST Parsing", desc: "Backend parser processes Python, JS, TS, and TSX files into concrete AST trees.", link: "/ast" },
  { step: "05", title: "Symbol Extraction", desc: "Extracts functions, methods, classes, variables, and routes into PostgreSQL.", link: "/symbols" },
  { step: "06", title: "Graph Edge Construction", desc: "Constructs 6 types of relationships (IMPORTS, DECLARES, CALLS, etc.) in Neo4j.", link: "/relationships" },
  { step: "07", title: "Vector Embedding Indexing", desc: "Indexes 384-dimensional bge-small vector embeddings in Qdrant.", link: "/chat" },
  { step: "08", title: "Repository & AST Exploration", desc: "Inspect file structure tree-view, syntax highlighting, and parsed AST structures.", link: "/repository" },
  { step: "09", title: "Interactive Graph Canvas", desc: "Visualize graph nodes, search symbols, and switch Depth controls (1, 2, 3 Hops).", link: "/graph" },
  { step: "10", title: "Static Code Quality Audit", desc: "Inspect dead code reachability, circular cycles, and complexity metrics.", link: "/quality" },
  { step: "11", title: "Ask Grounded RAG AI", desc: "Ask questions about your codebase in /chat with graph-augmented vector search.", link: "/chat" },
];

// Reusable Code Snippet Block with Copy Button
function CodeSnippet({ code, label = "code" }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="my-3 max-w-full overflow-hidden rounded-lg border border-white/[0.08] bg-[#05070b]">
      <div className="flex h-8 items-center border-b border-white/[0.06] bg-white/[0.02] px-3">
        <Terminal className="h-3.5 w-3.5 text-primary/75" />
        <span className="ml-2 font-mono text-[10px] text-muted-foreground">{label}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="ml-auto flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground transition-colors hover:text-primary cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="max-w-full overflow-x-auto p-3 font-mono text-[12px] leading-relaxed text-[#c9d4e3]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// Copyable Prompt Pattern Item
function PromptPatternCard({ prompt, explanation }: { prompt: string; explanation: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(prompt).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="group rounded-lg border border-white/[0.07] bg-[#080b12] p-3.5 transition-all hover:border-primary/25">
      <div className="flex items-start justify-between gap-3">
        <div className="font-mono text-xs font-semibold text-white selection:bg-primary/20">
          &ldquo;{prompt}&rdquo;
        </div>
        <button
          type="button"
          onClick={handleCopy}
          title="Copy prompt"
          className="shrink-0 flex items-center gap-1 rounded border border-white/[0.08] bg-white/[0.02] px-2 py-1 font-mono text-[10px] text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="h-2.5 w-2.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-2.5 w-2.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="mt-1.5 text-[11.5px] leading-5 text-[#8897a8]">{explanation}</div>
    </div>
  );
}

// Visual End-to-End Workflow Diagram Component
function ArchitectureFlow() {
  const nodes = [
    { label: "1. Source Input", sub: "Git Clone / ZIP File", icon: FolderGit2 },
    { label: "2. Tree-sitter AST", sub: "Symbol & Syntax Parsing", icon: TreePine },
    { label: "3. Neo4j + Qdrant", sub: "Graph Edges & Vectors", icon: Database },
    { label: "4. Grounded RAG", sub: "Ollama qwen2.5-coder:7b", icon: Sparkles },
  ];

  return (
    <div className="my-4 rounded-xl border border-primary/20 bg-primary/[0.02] p-4 sm:p-5">
      <div className="cg-label mb-3 !text-[9px]">Documented Architecture Pipeline</div>
      <div className="flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center">
        {nodes.map((node, index) => (
          <React.Fragment key={node.label}>
            <div className="flex min-h-16 flex-1 items-center justify-center gap-3 rounded-lg border border-white/[0.075] bg-[#080b12] p-3 text-center sm:flex-col hover:border-primary/35 transition-colors">
              <node.icon className="h-5 w-5 text-primary shrink-0" />
              <div>
                <span className="block font-mono text-[11.5px] font-semibold text-white">{node.label}</span>
                <span className="block text-[10.5px] text-muted-foreground mt-0.5">{node.sub}</span>
              </div>
            </div>
            {index < nodes.length - 1 && (
              <ChevronRight className="h-4 w-4 rotate-90 self-center text-primary/40 sm:rotate-0 shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="mt-3.5 text-center font-mono text-[10px] text-muted-foreground border-t border-white/[0.06] pt-2.5">
        Strictly Isolated Per Project Workspace • Fast Local Inference
      </div>
    </div>
  );
}

export default function UserGuidePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const jumpToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Filter topics based on search query
  const matchingTopics = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return TOPIC_ITEMS;
    return TOPIC_ITEMS.filter((item) => {
      return (
        item.label.toLowerCase().includes(q) ||
        item.keywords.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
      );
    });
  }, [searchQuery]);

  const matchesSearch = (id: string) => {
    if (!searchQuery.trim()) return true;
    return matchingTopics.some((t) => t.id === id);
  };

  return (
    <div className="mx-auto max-w-[1100px] px-3 sm:px-6 py-6 md:py-8 space-y-7 pb-20">
      {/* ── 1. Page Header ── */}
      <section className="relative z-30 reveal" style={{ ["--d" as string]: "80ms" }}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="cg-label !text-[10px]">CODEGRAPH AI / DOCUMENTATION</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
                User Guide
              </h1>
              <BookOpen className="hidden h-6 w-6 text-primary/70 md:block" strokeWidth={1.5} />
            </div>
            <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-[#8a99ad]">
              Learn how to ingest repositories, inspect code structure, explore relationships, review quality, and query your codebase with AI.
            </p>
          </div>

          {/* Search bar */}
          <div className="w-full lg:w-[340px] shrink-0">
            <div className="relative">
              <label className="flex h-9.5 items-center gap-2.5 rounded-lg border border-white/[0.08] bg-black/25 px-3 transition-all focus-within:border-primary/40 focus-within:shadow-[0_0_0_3px_rgba(0,229,255,0.06)]">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search documentation..."
                  className="w-full min-w-0 bg-transparent text-[12.5px] text-white outline-none placeholder:text-muted-foreground/60 font-mono"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="cursor-pointer text-muted-foreground hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </label>

              {/* Instant Search Dropdown when query is active */}
              {searchQuery && (
                <div className="absolute inset-x-0 top-full z-40 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-white/[0.1] bg-[#090d16]/98 p-1.5 shadow-2xl backdrop-blur-xl">
                  <div className="px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                    {matchingTopics.length} matching {matchingTopics.length === 1 ? "section" : "sections"}
                  </div>
                  {matchingTopics.length > 0 ? (
                    matchingTopics.map((topic) => (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => {
                          jumpToSection(topic.id);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/[0.05] cursor-pointer"
                      >
                        <topic.icon className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-[12px] text-slate-200 truncate">{topic.label}</span>
                        <span className="ml-auto font-mono text-[9.5px] text-muted-foreground">{topic.number}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-center text-[12px] text-muted-foreground">
                      No matching sections
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="mt-1.5 text-right font-mono text-[10px] text-muted-foreground">
              15 sections · Single page
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Quick-Jump Horizontal Pills ── */}
      <section className="reveal" style={{ ["--d" as string]: "110ms" }}>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
          {TOPIC_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => jumpToSection(item.id)}
              className="flex items-center gap-1.5 shrink-0 rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5 text-[11px] font-mono text-muted-foreground hover:border-primary/40 hover:bg-primary/[0.04] hover:text-primary transition-all cursor-pointer"
            >
              <item.icon className="h-3 w-3" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Search Filter Banner (if filtering is active) */}
      {searchQuery && (
        <div className="flex items-center justify-between rounded-lg border border-primary/25 bg-primary/[0.04] px-3.5 py-2 text-xs font-mono text-primary">
          <span>Filtering documentation for: &ldquo;{searchQuery}&rdquo; ({matchingTopics.length} sections visible)</span>
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="underline hover:text-white cursor-pointer ml-3"
          >
            Reset filter
          </button>
        </div>
      )}

      {/* ── Section 1: Quick Start Sequence (11 Steps) ── */}
      {matchesSearch("quick-start") && (
        <section
          id="quick-start"
          className="scroll-mt-20 rounded-xl border border-white/[0.08] bg-[#070b14]/75 backdrop-blur-md p-5 sm:p-7 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)] transition-all hover:border-white/[0.12]"
        >
          <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] pb-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/[0.05] text-primary">
                <Zap className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-primary">01</span>
                  <h2 className="text-[18px] sm:text-[20px] font-semibold text-white tracking-tight">
                    Quick Start Sequence (11 Steps)
                  </h2>
                </div>
                <p className="mt-0.5 text-[12.5px] text-muted-foreground font-mono">
                  Step-by-step workflow to analyze your first repository
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex rounded border border-primary/20 bg-primary/[0.04] px-2 py-0.5 font-mono text-[10px] text-primary">
              11 steps
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {QUICK_START_STEPS.map((item) => (
              <div
                key={item.step}
                className="group flex items-start justify-between gap-3 rounded-lg border border-white/[0.06] bg-[#080a12]/80 p-3.5 transition-all hover:border-primary/30 hover:bg-[#0c101c]"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/[0.06] font-mono text-[10px] font-bold text-primary">
                    {item.step}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-white group-hover:text-primary transition-colors">
                      {item.title}
                    </div>
                    <div className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                      {item.desc}
                    </div>
                  </div>
                </div>
                <Link
                  href={item.link}
                  className="shrink-0 flex items-center gap-1 rounded border border-white/[0.07] bg-white/[0.02] px-2 py-1 font-mono text-[10px] text-muted-foreground group-hover:border-primary/30 group-hover:text-primary transition-colors self-center"
                >
                  <span>Open</span>
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Section 2: Project Creation & Active Context ── */}
      {matchesSearch("project-setup") && (
        <section
          id="project-setup"
          className="scroll-mt-20 rounded-xl border border-white/[0.08] bg-[#070b14]/75 backdrop-blur-md p-5 sm:p-7 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)] transition-all hover:border-white/[0.12]"
        >
          <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4 mb-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/[0.05] text-primary">
              <FolderKanban className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-primary">02</span>
                <h2 className="text-[18px] sm:text-[20px] font-semibold text-white tracking-tight">
                  Project Creation & Active Context
                </h2>
              </div>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground font-mono">
                Managing project workspaces & state resolution
              </p>
            </div>
          </div>

          <div className="space-y-4 text-[13.5px] leading-relaxed text-[#a3b1c2]">
            <p>
              CodeGraph AI organizes codebases into distinct <strong className="text-white">Project Workspaces</strong>. Every analysis step—AST parsing, Neo4j graph nodes, Qdrant vectors, and quality metrics—is strictly isolated per project.
            </p>

            <div className="rounded-lg border border-white/[0.08] bg-[#080b12] p-4 font-mono text-xs space-y-2">
              <div className="text-white font-semibold flex items-center gap-2">
                <span>Active Project Resolution Priority (useActiveProject):</span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground pl-1">
                <li><span className="text-slate-200">Explicit Route Parameter:</span> e.g. <code className="text-primary bg-primary/[0.06] px-1 py-0.5 rounded">/projects/[id]</code></li>
                <li><span className="text-slate-200">URL Query Parameter:</span> e.g. <code className="text-primary bg-primary/[0.06] px-1 py-0.5 rounded">/graph?projectId=4</code></li>
                <li><span className="text-slate-200">LocalStorage Key:</span> <code className="text-primary bg-primary/[0.06] px-1 py-0.5 rounded">activeProjectId</code> stored in browser session</li>
              </ol>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div className="rounded-lg border border-white/[0.07] bg-[#080b12] p-4">
                <div className="font-mono text-xs font-semibold text-white mb-1">Creating a Project</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Click &ldquo;New Project&rdquo; in /projects, enter a project title, repository name, description, and target language stack.
                </p>
              </div>
              <div className="rounded-lg border border-white/[0.07] bg-[#080b12] p-4">
                <div className="font-mono text-xs font-semibold text-white mb-1">Switching Contexts</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Use the top navigation workspace selector or project switcher to instantly change active project context across all tool pages.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Section 3: Adding Repositories (Git & ZIP) ── */}
      {matchesSearch("repository-ingestion") && (
        <section
          id="repository-ingestion"
          className="scroll-mt-20 rounded-xl border border-white/[0.08] bg-[#070b14]/75 backdrop-blur-md p-5 sm:p-7 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)] transition-all hover:border-white/[0.12]"
        >
          <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4 mb-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/[0.05] text-primary">
              <FolderGit2 className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-primary">03</span>
                <h2 className="text-[18px] sm:text-[20px] font-semibold text-white tracking-tight">
                  Adding Repositories (Git & ZIP)
                </h2>
              </div>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground font-mono">
                Ingestion pipelines for remote Git repositories & local archives
              </p>
            </div>
          </div>

          <div className="space-y-4 text-[13.5px] leading-relaxed text-[#a3b1c2]">
            <p>CodeGraph AI supports two seamless methods to bring source code into the engine:</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-white/[0.07] bg-[#080b12] p-4.5">
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-white mb-2">
                  <FolderGit2 className="h-4 w-4 text-primary" />
                  <span>Option A: GitHub Git Clone</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                  Provide a public GitHub repository HTTPS URL (e.g., <code className="text-primary font-mono text-[11px]">https://github.com/owner/repo.git</code>).
                </p>
                <ul className="text-xs text-[#8a99ad] space-y-1.5 font-mono">
                  <li className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-primary" />
                    <span>Clones default branch automatically</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-primary" />
                    <span>Traverses subdirectories & packages</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-primary" />
                    <span>Ignores node_modules, .git, venv</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-lg border border-white/[0.07] bg-[#080b12] p-4.5">
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-white mb-2">
                  <FileCode2 className="h-4 w-4 text-primary" />
                  <span>Option B: Local ZIP Archive Upload</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                  Upload a compressed <code className="text-primary font-mono text-[11px]">.zip</code> file containing your local source code directory.
                </p>
                <ul className="text-xs text-[#8a99ad] space-y-1.5 font-mono">
                  <li className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-primary" />
                    <span>Extracts directly to project storage</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-primary" />
                    <span>Preserves nested directory paths</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-primary" />
                    <span>Automatic UTF-8 text validation</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Section 4: Repository Explorer & Code Viewer ── */}
      {matchesSearch("explorer-ast") && (
        <section
          id="explorer-ast"
          className="scroll-mt-20 rounded-xl border border-white/[0.08] bg-[#070b14]/75 backdrop-blur-md p-5 sm:p-7 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)] transition-all hover:border-white/[0.12]"
        >
          <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4 mb-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/[0.05] text-primary">
              <FileText className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-primary">04</span>
                <h2 className="text-[18px] sm:text-[20px] font-semibold text-white tracking-tight">
                  Repository Explorer & Code Viewer
                </h2>
              </div>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground font-mono">
                Interactive source file tree & symbol inspector
              </p>
            </div>
          </div>

          <div className="space-y-4 text-[13.5px] leading-relaxed text-[#a3b1c2]">
            <p>
              The <strong className="text-white">Repository Explorer</strong> page (/repository) provides a high-performance workspace to browse project files, view raw source code with line numbers, and inspect inline AST symbols.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div className="rounded-lg border border-white/[0.07] bg-[#080b12] p-4">
                <div className="font-mono text-xs font-semibold text-white mb-1 flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-primary" />
                  <span>Directory Tree Navigation</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Nested folder expansion with file type icons, git file hierarchy traversal, and file-size indicators.
                </p>
              </div>

              <div className="rounded-lg border border-white/[0.07] bg-[#080b12] p-4">
                <div className="font-mono text-xs font-semibold text-white mb-1 flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-primary" />
                  <span>Syntax-Highlighted Code View</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Clean dark code display with active line highlighting, copy options, and syntax coloring.
                </p>
              </div>

              <div className="rounded-lg border border-white/[0.07] bg-[#080b12] p-4">
                <div className="font-mono text-xs font-semibold text-white mb-1 flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-primary" />
                  <span>Line-Range Deep Linking</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Deep-link directly to line ranges (e.g. <code className="text-primary font-mono text-[11px]">/repository?filePath=main.py&startLine=12&endLine=45</code>).
                </p>
              </div>

              <div className="rounded-lg border border-white/[0.07] bg-[#080b12] p-4">
                <div className="font-mono text-xs font-semibold text-white mb-1 flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-primary" />
                  <span>Inline Symbol Sidebar</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  View all functions, classes, and variables declared within the selected file in real-time.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Section 5: Tree-Sitter AST Parsing Engine ── */}
      {matchesSearch("ast-treesitter") && (
        <section
          id="ast-treesitter"
          className="scroll-mt-20 rounded-xl border border-white/[0.08] bg-[#070b14]/75 backdrop-blur-md p-5 sm:p-7 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)] transition-all hover:border-white/[0.12]"
        >
          <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4 mb-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/[0.05] text-primary">
              <TreePine className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-primary">05</span>
                <h2 className="text-[18px] sm:text-[20px] font-semibold text-white tracking-tight">
                  Tree-Sitter AST Parsing Engine
                </h2>
              </div>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground font-mono">
                Concrete syntax tree parsing for multi-language codebases
              </p>
            </div>
          </div>

          <div className="space-y-4 text-[13.5px] leading-relaxed text-[#a3b1c2]">
            <p>
              CodeGraph AI employs <strong className="text-white">Tree-sitter</strong>—an industry-standard incremental parsing library—to build concrete syntax trees (CST/AST) for source files.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
              {[
                { lang: "Python (.py)", parser: "tree-sitter-python" },
                { lang: "JavaScript (.js)", parser: "tree-sitter-javascript" },
                { lang: "TypeScript (.ts)", parser: "tree-sitter-typescript" },
                { lang: "TSX (.tsx)", parser: "tree-sitter-tsx" },
              ].map((item) => (
                <div key={item.lang} className="rounded-lg border border-white/[0.07] bg-[#080b12] p-3 text-center">
                  <div className="font-semibold text-white">{item.lang}</div>
                  <div className="text-[10px] text-primary mt-1">{item.parser}</div>
                </div>
              ))}
            </div>

            <CodeSnippet
              label="AST Node Traversal"
              code={`// Example AST structure generated during parse
module → function_definition [name: "calculate_complexity"]
  ├── parameters → identifier [name: "ast_tree"]
  └── block → return_statement → binary_operator`}
            />
          </div>
        </section>
      )}

      {/* ── Section 6: Extracted Code Entities & Symbols ── */}
      {matchesSearch("extracted-symbols") && (
        <section
          id="extracted-symbols"
          className="scroll-mt-20 rounded-xl border border-white/[0.08] bg-[#070b14]/75 backdrop-blur-md p-5 sm:p-7 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)] transition-all hover:border-white/[0.12]"
        >
          <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4 mb-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/[0.05] text-primary">
              <Code2 className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-primary">06</span>
                <h2 className="text-[18px] sm:text-[20px] font-semibold text-white tracking-tight">
                  Extracted Code Entities & Symbols
                </h2>
              </div>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground font-mono">
                Structural symbol taxonomy & relational attributes
              </p>
            </div>
          </div>

          <div className="space-y-4 text-[13.5px] leading-relaxed text-[#a3b1c2]">
            <p>
              During AST traversal, CodeGraph AI identifies and categorizes source code elements into structured <strong className="text-white">Code Entities</strong> stored in PostgreSQL and mapped into Neo4j nodes.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="rounded-lg border border-white/[0.07] bg-[#080b12] p-4">
                <div className="font-mono text-xs font-bold text-white mb-1.5 flex items-center gap-2">
                  <Code2 className="h-3.5 w-3.5 text-primary" />
                  <span>Functions & Methods</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Captures function name, parameter lists, return types, line range (start/end), async flags, and docstrings.
                </p>
              </div>

              <div className="rounded-lg border border-white/[0.07] bg-[#080b12] p-4">
                <div className="font-mono text-xs font-bold text-white mb-1.5 flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-sky-400" />
                  <span>Classes & Interfaces</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Extracts class declarations, base classes (inheritance), decorators, member fields, and constructor methods.
                </p>
              </div>

              <div className="rounded-lg border border-white/[0.07] bg-[#080b12] p-4">
                <div className="font-mono text-xs font-bold text-white mb-1.5 flex items-center gap-2">
                  <Network className="h-3.5 w-3.5 text-emerald-400" />
                  <span>API Routes & Handlers</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Identifies REST/HTTP route endpoints (GET, POST, PUT, DELETE), path decorators, and request handlers.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Section 7: Graph Edge Taxonomy (6 Types) ── */}
      {matchesSearch("graph-relationships") && (
        <section
          id="graph-relationships"
          className="scroll-mt-20 rounded-xl border border-white/[0.08] bg-[#070b14]/75 backdrop-blur-md p-5 sm:p-7 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)] transition-all hover:border-white/[0.12]"
        >
          <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4 mb-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/[0.05] text-primary">
              <GitFork className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-primary">07</span>
                <h2 className="text-[18px] sm:text-[20px] font-semibold text-white tracking-tight">
                  Graph Edge Taxonomy (6 Relationship Types)
                </h2>
              </div>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground font-mono">
                Neo4j property graph edge definitions
              </p>
            </div>
          </div>

          <div className="space-y-4 text-[13.5px] leading-relaxed text-[#a3b1c2]">
            <p>
              CodeGraph AI constructs a rich property graph in Neo4j comprising 6 distinct directed relationship edge types:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 font-mono text-xs">
              {[
                { edge: "IMPORTS", desc: "File or module imports another CodeFile or external package dependency." },
                { edge: "DECLARES", desc: "CodeFile declares a CodeEntity (function, class, variable, or route)." },
                { edge: "CALLS", desc: "Function or method invokes another function, method, or external API call." },
                { edge: "EXTENDS", desc: "Class inherits from or extends another base class or interface." },
                { edge: "HAS_METHOD", desc: "Class entity contains a member method or constructor." },
                { edge: "HANDLES", desc: "CodeEntity handles an API Route HTTP request endpoint." },
              ].map((item) => (
                <div key={item.edge} className="rounded-lg border border-white/[0.07] bg-[#080b12] p-4 hover:border-primary/25 transition-colors">
                  <div className="font-bold text-white mb-1 flex items-center gap-2">
                    <span className="text-primary font-mono font-semibold">(:Node)-[:{item.edge}]-&gt;(:Node)</span>
                  </div>
                  <div className="text-xs text-muted-foreground font-sans leading-relaxed mt-1">
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Section 8: Knowledge Graph Canvas & Hops ── */}
      {matchesSearch("knowledge-graph") && (
        <section
          id="knowledge-graph"
          className="scroll-mt-20 rounded-xl border border-white/[0.08] bg-[#070b14]/75 backdrop-blur-md p-5 sm:p-7 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)] transition-all hover:border-white/[0.12]"
        >
          <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4 mb-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/[0.05] text-primary">
              <GitGraph className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-primary">08</span>
                <h2 className="text-[18px] sm:text-[20px] font-semibold text-white tracking-tight">
                  Knowledge Graph Canvas & Depth Hops
                </h2>
              </div>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground font-mono">
                Interactive graph canvas powered by React Flow & Dagre layout
              </p>
            </div>
          </div>

          <div className="space-y-4 text-[13.5px] leading-relaxed text-[#a3b1c2]">
            <p>
              The <strong className="text-white">Knowledge Graph Canvas</strong> (/graph) allows developers to visually inspect architectural dependencies and trace call hierarchies in real-time.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
              <div className="rounded-lg border border-white/[0.07] bg-[#080b12] p-4">
                <div className="font-mono text-xs font-bold text-white mb-1">Depth: 1 Hop</div>
                <div className="text-xs text-muted-foreground leading-relaxed">
                  Shows direct immediate connections of selected symbol. Best for focused debugging.
                </div>
              </div>

              <div className="rounded-lg border border-white/[0.07] bg-[#080b12] p-4">
                <div className="font-mono text-xs font-bold text-white mb-1">Depth: 2 Hops</div>
                <div className="text-xs text-muted-foreground leading-relaxed">
                  Expands 2 levels of callers, callees, imports, and declarations. Ideal for module overview.
                </div>
              </div>

              <div className="rounded-lg border border-white/[0.07] bg-[#080b12] p-4">
                <div className="font-mono text-xs font-bold text-white mb-1">Depth: 3 Hops</div>
                <div className="text-xs text-muted-foreground leading-relaxed">
                  Deep multi-level architectural dependency sub-graph for subsystem exploration.
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Section 9: Static Code Quality & Health Score ── */}
      {matchesSearch("quality-analysis") && (
        <section
          id="quality-analysis"
          className="scroll-mt-20 rounded-xl border border-white/[0.08] bg-[#070b14]/75 backdrop-blur-md p-5 sm:p-7 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)] transition-all hover:border-white/[0.12]"
        >
          <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4 mb-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/[0.05] text-primary">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-primary">09</span>
                <h2 className="text-[18px] sm:text-[20px] font-semibold text-white tracking-tight">
                  Static Code Quality & Health Score
                </h2>
              </div>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground font-mono">
                Static graph traversal algorithms & complexity metrics
              </p>
            </div>
          </div>

          <div className="space-y-4 text-[13.5px] leading-relaxed text-[#a3b1c2]">
            <p>
              CodeGraph AI analyzes graph topology to identify code debt, unused code, and structural risks across four distinct dimensions:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div className="rounded-lg border border-white/[0.07] bg-[#080b12] p-4">
                <div className="font-mono text-xs font-bold text-white mb-1.5 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-rose-400" />
                  <span>Dead Code Reachability</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Uses graph traversal (BFS/DFS) from entry points to identify orphan functions and unreachable modules with zero inbound CALLS/IMPORTS edges.
                </p>
              </div>

              <div className="rounded-lg border border-white/[0.07] bg-[#080b12] p-4">
                <div className="font-mono text-xs font-bold text-white mb-1.5 flex items-center gap-2">
                  <GitFork className="h-4 w-4 text-amber-400" />
                  <span>Circular Dependency Loops</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Detects import cycles (A &rarr; B &rarr; C &rarr; A) using Tarjan&apos;s strongly connected components DFS algorithm on IMPORTS relationships.
                </p>
              </div>

              <div className="rounded-lg border border-white/[0.07] bg-[#080b12] p-4">
                <div className="font-mono text-xs font-bold text-white mb-1.5 flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-cyan-400" />
                  <span>Cyclomatic Complexity V(G)</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Calculates decision points in AST trees: V(G) = E - N + 2P. Flags functions exceeding complexity threshold V(G) &gt; 10.
                </p>
              </div>

              <div className="rounded-lg border border-white/[0.07] bg-[#080b12] p-4">
                <div className="font-mono text-xs font-bold text-white mb-1.5 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <span>Composite Health Score (0-100)</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Combines dead code ratio, circular cycle counts, and high-complexity penalties into a single 0-100 quality benchmark score.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Section 10: Grounded RAG AI Assistant ── */}
      {matchesSearch("rag-assistant") && (
        <section
          id="rag-assistant"
          className="scroll-mt-20 rounded-xl border border-white/[0.08] bg-[#070b14]/75 backdrop-blur-md p-5 sm:p-7 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)] transition-all hover:border-white/[0.12]"
        >
          <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4 mb-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/[0.05] text-primary">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-primary">10</span>
                <h2 className="text-[18px] sm:text-[20px] font-semibold text-white tracking-tight">
                  Grounded RAG AI Assistant
                </h2>
              </div>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground font-mono">
                Hybrid Vector + Knowledge Graph RAG powered by Ollama
              </p>
            </div>
          </div>

          <div className="space-y-4 text-[13.5px] leading-relaxed text-[#a3b1c2]">
            <p>
              The <strong className="text-white">AI RAG Assistant</strong> (/chat) delivers accurate, hallucination-free answers about your codebase by combining two retrieval engines:
            </p>

            <div className="rounded-lg border border-white/[0.08] bg-[#080b12] p-4.5 space-y-3.5">
              <div className="font-mono text-xs font-bold text-white flex items-center gap-2">
                <span>Hybrid Retrieval Architecture:</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs font-mono">
                <div className="rounded-lg border border-white/[0.07] bg-black/40 p-3.5">
                  <div className="text-white font-bold mb-1 flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5 text-primary" />
                    <span>1. Qdrant Dense Vector Search</span>
                  </div>
                  <div className="text-muted-foreground font-sans leading-relaxed">
                    Retrieves semantic code chunks via BAAI/bge-small-en-v1.5 embeddings (384 dimensions).
                  </div>
                </div>

                <div className="rounded-lg border border-white/[0.07] bg-black/40 p-3.5">
                  <div className="text-white font-bold mb-1 flex items-center gap-1.5">
                    <Network className="h-3.5 w-3.5 text-sky-400" />
                    <span>2. Neo4j Graph Context</span>
                  </div>
                  <div className="text-muted-foreground font-sans leading-relaxed">
                    Fetches exact callers, callees, imports, and AST parent symbols for retrieved code blocks.
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground pt-2.5 border-t border-white/[0.06] leading-relaxed">
                Both contexts are synthesized into a grounded prompt passed to local <strong className="text-white">Ollama (qwen2.5-coder:7b)</strong> for streaming SSE responses with line-level file citations.
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Section 11: RAG Prompting & Best Practices ── */}
      {matchesSearch("rag-tips") && (
        <section
          id="rag-tips"
          className="scroll-mt-20 rounded-xl border border-white/[0.08] bg-[#070b14]/75 backdrop-blur-md p-5 sm:p-7 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)] transition-all hover:border-white/[0.12]"
        >
          <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4 mb-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/[0.05] text-primary">
              <Lightbulb className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-primary">11</span>
                <h2 className="text-[18px] sm:text-[20px] font-semibold text-white tracking-tight">
                  RAG Prompting & Best Practices
                </h2>
              </div>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground font-mono">
                Formulating effective codebase queries
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            <p className="text-[13.5px] leading-relaxed text-[#a3b1c2]">
              Use these recommended prompting patterns to get the most accurate answers from the hybrid retrieval system:
            </p>

            <div className="space-y-2.5 pt-1">
              <PromptPatternCard
                prompt="Where is the authentication JWT token verified in this project?"
                explanation="Triggers dense vector search for JWT keywords and traverses Neo4j HANDLES routes."
              />
              <PromptPatternCard
                prompt="Show me all functions that call calculate_health_score and their caller hierarchy."
                explanation="Leverages Neo4j CALLS graph edges to return precise multi-level caller trees."
              />
              <PromptPatternCard
                prompt="Explain how the AST tree-sitter parser handles python decorator nodes."
                explanation="Ingests Tree-sitter AST files and returns implementation snippets with line numbers."
              />
            </div>
          </div>
        </section>
      )}

      {/* ── Section 12: Developer Tools & Diagnostics ── */}
      {matchesSearch("dev-diagnostics") && (
        <section
          id="dev-diagnostics"
          className="scroll-mt-20 rounded-xl border border-white/[0.08] bg-[#070b14]/75 backdrop-blur-md p-5 sm:p-7 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)] transition-all hover:border-white/[0.12]"
        >
          <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4 mb-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/[0.05] text-primary">
              <Wrench className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-primary">12</span>
                <h2 className="text-[18px] sm:text-[20px] font-semibold text-white tracking-tight">
                  Developer Tools & Diagnostics
                </h2>
              </div>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground font-mono">
                System telemetry & backend component health at /developer
              </p>
            </div>
          </div>

          <div className="space-y-4 text-[13.5px] leading-relaxed text-[#a3b1c2]">
            <p>
              The <strong className="text-white">Developer Diagnostics Console</strong> (/developer) provides real-time infrastructure metrics for backend microservices:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs pt-1">
              <div className="rounded-lg border border-white/[0.07] bg-[#080b12] p-4">
                <div className="text-white font-bold mb-1 flex items-center gap-2">
                  <Database className="h-3.5 w-3.5 text-primary" />
                  <span>PostgreSQL 16</span>
                </div>
                <div className="text-[11.5px] text-muted-foreground font-sans mt-1">
                  Relational DB table sizes, active connection pool stats, migration states.
                </div>
              </div>

              <div className="rounded-lg border border-white/[0.07] bg-[#080b12] p-4">
                <div className="text-white font-bold mb-1 flex items-center gap-2">
                  <Network className="h-3.5 w-3.5 text-sky-400" />
                  <span>Neo4j Graph Database</span>
                </div>
                <div className="text-[11.5px] text-muted-foreground font-sans mt-1">
                  Node counts, relationship counts, Cypher query latency, bolt connection pool.
                </div>
              </div>

              <div className="rounded-lg border border-white/[0.07] bg-[#080b12] p-4">
                <div className="text-white font-bold mb-1 flex items-center gap-2">
                  <Cpu className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Qdrant Vector DB</span>
                </div>
                <div className="text-[11.5px] text-muted-foreground font-sans mt-1">
                  Collection vector counts, payload memory usage, embedding indexing status.
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Section 13: End-to-End Visual Workflow ── */}
      {matchesSearch("end-to-end-workflow") && (
        <section
          id="end-to-end-workflow"
          className="scroll-mt-20 rounded-xl border border-white/[0.08] bg-[#070b14]/75 backdrop-blur-md p-5 sm:p-7 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)] transition-all hover:border-white/[0.12]"
        >
          <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4 mb-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/[0.05] text-primary">
              <Network className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-primary">13</span>
                <h2 className="text-[18px] sm:text-[20px] font-semibold text-white tracking-tight">
                  End-to-End Visual Workflow
                </h2>
              </div>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground font-mono">
                Architectural data pipeline flow from source code to RAG AI
              </p>
            </div>
          </div>

          <div className="space-y-4 text-[13.5px] leading-relaxed text-[#a3b1c2]">
            <p>
              Trace raw code repositories as they flow through automated Tree-sitter parsing, Neo4j graph edge creation, Qdrant vector indexing, and grounded inference:
            </p>

            <ArchitectureFlow />
          </div>
        </section>
      )}

      {/* ── Section 14: Troubleshooting Guide ── */}
      {matchesSearch("troubleshooting") && (
        <section
          id="troubleshooting"
          className="scroll-mt-20 rounded-xl border border-white/[0.08] bg-[#070b14]/75 backdrop-blur-md p-5 sm:p-7 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)] transition-all hover:border-white/[0.12]"
        >
          <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4 mb-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/[0.05] text-primary">
              <ShieldAlert className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-primary">14</span>
                <h2 className="text-[18px] sm:text-[20px] font-semibold text-white tracking-tight">
                  Troubleshooting Guide
                </h2>
              </div>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground font-mono">
                Resolving common ingestion & runtime issues
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              {
                issue: "Neo4j Connection Failed / Timeout",
                fix: "Ensure Neo4j Docker container is running on bolt://localhost:7687 and credentials match backend/config.py (NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD).",
              },
              {
                issue: "Ollama Model Not Found (qwen2.5-coder:7b)",
                fix: "Run 'ollama pull qwen2.5-coder:7b' in your host terminal to pull the local coding LLM model before initiating chat sessions.",
              },
              {
                issue: "ZIP Archive Extraction Error",
                fix: "Verify the uploaded file is a valid .zip archive and does not exceed 100MB. Ensure files are UTF-8 text files.",
              },
              {
                issue: "Empty Knowledge Graph Nodes",
                fix: "Ensure the target repository contains supported source files (.py, .js, .ts, .tsx). Plain text or binary files will not produce AST nodes.",
              },
            ].map((item, idx) => (
              <div key={idx} className="rounded-lg border border-white/[0.07] bg-[#080b12] p-4 space-y-1.5">
                <div className="font-mono text-xs font-bold text-white flex items-center gap-2">
                  <span>{item.issue}</span>
                </div>
                <div className="text-xs text-[#9bb0c7] pl-4 leading-relaxed font-sans">{item.fix}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Section 15: Frequently Asked Questions ── */}
      {matchesSearch("faq") && (
        <section
          id="faq"
          className="scroll-mt-20 rounded-xl border border-white/[0.08] bg-[#070b14]/75 backdrop-blur-md p-5 sm:p-7 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)] transition-all hover:border-white/[0.12]"
        >
          <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4 mb-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/[0.05] text-primary">
              <HelpCircle className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-primary">15</span>
                <h2 className="text-[18px] sm:text-[20px] font-semibold text-white tracking-tight">
                  Frequently Asked Questions (FAQ)
                </h2>
              </div>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground font-mono">
                Common questions about CodeGraph AI
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {[
              {
                q: "Is my source code sent to external cloud AI services?",
                a: "No. CodeGraph AI runs entirely locally using Docker containers (PostgreSQL, Neo4j, Qdrant) and local Ollama LLMs. Your code never leaves your local network.",
              },
              {
                q: "What programming languages are supported for AST parsing?",
                a: "Currently Python (.py), JavaScript (.js), TypeScript (.ts), and TSX (.tsx) are fully supported with specialized Tree-sitter parsers.",
              },
              {
                q: "How does the Depth control (1/2/3 Hops) work in the Knowledge Graph?",
                a: "Depth controls determine how many relationship edge levels from the selected target node are rendered on the React Flow canvas, preventing visual clutter.",
              },
              {
                q: "Can I query multiple projects simultaneously in RAG Chat?",
                a: "Chat queries are scoped to the active selected project to ensure strict context precision and prevent cross-repository hallucinations.",
              },
              {
                q: "What is Cyclomatic Complexity and why is V(G) > 10 flagged?",
                a: "Cyclomatic complexity measures the number of linearly independent paths through a function's code. Functions with V(G) > 10 are harder to test and maintain.",
              },
            ].map((faqItem, idx) => (
              <div key={idx} className="rounded-lg border border-white/[0.07] bg-[#080b12] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between p-4 text-left font-medium text-xs sm:text-[13px] text-white hover:bg-white/[0.02] transition-colors cursor-pointer"
                >
                  <span>{faqItem.q}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0 ml-3",
                      expandedFaq === idx && "rotate-180 text-primary"
                    )}
                  />
                </button>
                {expandedFaq === idx && (
                  <div className="p-4 pt-0 text-xs sm:text-[12.5px] leading-relaxed text-[#9ab0c5] border-t border-white/[0.05] bg-white/[0.01]">
                    {faqItem.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Bottom Quick Navigation Links ── */}
      <section className="reveal border-t border-white/[0.08] pt-6" style={{ ["--d" as string]: "200ms" }}>
        <div className="mb-3 cg-label !text-[9.5px]">Direct Workspace Quick Links</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {[
            { label: "Dashboard", href: "/dashboard", icon: Code2 },
            { label: "Projects", href: "/projects", icon: FolderKanban },
            { label: "Repository", href: "/repository", icon: FileCode2 },
            { label: "AST Explorer", href: "/ast", icon: TreePine },
            { label: "Symbols", href: "/symbols", icon: Code2 },
            { label: "Relationships", href: "/relationships", icon: GitFork },
            { label: "Knowledge Graph", href: "/graph", icon: Network },
            { label: "Code Quality", href: "/quality", icon: ShieldCheck },
            { label: "Complexity", href: "/complexity", icon: Cpu },
            { label: "RAG Chat", href: "/chat", icon: Sparkles },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex h-10 items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.015] px-3 text-[11.5px] text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/[0.03] hover:text-primary group"
            >
              <item.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="truncate">{item.label}</span>
              <ArrowRight className="ml-auto h-3 w-3 shrink-0 text-white/20 group-hover:text-primary transition-colors" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
